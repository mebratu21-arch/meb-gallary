import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/jwt.js";
import type { AccessTokenPayload } from "../lib/jwt.js";

// Augment Express Request to carry the authenticated user payload
declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

/**
 * requireAuth — validates the Bearer access token in Authorization header.
 * Sets req.user on success; sends 401 on failure.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Authentication required." },
    });
    return;
  }

  const token = header.slice(7);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Token is invalid or expired." },
    });
  }
}
