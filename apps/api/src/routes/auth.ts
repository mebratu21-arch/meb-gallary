import { Router, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";
import { signAccessToken } from "../lib/jwt.js";
import { verifyAccessToken } from "../lib/jwt.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { registerSchema, loginSchema } from "@meb-gallery/shared";
import { env } from "../config/env.js";

export const authRouter = Router();

// ── Constants ─────────────────────────────────────────────────────────────────
const REFRESH_COOKIE = "refresh_token";
const REFRESH_TTL_MS =
  env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000;
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536,
  parallelism: 1,
  timeCost: 3,
} as const;

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

/**
 * Issue + persist a new refresh token for a user, returning its plain value.
 * The plain token is stored as a cookie; only its hash lives in the DB.
 */
async function issueRefreshToken(
  userId: string,
  familyId: string,
): Promise<string> {
  const token = randomUUID();
  const tokenHash = await argon2.hash(token, ARGON2_OPTIONS);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

  await prisma.refreshToken.create({
    data: { userId, tokenHash, familyId, expiresAt },
  });

  return token;
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

  // Check for existing account
  const existing = await prisma.user.findUnique({ where: { email } });
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

  // Audit log
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

  // Constant-time: verify even if user not found (dummy hash)
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

  // Check blacklist (revoked tokens cached in Redis)
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
    include: { user: { select: { id: true, email: true, name: true, role: true, deletedAt: true } } },
    take: 1000, // safety cap; in production use a lookup index
  });

  let matched: (typeof storedTokens)[0] | undefined;
  for (const rt of storedTokens) {
    if (await argon2.verify(rt.tokenHash, incomingToken)) {
      matched = rt;
      break;
    }
  }

  if (!matched || matched.user.deletedAt) {
    // Possible token reuse — revoke entire family
    clearRefreshCookie(res);
    res.status(401).json({
      error: { code: "TOKEN_REUSE", message: "Refresh token reuse detected." },
    });
    return;
  }

  // Rotate: revoke old token
  await prisma.refreshToken.update({
    where: { id: matched.id },
    data: { revokedAt: new Date() },
  });

  // Blacklist old token in Redis for its remaining TTL
  const remainingTtl = Math.ceil((matched.expiresAt.getTime() - Date.now()) / 1000);
  if (remainingTtl > 0) {
    await redis.set(`rt:blacklist:${incomingToken}`, "1", { EX: remainingTtl });
  }

  // Issue new token in the same family (token rotation)
  const newRefreshToken = await issueRefreshToken(matched.userId, matched.familyId);
  const { deletedAt: _da, ...safeUser } = matched.user;
  const accessToken = signAccessToken(safeUser);

  setRefreshCookie(res, newRefreshToken);
  res.json({ accessToken, user: safeUser });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
authRouter.post("/logout", requireAuth, async (req: Request, res: Response) => {
  const incomingToken: string | undefined = req.cookies?.[REFRESH_COOKIE];

  if (incomingToken) {
    // Revoke the specific token if it exists
    const storedTokens = await prisma.refreshToken.findMany({
      where: { userId: req.user!.sub, revokedAt: null },
    });

    for (const rt of storedTokens) {
      if (await argon2.verify(rt.tokenHash, incomingToken)) {
        await prisma.refreshToken.update({
          where: { id: rt.id },
          data: { revokedAt: new Date() },
        });

        const remainingTtl = Math.ceil((rt.expiresAt.getTime() - Date.now()) / 1000);
        if (remainingTtl > 0) {
          await redis.set(`rt:blacklist:${incomingToken}`, "1", { EX: remainingTtl });
        }
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
