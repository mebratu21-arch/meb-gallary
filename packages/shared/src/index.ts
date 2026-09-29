// packages/shared/src/index.ts

export { placeholderSchema, type PlaceholderData } from "./schemas/placeholder.js";

// ── Auth schemas & types ──────────────────────────────────────────────────────
export {
  registerSchema,
  loginSchema,
  authUserSchema,
  authResponseSchema,
  type RegisterInput,
  type LoginInput,
  type AuthUser,
  type AuthResponse,
} from "./schemas/auth.js";
