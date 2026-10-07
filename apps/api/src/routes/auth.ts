import { Router, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";
import { signAccessToken } from "../lib/jwt.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { registerSchema, loginSchema } from "@meb-gallery/shared";
import { env } from "../config/env.js";
import {
  ARGON2_OPTIONS,
  issueRefreshToken,
  refreshTokenLookup,
  revokeRefreshTokenFamily,
} from "../lib/refreshToken.js";

export const authRouter = Router();

// ── Constants ─────────────────────────────────────────────────────────────────
const REFRESH_COOKIE = "refresh_token";
const REFRESH_TTL_MS =
  env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Write an httpOnly refresh token cookie */
function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: REFRESH_TTL_MS,
    path: "/api/auth",
  });
}

/** Clear the refresh token cookie */
function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
}

async function blacklistRefreshToken(
  plainToken: string,
  expiresAt: Date,
): Promise<void> {
  const remainingTtl = Math.ceil((expiresAt.getTime() - Date.now()) / 1000);
  if (remainingTtl > 0) {
    await redis.set(`rt:blacklist:${plainToken}`, "1", { EX: remainingTtl });
  }
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
authRouter.post("/register", async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid registration data.",
        details: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { email, deletedAt: null },
  });
  if (existing) {
    res.status(409).json({
      error: { code: "EMAIL_TAKEN", message: "An account with this email already exists." },
    });
    return;
  }

  const passwordHash = await argon2.hash(password, ARGON2_OPTIONS);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
    select: { id: true, email: true, name: true, role: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "REGISTER",
      ip: req.ip ?? null,
    },
  });

  const familyId = randomUUID();
  const refreshToken = await issueRefreshToken(user.id, familyId);
  const accessToken = signAccessToken(user);

  setRefreshCookie(res, refreshToken);
  res.status(201).json({ accessToken, user });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
authRouter.post("/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid login data.",
        details: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email, deletedAt: null },
    select: { id: true, email: true, name: true, role: true, passwordHash: true },
  });

  const DUMMY_HASH =
    "$argon2id$v=19$m=65536,t=3,p=1$dummydummydummydummydummydummy$dummydummydummydummydummydummydummydummydummy";
  const hashToVerify = user?.passwordHash ?? DUMMY_HASH;
  const valid = await argon2.verify(hashToVerify, password);

  if (!user || !valid) {
    await prisma.auditLog.create({
      data: { action: "LOGIN_FAILED", ip: req.ip ?? null },
    });
    res.status(401).json({
      error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." },
    });
    return;
  }

  const familyId = randomUUID();
  const refreshToken = await issueRefreshToken(user.id, familyId);
  const { passwordHash: _ph, ...safeUser } = user;
  const accessToken = signAccessToken(safeUser);

  await prisma.auditLog.create({
    data: { userId: user.id, action: "LOGIN", ip: req.ip ?? null },
  });

  setRefreshCookie(res, refreshToken);
  res.json({ accessToken, user: safeUser });
});

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
authRouter.post("/refresh", async (req: Request, res: Response) => {
  const incomingToken: string | undefined = req.cookies?.[REFRESH_COOKIE];

  if (!incomingToken) {
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "No refresh token provided." },
    });
    return;
  }

  const blacklisted = await redis.get(`rt:blacklist:${incomingToken}`);
  if (blacklisted) {
    clearRefreshCookie(res);
    res.status(401).json({
      error: { code: "TOKEN_REVOKED", message: "Refresh token has been revoked." },
    });
    return;
  }

  // Find the stored token whose hash matches
  const storedTokens = await prisma.refreshToken.findMany({
    where: {
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        select: { id: true, email: true, name: true, role: true, deletedAt: true },
      },
    },
    take: 1000,
  });

  let stored: (typeof storedTokens)[0] | undefined;
  for (const rt of storedTokens) {
    if (await argon2.verify(rt.tokenHash, incomingToken)) {
      stored = rt;
      break;
    }
  }

  if (!stored) {
    clearRefreshCookie(res);
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Refresh token is invalid." },
    });
    return;
  }

  if (stored.revokedAt !== null) {
    await revokeRefreshTokenFamily(stored.familyId);
    await blacklistRefreshToken(incomingToken, stored.expiresAt);
    clearRefreshCookie(res);
    res.status(401).json({
      error: { code: "TOKEN_REUSE", message: "Refresh token reuse detected. Please sign in again." },
    });
    return;
  }

  if (stored.expiresAt <= new Date() || stored.user.deletedAt) {
    clearRefreshCookie(res);
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Refresh token is expired or invalid." },
    });
    return;
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });
  await blacklistRefreshToken(incomingToken, stored.expiresAt);

  const newRefreshToken = await issueRefreshToken(stored.userId, stored.familyId);
  const { deletedAt: _da, ...safeUser } = stored.user;
  const accessToken = signAccessToken(safeUser);

  setRefreshCookie(res, newRefreshToken);
  res.json({ accessToken, user: safeUser });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
authRouter.post("/logout", requireAuth, async (req: Request, res: Response) => {
  const incomingToken: string | undefined = req.cookies?.[REFRESH_COOKIE];

  if (incomingToken) {
    const storedTokens = await prisma.refreshToken.findMany({
      where: { userId: req.user!.sub, revokedAt: null },
    });

    for (const rt of storedTokens) {
      if (await argon2.verify(rt.tokenHash, incomingToken)) {
        await prisma.refreshToken.update({
          where: { id: rt.id },
          data: { revokedAt: new Date() },
        });
        await blacklistRefreshToken(incomingToken, rt.expiresAt);
        break;
      }
    }
  }

  await prisma.auditLog.create({
    data: { userId: req.user!.sub, action: "LOGOUT", ip: req.ip ?? null },
  });

  clearRefreshCookie(res);
  res.status(204).send();
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
authRouter.get("/me", requireAuth, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub, deletedAt: null },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user) {
    res.status(404).json({
      error: { code: "USER_NOT_FOUND", message: "User not found." },
    });
    return;
  }

  res.json({ user });
});

// ── GET /api/auth/google ──────────────────────────────────────────────────────
authRouter.get("/google", async (req: Request, res: Response) => {
  const isDev = env.NODE_ENV !== "production";
  const hasCredentials = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

  if (!hasCredentials) {
    if (isDev && req.query["dev"] === "true") {
      // Development mock Google login
      const demoEmail = "google.demo@mebgallery.local";
      let user = await prisma.user.findFirst({
        where: { email: demoEmail, deletedAt: null },
        select: { id: true, email: true, name: true, role: true },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: demoEmail,
            name: "Google Demo User",
            googleId: "mock-google-id-001",
            role: "USER",
          },
          select: { id: true, email: true, name: true, role: true },
        });
      }

      const familyId = randomUUID();
      const refreshToken = await issueRefreshToken(user.id, familyId);
      const accessToken = signAccessToken(user);
      setRefreshCookie(res, refreshToken);
      res.redirect(`http://localhost:5173/login?token=${encodeURIComponent(accessToken)}`);
      return;
    }

    res.redirect(
      `http://localhost:5173/login?error=${encodeURIComponent(
        "Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to apps/api/.env, or sign in with admin@mebgallery.local / AdminPassword123!",
      )}`,
    );
    return;
  }

  const redirectUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  redirectUrl.searchParams.set("client_id", env.GOOGLE_CLIENT_ID!);
  redirectUrl.searchParams.set(
    "redirect_uri",
    env.GOOGLE_CALLBACK_URL || "http://localhost:3001/api/auth/google/callback",
  );
  redirectUrl.searchParams.set("response_type", "code");
  redirectUrl.searchParams.set("scope", "openid profile email");
  redirectUrl.searchParams.set("prompt", "select_account");

  res.redirect(redirectUrl.toString());
});

// ── GET /api/auth/google/callback ─────────────────────────────────────────────
authRouter.get("/google/callback", async (req: Request, res: Response) => {
  const code = req.query["code"] as string | undefined;
  if (!code || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    res.redirect(`http://localhost:5173/login?error=${encodeURIComponent("Google authorization was cancelled or failed.")}`);
    return;
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_CALLBACK_URL || "http://localhost:3001/api/auth/google/callback",
        grant_type: "authorization_code",
      }),
    });

    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenRes.ok || !tokenData.access_token) {
      res.redirect(`http://localhost:5173/login?error=${encodeURIComponent("Failed to exchange Google authorization code.")}`);
      return;
    }

    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = (await userRes.json()) as {
      sub: string;
      email?: string;
      name?: string;
    };

    if (!profile.email) {
      res.redirect(`http://localhost:5173/login?error=${encodeURIComponent("No email provided by Google account.")}`);
      return;
    }

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId: profile.sub }, { email: profile.email }],
        deletedAt: null,
      },
      select: { id: true, email: true, name: true, role: true, googleId: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name || "Google User",
          googleId: profile.sub,
          role: "USER",
        },
        select: { id: true, email: true, name: true, role: true, googleId: true },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.sub },
        select: { id: true, email: true, name: true, role: true, googleId: true },
      });
    }

    const familyId = randomUUID();
    const refreshToken = await issueRefreshToken(user.id, familyId);
    const accessToken = signAccessToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    setRefreshCookie(res, refreshToken);
    res.redirect(`http://localhost:5173/login?token=${encodeURIComponent(accessToken)}`);
  } catch (err) {
    res.redirect(`http://localhost:5173/login?error=${encodeURIComponent("An error occurred during Google sign-in.")}`);
  }
});
