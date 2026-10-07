# 🖼️ Meb Gallery

> A high-performance, full-stack image gallery and AI asset management platform built with modern TypeScript monorepo architecture. Features secure JWT token-rotation authentication, Cloudinary CDN media delivery, PostgreSQL schema with Prisma ORM, Redis caching with resilient in-memory fallback, and dual-provider AI vision analysis and generation (Google Gemini & OpenAI).

[![CI](https://github.com/mebratu21-arch/meb-gallary/actions/workflows/ci.yml/badge.svg)](https://github.com/mebratu21-arch/meb-gallary/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.x-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-5.19-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📸 Curated Demo Masterpiece Showcase

Meb Gallery ships with an instant **zero-friction showcase experience** featuring six award-winning sample photographs out of the box with AI metadata, tags, and category indexing:

| Masterpiece | Genre & Theme | Key Features & AI Metadata |
| :--- | :--- | :--- |
| 🏔️ **Alpine Dawn Over Misty Peaks** | Landscape & Nature | Snow-capped peaks, golden hour illumination, misty pine valleys |
| 🌊 **Crystal Atoll Turquoise Lagoon** | Aerial & Ocean | Top-down coral reef perspective, turquoise lagoon clarity |
| 🌃 **Neo-Tokyo Cyberpunk Boulevard** | Urban & Architecture | Rain-slicked asphalt reflections, neon glow, futuristic nightline |
| ✨ **Golden Hour Studio Editorial** | Portrait & High Fashion | Warm rim lighting, dramatic studio chiaroscuro contrast |
| 🌹 **Dewdrop Symphony on Crimson Velvet** | Botanical & Macro | Ultra-sharp water droplets, delicate velvet petal micro-textures |
| 🌲 **Cathedral of Sunbeams in Redwoods** | Forest & Atmosphere | God rays filtering through ancient moss-draped redwood forest |

---

## ✨ Features

- **Robust Authentication & Session Management**:
  - Secure registration and login using **Argon2id** password hashing.
  - Short-lived in-memory **JWT access tokens** (15m) paired with **httpOnly refresh cookies** (14d).
  - Strict **refresh token rotation** with family-based reuse detection (revokes entire token family upon reuse attempt).
  - Role-based authorization (`USER` and `ADMIN`) with protected client routes and API middleware guards.

- **High-Performance Image Gallery**:
  - Fluid responsive image grid with dynamic aspect ratio preservation.
  - Server-side cursor/page pagination, multi-field search (title, description, tags, AI caption), and category filtering.
  - One-click favorite toggling with instant optimistic UI feedback.
  - Full-screen interactive **Lightbox** modal with keyboard navigation (`Esc`, `ArrowLeft`, `ArrowRight`).

- **Cloud Storage & Media Processing**:
  - Direct image upload pipeline backed by **Multer** (memory storage) and **Cloudinary CDN**.
  - Automatic extraction and storage of image dimensions, file byte size, and format (`webp`, `png`, `jpeg`).
  - Integrated client-side preview and validation before upload.

- **AI Studio & Computer Vision**:
  - **Automated Image Analysis**: Dual-engine vision pipeline (**Google Gemini 1.5 Flash** with **OpenAI GPT-4o-mini** fallback) that automatically generates captions, categorizes the subject, and produces contextual search tags.
  - **Natural Language Smart Search**: AI-driven query translation that converts natural language input (e.g., _"show my favorite nature photos"_) into structured database filter parameters.
  - **Generative AI Studio**: On-demand text-to-image synthesis with one-click saving directly to the user's gallery.

- **Album & Organization System**:
  - Custom album creation with descriptions and cover image assignment.
  - Many-to-many album-to-image relationships via dedicated join models.
  - Quick-add modal allowing users to organize images into albums from any view.

- **Dedicated Image Details View**:
  - Comprehensive metadata inspection (resolution, file size, upload timestamp, source attribution).
  - In-place editing of title, description, category, and tags.
  - Direct download links and safe deletion workflows with confirmation dialogs.

- **Admin Operations Dashboard**:
  - System-wide metrics: total registered users, total stored images, and aggregate storage utilization.
  - User management table with real-time role promotion/demotion (`USER` ↔ `ADMIN`) and user deletion.

---

## 🏗️ Architecture

Meb Gallery is built as an end-to-end type-safe monorepo orchestrated with **pnpm workspaces**. Shared data contracts (Zod validation schemas and TypeScript interfaces) are centralized in `@meb-gallery/shared`, ensuring synchrony between client forms and server endpoints.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 Client Tier                                 │
│               React 18 SPA (Vite) · TanStack Query · Zustand                │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / HTTPS (JSON + multipart/form)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                Backend API                                  │
│                 Node.js / Express (ESM) · Helmet · Pino Logger              │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────────────┐  │
│  │ Auth & Security  │  │ Image Controller │  │        AI Service         │  │
│  │  Argon2 / JWT    │  │  Multer Pipeline │  │  Gemini 1.5 / GPT-4o-mini │  │
│  └────────┬─────────┘  └────────┬─────────┘  └─────────────┬─────────────┘  │
└───────────┼─────────────────────┼──────────────────────────┼────────────────┘
            │                     │                          │
            ▼                     ▼                          ▼
┌───────────────────────┐ ┌───────────────┐ ┌─────────────────────────────────┐
│     PostgreSQL 16     │ │     Redis     │ │          Cloudinary           │
│      Prisma ORM       │ │ Cache / Store │ │       HTTPS Media CDN           │
│ (Neon / Docker PG16)  │ │ (Memory Fall) │ │                                 │
└───────────────────────┘ └───────────────┘ └─────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer                       | Technology                   | Purpose & Rationale                                                                |
| :-------------------------- | :--------------------------- | :--------------------------------------------------------------------------------- |
| **Monorepo Management**     | pnpm Workspaces              | Fast, deterministic dependency resolution with minimal disk footprint.             |
| **Frontend Framework**      | React 18                     | Declarative UI rendering with functional components and hooks.                     |
| **Build Tool**              | Vite 5                       | Sub-millisecond HMR and optimized Rollup production bundling.                      |
| **Server State**            | TanStack React Query v5      | Automated caching, background refetching, and query invalidation.                  |
| **Client State**            | Zustand 5                    | Minimalist, unopinionated auth session and UI state management.                    |
| **Routing**                 | React Router 6               | Declarative client-side routing with auth protection wrappers.                     |
| **Backend Runtime**         | Node.js 20+ (ESM)            | Non-blocking asynchronous I/O with native ES Modules.                              |
| **API Framework**           | Express 4                    | Lightweight HTTP routing, middleware chaining, and error boundaries.               |
| **Database & ORM**          | PostgreSQL 16 & Prisma 5     | Strongly typed relational modeling with migrations and connection pooling.         |
| **Cache Layer**             | Redis 7 & In-Memory Fallback | High-speed transient data caching with resilient in-memory fallback for local dev. |
| **Media Storage**           | Cloudinary                   | Cloud-native media ingestion, automated optimization, and HTTPS CDN delivery.      |
| **AI Vision & Gen**         | Google Gemini & OpenAI       | Vision captioning, intelligent categorization, and text-to-image synthesis.        |
| **Security & Cryptography** | Argon2 & jsonwebtoken        | Quantum-resistant password hashing and cryptographically signed JWT tokens.        |
| **Validation**              | Zod 3                        | Runtime schema validation shared across frontend forms and backend routes.         |
| **Testing**                 | Vitest 2 & Supertest         | High-speed unit and integration testing with native ESM execution.                 |
| **Code Formatting**         | Prettier                     | Uniform codebase formatting across all packages.                                   |

---

## 📁 Project Structure

```text
meb-gallery/
├── apps/
│   ├── api/                          # Express REST API application
│   │   ├── prisma/                   # Prisma schema and seed script
│   │   ├── src/
│   │   │   ├── config/               # Zod-validated environment configurations
│   │   │   ├── lib/                  # Database, Redis, Cloudinary, AI & Logger clients
│   │   │   ├── middleware/           # Auth guards, role verification & validation
│   │   │   ├── routes/               # Modular Express routers (auth, images, albums, ai, admin)
│   │   │   ├── test/                 # Integration test suites (Supertest + Vitest)
│   │   │   ├── app.ts                # Express application factory with middleware stack
│   │   │   └── server.ts             # Process entrypoint & graceful shutdown handlers
│   │   └── package.json
│   │
│   └── web/                          # React client single-page application
│       ├── src/
│       │   ├── api/                  # Axios HTTP client with auto-refresh interceptors
│       │   ├── components/           # Reusable UI (ImageCard, Lightbox, Navbar, UploadModal)
│       │   ├── pages/                # Route views (Gallery, ImageDetails, AIStudio, Albums, Admin)
│       │   ├── store/                # Zustand stores and custom TanStack Query hooks
│       │   ├── test/                 # Component test suites
│       │   ├── App.tsx               # Root component with routing tree
│       │   └── main.tsx              # React DOM entrypoint
│       ├── index.html
│       └── package.json
│
├── packages/
│   └── shared/                       # Shared monorepo library
│       ├── src/
│       │   ├── schemas/              # Zod validation schemas (auth, images, albums)
│       │   └── index.ts              # Export barrel for types and validators
│       └── package.json
│
├── .github/
│   └── workflows/
│       └── ci.yml                    # GitHub Actions CI matrix (Lint, Typecheck, Test, Build)
├── docker-compose.yml                # Multi-container local infra (PostgreSQL, Redis, MinIO)
├── pnpm-workspace.yaml               # Workspace definitions
├── .env.example                      # Documented environment blueprint
└── package.json                      # Monorepo root scripts & dev dependencies
```

---

## 🔄 How the Application Works

```text
[User Browser]
      │
      │ 1. Submits image file or search query
      ▼
[React 18 SPA]
      │
      │ 2. Validates payload client-side via @meb-gallery/shared (Zod)
      │ 3. Dispatches HTTP request with Bearer Access Token
      ▼
[Express API Gateway]
      │
      │ 4. Helmet security headers & CORS origin verification
      │ 5. Authenticate via authenticateToken middleware (verifies JWT)
      │ 6. Parse multipart stream into memory buffer (Multer)
      ▼
[Service Tier]
      ├──> Cloudinary SDK: Streams image buffer to CDN; receives CDN URL & metadata
      ├──> AI Engine: Gemini 1.5 Vision analyzes image; generates tags & caption
      └──> Prisma ORM: Persists image record with relation to authenticated User
      │
      ▼
[Database / Storage]
      │
      ▼
[JSON Response] ──> Returns image record to frontend
      │
      ▼
[TanStack Query] ──> Invalidates "images" cache key; updates gallery UI optimistically
```

---

## ⚙️ Installation

### Prerequisites

- **Node.js**: `v20.0.0` or higher
- **pnpm**: `v9.0.0` or higher
- **Git**
- **Docker & Docker Compose** (Optional: for running local PostgreSQL & Redis instances)

### 1. Clone the Repository

```bash
git clone https://github.com/mebratu21-arch/meb-gallary.git
cd meb-gallary
```

### 2. Install Workspace Dependencies

```bash
pnpm install
```

---

## 🔐 Environment Variables

Create your local `.env` configuration by copying the documented template:

```bash
cp .env.example .env
```

| Variable                        | Purpose                                                    | Required | Example / Default                                               |
| :------------------------------ | :--------------------------------------------------------- | :------: | :-------------------------------------------------------------- |
| `NODE_ENV`                      | Application runtime environment                            |    No    | `development`                                                   |
| `PORT`                          | API server listen port                                     |    No    | `3001`                                                          |
| `DATABASE_URL`                  | PostgreSQL connection string (supports Neon / local)       | **Yes**  | `postgresql://postgres:postgres@localhost:5432/meb_gallery`     |
| `REDIS_URL`                     | Redis cache connection string                              |    No    | `redis://localhost:6379` _(Falls back to in-memory if offline)_ |
| `JWT_SECRET`                    | Secret key for signing access tokens (>= 32 chars)         | **Yes**  | _(Generate with `openssl rand -hex 32`)_                        |
| `JWT_EXPIRES_IN`                | Access token lifespan                                      |    No    | `15m`                                                           |
| `REFRESH_TOKEN_EXPIRES_IN_DAYS` | Refresh token lifespan                                     |    No    | `14`                                                            |
| `CORS_ORIGINS`                  | Comma-separated list of allowed client origins             | **Yes**  | `http://localhost:5173`                                         |
| `CLOUDINARY_CLOUD_NAME`         | Cloudinary account cloud name                              | Optional | `your-cloud-name`                                               |
| `CLOUDINARY_API_KEY`            | Cloudinary API access key                                  | Optional | `your-api-key`                                                  |
| `CLOUDINARY_API_SECRET`         | Cloudinary API access secret                               | Optional | `your-api-secret`                                               |
| `GEMINI_API_KEY`                | Google Gemini API key (recommended for AI features)        | Optional | `AIzaSy...`                                                     |
| `OPENAI_API_KEY`                | OpenAI API key (alternative AI provider for Vision/DALL-E) | Optional | `sk-...`                                                        |
| `SEED_ADMIN_EMAIL`              | Default admin email for database seed script               |    No    | `admin@mebgallery.local`                                        |
| `SEED_ADMIN_PASSWORD`           | Default admin password for seed script                     |    No    | `AdminPassword123!`                                             |
| `SEED_DEMO_EMAIL`               | Default demo user email for seed script                    |    No    | `demo@mebgallery.local`                                         |
| `SEED_DEMO_PASSWORD`            | Default demo user password for seed script                 |    No    | `DemoPassword123!`                                              |

> **Note**: If `CLOUDINARY_*` or AI keys are omitted during development, the application utilizes safe fallback handlers to allow full local navigation and testing.

---

## 🚀 Running the Project

### Option A: Using Docker for Infrastructure

Start PostgreSQL 16 (with pgvector) and Redis 7:

```bash
docker compose up -d postgres redis
```

### Option B: Local Setup & Running Servers

1. **Apply Database Migrations & Seed**:

```bash
# Push Prisma schema to database
pnpm --filter @meb-gallery/api exec prisma db push

# Seed demo users (admin & regular user)
pnpm --filter @meb-gallery/api exec prisma db seed
```

2. **Start Development Servers (Monorepo Parallel)**:

```bash
pnpm dev
```

- **Frontend Client**: [http://localhost:5173](http://localhost:5173)
- **API Server**: [http://localhost:3001](http://localhost:3001)
- **Health Endpoint**: [http://localhost:3001/health](http://localhost:3001/health)

3. **Building for Production**:

```bash
pnpm build
```

---

## 📚 API Documentation

All protected routes expect the header: `Authorization: Bearer <access_token>`.

### Authentication Endpoints (`/api/auth`)

| Method | Endpoint             | Description                                                   | Auth Required  |
| :----- | :------------------- | :------------------------------------------------------------ | :------------: |
| `POST` | `/api/auth/register` | Register a new user account with email and password           |     Public     |
| `POST` | `/api/auth/login`    | Authenticate credentials; sets httpOnly refresh token cookie  |     Public     |
| `POST` | `/api/auth/refresh`  | Exchange valid refresh cookie for new access & refresh tokens | Refresh Cookie |
| `POST` | `/api/auth/logout`   | Revoke active refresh token family and clear auth cookies     |     Public     |
| `GET`  | `/api/auth/me`       | Fetch currently authenticated user profile                    |    **Yes**     |

### Image Management Endpoints (`/api/images`)

| Method   | Endpoint          | Description                                                          |     Auth Required     |
| :------- | :---------------- | :------------------------------------------------------------------- | :-------------------: |
| `GET`    | `/api/images`     | List images with pagination, search, category, and favorite filters  |   Public / Optional   |
| `GET`    | `/api/images/:id` | Retrieve single image details including EXIF and AI metadata         |   Public / Optional   |
| `POST`   | `/api/images`     | Upload image (multipart/form-data) with optional AI analysis         |        **Yes**        |
| `PATCH`  | `/api/images/:id` | Update image metadata (title, description, category, tags, favorite) | **Yes** (Owner/Admin) |
| `DELETE` | `/api/images/:id` | Delete image record and purge from storage                           | **Yes** (Owner/Admin) |

### Album Endpoints (`/api/albums`)

| Method   | Endpoint                          | Description                                      |  Auth Required  |
| :------- | :-------------------------------- | :----------------------------------------------- | :-------------: |
| `GET`    | `/api/albums`                     | List albums belonging to the authenticated user  |     **Yes**     |
| `GET`    | `/api/albums/:id`                 | Retrieve single album and its associated images  |     **Yes**     |
| `POST`   | `/api/albums`                     | Create a new album                               |     **Yes**     |
| `PATCH`  | `/api/albums/:id`                 | Update album name, description, or cover image   | **Yes** (Owner) |
| `DELETE` | `/api/albums/:id`                 | Delete album (does not delete underlying images) | **Yes** (Owner) |
| `POST`   | `/api/albums/:id/images`          | Add one or more images into an album             | **Yes** (Owner) |
| `DELETE` | `/api/albums/:id/images/:imageId` | Remove an image from an album                    | **Yes** (Owner) |

### AI Studio Endpoints (`/api/ai`)

| Method | Endpoint           | Description                                                       | Auth Required |
| :----- | :----------------- | :---------------------------------------------------------------- | :-----------: |
| `POST` | `/api/ai/analyze`  | Run computer vision on image; returns caption, category, and tags |    **Yes**    |
| `POST` | `/api/ai/search`   | Parse natural language query into structured database filters     |    **Yes**    |
| `POST` | `/api/ai/generate` | Synthesize new image from text prompt via generative endpoint     |    **Yes**    |

### Administrative Endpoints (`/api/admin`)

| Method   | Endpoint                    | Description                                                  | Auth Required  |
| :------- | :-------------------------- | :----------------------------------------------------------- | :------------: |
| `GET`    | `/api/admin/stats`          | Platform metrics (user count, image count, storage consumed) | **Admin Only** |
| `GET`    | `/api/admin/users`          | List all registered accounts                                 | **Admin Only** |
| `PATCH`  | `/api/admin/users/:id/role` | Update user permissions (`USER` ↔ `ADMIN`)                   | **Admin Only** |
| `DELETE` | `/api/admin/users/:id`      | Remove user and cascade purge user assets                    | **Admin Only** |

### Diagnostics Endpoints

| Method | Endpoint  | Description                                                | Auth Required |
| :----- | :-------- | :--------------------------------------------------------- | :-----------: |
| `GET`  | `/health` | Basic service liveness probe                               |    Public     |
| `GET`  | `/ready`  | Deep readiness probe checking database & Redis connections |    Public     |

---

## 🗄️ Database Architecture

The schema is defined in [`prisma/schema.prisma`](file:///prisma/schema.prisma) targeting PostgreSQL:

```text
┌─────────────────┐       1:N       ┌─────────────────────┐
│      User       ├─────────────────┤    RefreshToken     │
│                 │                 │ (Rotation / Family) │
└────────┬────────┘                 └─────────────────────┘
         │
         │ 1:N
         ├──────────────────────────┐
         ▼                          ▼
┌─────────────────┐       N:M       ┌─────────────────────┐
│      Image      │◄───────────────►│        Album        │
│ (Cloudinary/AI) │   AlbumImage    │                     │
└─────────────────┘   Join Table    └─────────────────────┘
```

- **`User`**: Account records with Argon2 `passwordHash`, role flags (`USER`, `ADMIN`), and optional OAuth IDs.
- **`RefreshToken`**: Cryptographic SHA-256 hashed refresh tokens organized into `familyId` chains to detect token reuse attacks.
- **`Image`**: Stores CDN URL, resolution dimensions (`width`, `height`), size (`bytes`), format, user tags, AI-generated captions, AI category, and favorite state.
- **`Album`**: Collection metadata owned by a user.
- **`AlbumImage`**: Composite-key join model (`[albumId, imageId]`) enabling fast many-to-many relationship querying.
- **`AuditLog`**: Security action logging records referencing actor ID, action type, and client IP.

---

## 🔒 Security Architecture

- **Password Hashing**: Implemented with **Argon2id**, the modern standard resistant to GPU cracking and side-channel timing attacks.
- **Token Rotation & Family Reuse Detection**:
  - Refresh tokens are hashed using SHA-256 before storage; raw tokens are never persisted.
  - Refreshing produces a new token in the same family.
  - If an expired or already-consumed token is presented, the system detects a breach and revokes all active tokens in that family immediately.
- **Header Hardening**: **Helmet** configures HTTP headers (CSP, HSTS, X-Content-Type-Options, Frameguard).
- **Log Sanitation**: **Pino HTTP** automatically redacts sensitive headers (`Authorization`, `Cookie`) from application logs.
- **Input Validation**: All query parameters and request bodies are strictly sanitized and parsed against **Zod schemas**. Unknown fields are rejected.
- **SQL Injection Prevention**: All persistence operations execute through parameterized **Prisma ORM** queries.

---

## 🤖 AI Features

The platform features an intelligent AI subsystem located in [`apps/api/src/lib/openai.ts`](file:///apps/api/src/lib/openai.ts) designed with multi-provider resilience:

1. **Computer Vision Analysis**:
   - **Engine**: Google Gemini 1.5 Flash (primary, fast structured JSON response) with automatic fallback to OpenAI `gpt-4o-mini`.
   - **Input**: Image URL or base64 buffer.
   - **Output**: JSON payload containing:
     - `caption`: Concise descriptive summary.
     - `category`: Classification tag (e.g. `nature`, `architecture`, `portrait`, `technology`).
     - `tags`: Array of contextual search keywords.
2. **Natural Language Smart Search**:
   - Analyzes conversational user queries (e.g. _"find recent landscape pictures marked as favorites"_) and parses them into a validated JSON filter with structured keywords, category constraints, and favorite boolean flags.
3. **Generative Studio**:
   - Generates high-resolution images from natural language prompts using configured AI image endpoints and enables instant addition to the user's gallery.

---

## 🧪 Testing

Testing is implemented with **Vitest** and **Supertest** for fast, reliable verification.

### Running Test Suites

```bash
# Run API test suites (health, readiness, error handlers)
pnpm --filter @meb-gallery/api test

# Run all workspace test suites
pnpm test
```

### Test Coverage Highlights

- **Health & Diagnostics**: Verifies `/health` returns `200 ok` and `/ready` accurately reflects database and cache readiness states.
- **Degraded Infrastructure Handling**: Tests simulate database disconnects to verify degraded status codes (`503`).
- **Error Consistency**: Validates that 404 and 500 error responses conform to the standard error JSON envelope: `{ error: { code, message, requestId } }`.
- **Component Unit Tests**: Verifies core UI rendering and unauthenticated route redirects.

---

## 💡 Technical Decisions

- **Why pnpm Workspaces?**:
  - Enables sharing types and validation schemas directly between client and server without an external npm registry.
  - Eliminates drift between API request expectations and frontend form validation.
- **Why Argon2id over bcrypt?**:
  - Argon2id provides superior resistance against memory-hard GPU attacks and side-channel cache attacks.
- **Why In-Memory Access Tokens + httpOnly Refresh Cookies?**:
  - Access tokens stored in JavaScript memory cannot be accessed via XSS.
  - Refresh tokens stored in `httpOnly`, `SameSite=Lax` cookies cannot be read by malicious scripts.
- **Why Dual AI Provider Strategy (Gemini + OpenAI)?**:
  - Maximizes availability: if one provider experiences rate limits or downtime, the other seamlessly serves image analysis and search parsing.
  - Gemini 1.5 Flash provides accessible free-tier multimodal capabilities for developers.
- **Why Resilient In-Memory Redis Fallback?**:
  - Developers working on Windows or minimal environments without Docker can clone and run the project immediately without a local Redis daemon setup.

---

## 🔮 Future Improvements

- [ ] Implementation of vector embeddings using `pgvector` for semantic image similarity search.
- [ ] Direct presigned S3/MinIO upload capability for multi-gigabyte batch uploads.
- [ ] OAuth integration for GitHub and Apple accounts.
- [ ] Image EXIF geographical mapping with interactive location markers.
- [ ] Webhook notifications for asynchronous batch AI tagging jobs.

---

## 👤 Author

**Mebratu Mengstu**

- GitHub: [@mebratu21-arch](https://github.com/mebratu21-arch)
- LinkedIn: [linkedin.com/in/mebratu21](https://linkedin.com/in/mebratu21)
- Repository: [https://github.com/mebratu21-arch/meb-gallary](https://github.com/mebratu21-arch/meb-gallary)
