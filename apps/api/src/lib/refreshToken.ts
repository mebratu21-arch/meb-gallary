import { createHash, randomUUID } from "node:crypto";
import argon2 from "argon2";
import { prisma } from "./prisma.js";
import { env } from "../config/env.js";

const REFRESH_TTL_MS =
  env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000;

export const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536,
  parallelism: 1,
  timeCost: 3,
} as const;

/** Indexed lookup key for refresh tokens (plain token never stored). */
export function refreshTokenLookup(plainToken: string): string {
  return createHash("sha256").update(plainToken).digest("hex");
}

export async function issueRefreshToken(
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

export async function revokeRefreshTokenFamily(familyId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
