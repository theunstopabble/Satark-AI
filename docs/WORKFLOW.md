# Development Workflow

**Version:** 2.0.0 | **Last Updated:** May 2026

Development setup, testing strategies, CI/CD pipeline, and user journey flows for the Satark-AI platform.

---

## Local Development Setup

### Prerequisites

| Tool | Version | Installation |
|------|---------|-------------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| Python | 3.11+ | [python.org](https://python.org) |
| PostgreSQL | 14+ | Local install or cloud provider |
| Git | Latest | [git-scm.com](https://git-scm.com) |

### Quick Start (3 Terminals)

```bash
# Terminal 1 — Clone & Install
git clone https://github.com/theunstopabble/Satark-AI.git
cd Satark-AI
npm install

# Terminal 2 — Python Engine
cd apps/engine
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 3 — API Gateway
cd apps/api
npx tsx watch src/index.ts

# Terminal 1 — Frontend (after npm install completes)
cd apps/web
npm run dev
```

### Turborepo (All-in-One)

```bash
npm run dev   # Runs all 3 services concurrently via Turborepo
```

### Docker Compose

```bash
cp .env.example .env   # Fill in your values
docker-compose up --build
```

---

## Environment Configuration

### `apps/web/.env`

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxx
VITE_API_URL=http://localhost:3000
```

### `apps/api/.env`

```env
DATABASE_URL=postgresql://user:password@localhost:5432/satark_db
CLERK_SECRET_KEY=sk_test_xxxx
CLERK_PUBLISHABLE_KEY=pk_test_xxxx
ALLOWED_ORIGINS=http://localhost:5173
ENGINE_URL=http://localhost:8000
IMAGE_API_URL=https://satark-image-proxy.gautamkumar43421.workers.dev
```

### `apps/engine/.env`

```env
# No required variables — models auto-download from HuggingFace
```

---

## Project Structure & Conventions

### Directory Layout

```
satark-ai/
├── apps/
│   ├── web/          → Frontend (React + Vite + TypeScript)
│   │   ├── src/
│   │   │   ├── api/          → API client functions
│   │   │   ├── components/   → React components
│   │   │   ├── context/      → React contexts (Language, Theme)
│   │   │   ├── lib/          → Utility helpers
│   │   │   ├── pages/        → Route-level page components
│   │   │   └── utils/        → PDF generation, etc.
│   │   └── public/           → Static assets
│   ├── api/          → API Gateway (Hono + Node.js)
│   │   └── src/
│   │       ├── db/           → Drizzle schema + connection
│   │       ├── middleware/   → Auth middleware
│   │       └── routes/       → Route handlers
│   └── engine/       → AI Engine (FastAPI + Python)
│       ├── main.py           → FastAPI app + endpoints
│       ├── detect.py         → Deepfake detection pipeline
│       ├── speaker.py        → ECAPA-TDNN embeddings
│       ├── schemas.py        → Pydantic models
│       └── Dockerfile        → Production container
├── packages/
│   └── shared/       → Zod schemas + TypeScript types
├── cloudflare-worker/ → Image proxy worker
├── docs/             → Documentation (this folder)
└── docker-compose.yml
```

### Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| React components | PascalCase | `AudioUpload.tsx`, `LiveMonitor.tsx` |
| Utility files | camelCase | `pdfGenerator.ts`, `utils.ts` |
| Python modules | snake_case | `detect.py`, `speaker.py` |
| API routes | kebab-case URLs | `/scan-upload`, `/scan-image` |
| DB columns | snake_case | `user_id`, `confidence_score` |
| TypeScript types | PascalCase | `ScanResultType`, `AudioUploadType` |
| Environment vars | SCREAMING_SNAKE | `DATABASE_URL`, `ENGINE_URL` |

---

## Database Workflow

### Schema Changes

```bash
cd apps/api

# 1. Edit schema in src/db/schema.ts
# 2. Generate migration
npx drizzle-kit generate:pg

# 3. Push to database (development)
npx drizzle-kit push
```

### Drizzle Studio (Visual DB Browser)

```bash
npx drizzle-kit studio
```

---

## Build & Lint

### Turborepo Commands

```bash
# Build all packages
npx turbo build

# Build specific app
npx turbo build --filter=web
npx turbo build --filter=api

# Lint all packages
npx turbo lint
```

### Individual App Commands

```bash
# Frontend
cd apps/web
npm run build        # tsc && vite build
npm run lint         # eslint

# API Gateway
cd apps/api
npm run build        # npx tsc
npm run start        # node dist/index.js
```

---

## CI/CD Pipeline

### GitHub Actions: Keep-Alive

**File:** `.github/workflows/keep-alive.yml`

**Trigger:** Cron every 14 minutes + manual dispatch

**Purpose:** Prevents Render free-tier instances from sleeping by sending HTTP HEAD requests.

```yaml
name: Keep Alive Services
on:
  schedule:
    - cron: "*/14 * * * *"
  workflow_dispatch:

jobs:
  ping_services:
    runs-on: ubuntu-latest
    steps:
      - name: Ping API Service
        run: curl -I https://satark-ai-f5t7.onrender.com/
      - name: Ping Python Engine
        run: curl -I https://satark-ai-es1v.onrender.com/
```

### Deployment Pipeline

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  git push    │────▶│  GitHub      │────▶│  Auto-Deploy     │
│  to main     │     │  Repository  │     │                  │
└──────────────┘     └──────────────┘     │  • Vercel (web)  │
                                          │  • Render (api)  │
                                          │  • Render (engine)│
                                          └──────────────────┘
```

| Service | Deploy Trigger | Build |
|---------|---------------|-------|
| Frontend | Push to `main` | Vercel auto-build (Vite) |
| API Gateway | Push to `main` | Render auto-build (Node.js) |
| AI Engine | Push to `main` | Render auto-build (Docker) |
| Image Proxy | `wrangler deploy` | Manual (Cloudflare CLI) |

---

## User Journey Flows

### 1. Audio Deepfake Scan

```
User                    Frontend                 API Gateway          AI Engine
 │                         │                         │                    │
 │── Upload audio file ───▶│                         │                    │
 │                         │── POST /scan-upload ───▶│                    │
 │                         │   (JWT + FormData)      │── SHA-256 hash     │
 │                         │                         │── Check cache      │
 │                         │                         │                    │
 │                         │                         │── POST /scan-upload▶│
 │                         │                         │                    │── Wav2Vec2
 │                         │                         │                    │── Librosa
 │                         │                         │                    │── Score
 │                         │                         │◀── ScanResult ─────│
 │                         │                         │── Save to DB       │
 │                         │◀── JSON response ───────│                    │
 │                         │                         │                    │
 │◀── Show result ─────────│                         │                    │
 │   (confidence meter,    │                         │                    │
 │    feature chart,       │                         │                    │
 │    heatmap)             │                         │                    │
```

### 2. Image Deepfake Scan

```
User                    Frontend              Cloudflare Worker      NVIDIA NIM
 │                         │                         │                    │
 │── Upload image ────────▶│                         │                    │
 │                         │── Convert to base64     │                    │
 │                         │── POST (FormData) ─────▶│                    │
 │                         │                         │── Validate origin  │
 │                         │                         │── Check size ≤5MB  │
 │                         │                         │── Encode base64    │
 │                         │                         │── POST /chat ─────▶│
 │                         │                         │                    │── Vision
 │                         │                         │                    │   analysis
 │                         │                         │◀── Response ───────│
 │                         │                         │── Parse JSON       │
 │                         │◀── { isDeepfake, ... } ─│                    │
 │                         │                         │                    │
 │◀── Show verdict ────────│                         │                    │
```

### 3. Speaker Enrollment & Verification

```
ENROLLMENT:
User ──▶ Record/Upload voice ──▶ API /speaker/enroll ──▶ Engine /embed
                                                              │
                                                    ECAPA-TDNN (192-dim)
                                                              │
                                              Store in speakers table ◀──┘

VERIFICATION:
User ──▶ Record/Upload voice ──▶ API /speaker/verify ──▶ Engine /embed
                                        │                       │
                                        │◀── embedding ─────────┘
                                        │
                                        │── Fetch user's speakers from DB
                                        │── Cosine similarity (each speaker)
                                        │── Best match > 0.75?
                                        │
                                        ├── YES: "Matched with {name} (89.1%)"
                                        └── NO:  "No matching speaker found."
```

### 4. Live Monitor (Real-Time)

```
┌─────────────────────────────────────────────────────────┐
│  Browser (LiveMonitor.tsx)                                │
│                                                          │
│  1. navigator.mediaDevices.getUserMedia()                │
│  2. Record 5-second chunks                              │
│  3. POST each chunk to /scan-upload                     │
│  4. Display real-time verdict + confidence              │
│  5. Auto-save threats to history                        │
│  6. Repeat until user stops                             │
└─────────────────────────────────────────────────────────┘
```

### 5. Analytics Dashboard

```
User navigates to Dashboard
        │
        ▼
GET /scans (fetch all user's history)
        │
        ▼
┌─────────────────────────────────────────┐
│  Client-side aggregation:               │
│                                         │
│  • Total Scans count                    │
│  • Deepfakes Detected count             │
│  • Real Audio count                     │
│  • Average Confidence                   │
│  • Detection Ratio (Pie Chart)          │
│  • Confidence Buckets (Bar Chart)       │
│    - High: >80%                         │
│    - Medium: 50–80%                     │
│    - Low: <50%                          │
└─────────────────────────────────────────┘
```

---

## Contributing Workflow

### Branch Strategy

```
main (production)
  └── feat/your-feature (feature branches)
  └── fix/bug-description (bugfix branches)
```

### Pull Request Process

1. Fork the repository
2. Create a feature branch:
   ```bash
   git checkout -b feat/your-feature
   ```
3. Make changes and commit:
   ```bash
   git commit -m "feat: add your feature"
   ```
4. Push and open a PR:
   ```bash
   git push origin feat/your-feature
   ```
5. PR is reviewed and merged to `main`
6. Auto-deploy triggers on merge

### Commit Convention

```
feat: add new feature
fix: resolve bug
docs: update documentation
refactor: code restructuring
chore: maintenance tasks
```

---

## Debugging Tips

### API Gateway

```bash
# Watch mode with auto-reload
cd apps/api
npx tsx watch src/index.ts

# Check DB connectivity
curl http://localhost:3000/health-db
```

### AI Engine

```bash
# Run with reload
uvicorn main:app --reload --port 8000

# Test health
curl http://localhost:8000/

# Test scan (requires audio URL)
curl -X POST http://localhost:8000/scan \
  -H "Content-Type: application/json" \
  -d '{"audioUrl": "https://example.com/audio.mp3", "userId": "test"}'
```

### Frontend

```bash
cd apps/web
npm run dev

# Build check (catches TypeScript errors)
npm run build
```

### Docker

```bash
# Rebuild after code changes
docker-compose up --build

# View logs
docker-compose logs -f engine
docker-compose logs -f api

# Shell into container
docker exec -it satark-ai-engine-1 /bin/bash
```

---

## Performance Monitoring

| Metric | Where to Check |
|--------|---------------|
| Frontend load time | Vercel Analytics dashboard |
| API response times | Render metrics tab |
| Engine inference time | FastAPI logs (`logger.info`) |
| DB query performance | Supabase/Neon dashboard |
| Worker execution time | Cloudflare Workers analytics |
| Cold start frequency | Keep-alive cron success rate (GitHub Actions) |

---

## Known Limitations

| Limitation | Impact | Mitigation |
|-----------|--------|------------|
| Free-tier Render (512MB RAM) | Slow cold starts, potential OOM | Keep-alive cron, lazy loading |
| In-memory rate limiting | Resets on deploy/restart | Acceptable for current scale |
| No WebSocket support | Live Monitor uses polling (5s chunks) | Sufficient for real-time UX |
| Single-region deployment | Higher latency for distant users | Cloudflare Worker handles image at edge |
| No automated tests | Manual testing only | Future: Vitest + Pytest |
| Audio stored as base64 in DB | Large row sizes | Future: Object storage (S3/R2) |
