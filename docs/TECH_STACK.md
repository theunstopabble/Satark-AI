# Technology Stack

**Version:** 2.0.0 | **Last Updated:** May 2026

Complete technology inventory for the Satark-AI deepfake detection platform.

---

## Stack Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND          │  API GATEWAY       │  AI ENGINE             │
│  React 18 + Vite   │  Hono + Node.js    │  FastAPI + Python 3.11 │
│  TypeScript 5.2    │  Drizzle ORM       │  PyTorch 2.2           │
│  Tailwind CSS 3.4  │  Clerk Auth        │  Wav2Vec2              │
│  Framer Motion     │  PostgreSQL        │  SpeechBrain 1.0       │
└─────────────────────────────────────────────────────────────────┘
│  EDGE                │  INFRA              │  SHARED               │
│  Cloudflare Workers  │  Docker Compose     │  Zod Schemas          │
│  NVIDIA NIM API      │  GitHub Actions     │  Turborepo            │
│  Llama 3.2-90B       │  Vercel + Render    │  TypeScript Types     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Frontend (`apps/web`)

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.2 | Core UI framework — component-based architecture |
| Vite | 7.1 | Build tool with HMR, ESM-native bundling |
| TypeScript | 5.2 | Static type safety across the frontend |
| Tailwind CSS | 3.4 | Utility-first CSS framework |
| Framer Motion | 12.33 | Declarative animations (dashboard cards, transitions) |
| React Router DOM | 6.21 | Client-side routing (SPA) |
| TanStack React Query | 5.17 | Server state management, caching, refetching |
| Clerk React | 4.30 | Authentication UI components (SignIn, SignUp, UserButton) |
| Recharts | 3.7 | Analytics charts (PieChart, BarChart) |
| Wavesurfer.js | 7.12 | Audio waveform visualization and playback |
| Lucide React | 0.316 | Icon library (consistent, tree-shakeable) |
| React Hook Form | 7.50 | Form state management with validation |
| Zod | 3.22 | Schema validation (shared with backend) |
| jsPDF | 4.1 | Client-side PDF report generation |
| jsPDF-AutoTable | 5.0 | Table formatting in PDF exports |
| clsx | 2.1 | Conditional className utility |
| tailwind-merge | 2.2 | Intelligent Tailwind class merging |
| class-variance-authority | 0.7 | Component variant management |
| tailwindcss-animate | 1.0 | Animation utilities for Tailwind |
| Radix UI (react-slot) | 1.0 | Headless UI primitives |
| Vercel Analytics | 2.0 | Production analytics tracking |
| vite-plugin-pwa | 1.3 | PWA generation (Workbox service worker) |

### Dev Dependencies

| Technology | Version | Purpose |
|-----------|---------|---------|
| @vitejs/plugin-react | 4.7 | React Fast Refresh for Vite |
| PostCSS | 8.4 | CSS processing pipeline |
| Autoprefixer | 10.4 | Vendor prefix automation |

---

## API Gateway (`apps/api`)

| Technology | Version | Purpose |
|-----------|---------|---------|
| Hono | 4.0 | Ultrafast web framework (Cloudflare/Node/Bun compatible) |
| @hono/node-server | 1.19 | Node.js HTTP adapter for Hono |
| @hono/clerk-auth | 3.1 | Clerk JWT middleware for Hono |
| @hono/zod-validator | 0.2 | Request validation via Zod schemas |
| Drizzle ORM | 0.45 | Type-safe SQL query builder |
| pg | 8.20 | PostgreSQL client (node-postgres) |
| dotenv | 16.6 | Environment variable loading |
| Node.js crypto | Built-in | SHA-256 hashing for deduplication |

### Dev Dependencies

| Technology | Version | Purpose |
|-----------|---------|---------|
| tsx | 4.21 | TypeScript execution (dev mode) |
| drizzle-kit | 0.31 | Schema migrations and introspection |
| @types/pg | 8.16 | PostgreSQL type definitions |

### Why Hono over Express?

- 3–5x faster request handling (no middleware overhead)
- Native TypeScript support with type-safe routing
- Works on Node.js, Bun, Cloudflare Workers, and Deno
- Built-in CORS, Zod validation, and auth middleware adapters
- Smaller bundle size (~14KB vs Express ~200KB)

---

## AI Engine (`apps/engine`)

| Technology | Version | Purpose |
|-----------|---------|---------|
| FastAPI | 0.111 | Async Python web framework with auto-docs |
| Uvicorn | 0.29 | ASGI server (production-grade) |
| PyTorch | 2.2 (CPU) | Deep learning inference runtime |
| torchaudio | 2.2 | Audio tensor operations |
| Transformers (HuggingFace) | 4.40 | Wav2Vec2 model loading and inference |
| SpeechBrain | 1.0.2 | ECAPA-TDNN speaker encoder |
| Librosa | 0.10.2 | Audio feature extraction (MFCC, ZCR, spectral rolloff) |
| NumPy | 1.26.4 | Numerical computing |
| SoundFile | 0.12.1 | Audio file I/O |
| httpx | 0.27 | Async HTTP client (audio URL downloads) |
| python-multipart | 0.0.9 | Multipart form data parsing |
| huggingface_hub | 0.23 | Model downloading from HuggingFace Hub |
| moviepy | 1.0.3 | Video-to-audio extraction (MP4 → WAV) |
| Python | 3.11 | Runtime (slim Docker image) |

### AI Models

| Model | Architecture | Parameters | Purpose |
|-------|-------------|------------|---------|
| `garystafford/wav2vec2-deepfake-voice-detector` | Wav2Vec2ForSequenceClassification | ~95M | Audio deepfake detection |
| `speechbrain/spkrec-ecapa-voxceleb` | ECAPA-TDNN | ~6M | Speaker embedding (192-dim) |
| `meta/llama-3.2-90b-vision-instruct` | Llama 3.2 Vision | 90B | Image deepfake detection (via NVIDIA NIM) |

### System Dependencies (Docker)

| Package | Purpose |
|---------|---------|
| `libsndfile1` | Audio file reading (required by soundfile/librosa) |
| `ffmpeg` | Audio/video codec support (required by moviepy) |

---

## Edge / Serverless (`cloudflare-worker`)

| Technology | Purpose |
|-----------|---------|
| Cloudflare Workers (V8 isolate) | Serverless edge compute |
| NVIDIA NIM API | Vision-language model inference |
| AbortController | Request timeout management |
| Web Crypto API | (Available if needed for hashing) |

### Why Cloudflare Workers for Image Detection?

- **API key isolation:** NVIDIA key stored in Cloudflare Secrets, never exposed to frontend
- **Edge latency:** Runs close to user, reduces round-trip time
- **No cold start:** V8 isolates start in <5ms (vs Render's 30–60s)
- **Independent scaling:** Image pipeline doesn't compete with audio engine for resources
- **CORS control:** Strict origin whitelist at the edge

---

## Database

| Technology | Version | Purpose |
|-----------|---------|---------|
| PostgreSQL | 14+ | Primary data store |
| Drizzle ORM | 0.45 | Schema definition, migrations, type-safe queries |
| pg (node-postgres) | 8.20 | Connection pooling (max 20, 5s timeout) |
| SSL | Required | Encrypted connections to cloud DB |

### Hosting Options

| Provider | Tier | Notes |
|----------|------|-------|
| Supabase | Free (500MB) | Recommended — built-in dashboard |
| Neon | Free (512MB) | Serverless PostgreSQL, auto-scaling |
| Railway | Free ($5 credit) | Simple setup, good DX |

---

## Infrastructure & DevOps

| Technology | Purpose |
|-----------|---------|
| Turborepo | Monorepo build orchestration, caching |
| Docker | Containerization (engine Dockerfile) |
| Docker Compose | Local multi-service orchestration |
| GitHub Actions | CI/CD (keep-alive cron) |
| Vercel | Frontend hosting (CDN, edge functions) |
| Render | Backend hosting (API + Engine) |
| Cloudflare Workers | Edge serverless (image proxy) |

---

## Shared Package (`packages/shared`)

| Technology | Purpose |
|-----------|---------|
| Zod | Runtime schema validation |
| TypeScript | Shared type definitions |

**Exports:**
- `AudioUploadSchema` / `AudioUploadType`
- `ScanResultSchema` / `ScanResultType`

Consumed by both `apps/api` and `apps/web` for end-to-end type safety.

---

## Authentication

| Technology | Purpose |
|-----------|---------|
| Clerk | Identity provider (JWT-based) |
| @clerk/clerk-react | Frontend auth components |
| @hono/clerk-auth | Backend JWT verification |
| @clerk/themes | UI theme customization |

**Flow:** Clerk issues JWT → Frontend attaches to requests → API Gateway verifies via `clerkMiddleware()` → Extracts `userId` from token claims.

---

## Security Libraries & Patterns

| Pattern | Implementation |
|---------|---------------|
| JWT verification | Clerk middleware (server-side) |
| Input validation | Zod schemas (shared package) |
| File hashing | Node.js `crypto.subtle.digest("SHA-256")` |
| Rate limiting | In-memory Map with TTL |
| CORS | Strict origin whitelist (no wildcard) |
| Container security | Non-root user, no-new-privileges |
| Secret management | Cloudflare Worker Secrets (NVIDIA key) |

---

## Version Compatibility Matrix

| Component | Minimum | Tested |
|-----------|---------|--------|
| Node.js | 18.0 | 20.x |
| Python | 3.11 | 3.11 |
| PostgreSQL | 14 | 14+ |
| Docker | 20.10 | Latest |
| npm | 9.0 | 10.x |
