-- Run once on existing databases (safe to re-run):
ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "tokenLookup" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_tokenLookup_key" ON "RefreshToken"("tokenLookup");

-- Existing sessions without tokenLookup must sign in again after deploy.
