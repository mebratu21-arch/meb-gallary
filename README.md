# 🖼️ Meb Gallery

> AI-powered, full-stack image gallery — upload, organize and discover your images with intelligent tagging and search.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TanStack Query + Zustand |
| Backend | Node.js 20 + Express + Prisma |
| Database | PostgreSQL 16 + pgvector |
| Cache | Redis 7 |
| Storage | Cloudinary |
| Auth | JWT (in-memory) + httpOnly refresh cookie + OAuth (Google/GitHub) |
| AI | Google Vision API + Hugging Face BLIP |

## Run locally in 5 commands

```bash
# 1. Clone and install
git clone <repo-url> && cd meb-gallery
pnpm install

# 2. Set up environment
cp .env.example .env          # fill in your secrets

# 3. Start infrastructure (PostgreSQL, Redis, MinIO)
docker compose up -d

# 4. Run database migrations + seed
pnpm prisma migrate dev --name init
pnpm prisma db seed

# 5. Start dev servers (API :3001 + Web :5173)
pnpm dev
```

Then open http://localhost:5173 🚀

## Project Structure

```
meb-gallery/
├── apps/
│   ├── api/          # Node.js + Express REST API
│   └── web/          # React + Vite frontend
├── packages/
│   └── shared/       # Shared Zod schemas & TypeScript types
├── prisma/           # Prisma schema & migrations
├── .github/
│   └── workflows/    # GitHub Actions CI/CD
└── docker-compose.yml
```

## Auth Flow

```
Register/Login → JWT access token (15min, memory only)
              → Refresh token (14 days, httpOnly cookie)
              → Auto-refresh via interceptor on 401
              → Token rotation with reuse detection
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start all apps in parallel |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | Type-check all packages |
| `pnpm format` | Format all files with Prettier |
| `pnpm prisma studio` | Open Prisma Studio GUI |

## CI

Every pull request and push to `main` runs:
1. Install (with pnpm cache)
2. Lint → Typecheck → Test (Postgres + Redis containers)
3. Build all packages
