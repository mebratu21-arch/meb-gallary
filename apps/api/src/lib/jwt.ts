import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AuthUser } from "@meb-gallery/shared";

export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
  role: string;
}

/**
 * Sign a short-lived access token (in-memory only, never stored in DB).
 */
export function signAccessToken(user: AuthUser): string {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role } satisfies AccessTokenPayload,
    env.JWT_SECRET,
    // Cast needed: exactOptionalPropertyTypes + jsonwebtoken's overloads
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions,
  );
}

/**
 * Verify an access token and return its payload.
 * Throws if invalid or expired.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
}
