// Global test setup — runs before every test file
// Set required env vars so config/env.ts doesn't exit

process.env["NODE_ENV"] = "test";
process.env["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/meb_gallery_test";
process.env["REDIS_URL"] = "redis://localhost:6379";
process.env["JWT_SECRET"] = "test-secret-that-is-at-least-32-chars-long!!!";
process.env["CORS_ORIGINS"] = "http://localhost:5173";
