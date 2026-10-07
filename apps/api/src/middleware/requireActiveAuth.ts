import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type AccessTokenPayload } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";

function readBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

async function loadActiveUser(req: Request, res: Response): Promise<boolean> {
  const token = readBearerToken(req);
  if (!token) {
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Authentication required." },
    });
    return false;
  }

  let payload: AccessTokenPayload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Token is invalid or expired." },
    });
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub, deletedAt: null },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Account is not available." },
    });
    return false;
  }

  req.user = {
    sub: user.id,
    email: user.email,
    role: user.role,
  } satisfies AccessTokenPayload;

  return true;
}

/**
 * Validates Bearer JWT and loads the current user from the database
 * (role + soft-delete). Sets req.user from DB, not from token claims alone.
 */
export async function requireActiveAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!(await loadActiveUser(req, res))) return;
  next();
}

/** Active user with ADMIN role (always DB-backed). */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!(await loadActiveUser(req, res))) return;

  if (req.user!.role !== "ADMIN") {
    res.status(403).json({
      error: { code: "FORBIDDEN", message: "Admin access required." },
    });
    return;
  }

  next();
}
