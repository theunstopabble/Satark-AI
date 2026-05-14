# System Architecture

**Version:** 2.0.0 | **Last Updated:** May 2026

Satark-AI is a **Turborepo monorepo** with 4 independently deployable services communicating over HTTP.

---

## Monorepo Structure

```
satark-ai/
├── apps/
│   ├── web/               → React 18 + Vite (Frontend PWA)
│   ├── api/               → Hono + Node.js (API Gateway)
│   └── engine/            → FastAPI + Python 3.11 (AI Engine)
├── packages/
│   └── shared/            → Zod schemas + TypeScript types
├── cloudflare-worker/     → satark-image-proxy (NVIDIA NIM proxy)
├── docker-compose.yml     → Local multi-service orchestration
├── turbo.json             → Turborepo pipeline config
└── package.json           → Root workspace config
```

---

## Service Map

| Service | Runtime | Responsibility | Port | Deployment |
|---------|---------|---------------|------|------------|
| `apps/web` | React 18 + Vite | UI, PWA shell, client-side routing | 5173 | Vercel |
| `apps/api` | Node.js 20 + Hono | Auth, DB, orchestration, rate limiting | 3000 | Render |
| `apps/engine` | Python 3.11 + FastAPI | Audio deepfake detection, speaker embeddings | 8000 | Render |
| `cloudflare-worker` | Cloudflare Workers (V8) | Image proxy → NVIDIA NIM API | Edge | Cloudflare |

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser / PWA)                        │
│                     React 18 + Vite + Tailwind CSS                   │
│              Clerk Auth │ Wavesurfer.js │ Recharts │ Framer Motion   │
└────────────┬───────────────────────────────────────┬────────────────┘
             │                                       │
             │ Audio/Speaker requests                │ Image requests
             │ (Authorization: Bearer <JWT>)         │ (multipart/form-data)
             ▼                                       ▼
┌────────────────────────┐              ┌─────────────────────────────┐
│    HONO API GATEWAY    │              │    CLOUDFLARE WORKER        │
│    (Node.js + Hono)    │              │    (satark-image-proxy)     │
│                        │              │                             │
│  • Clerk JWT verify    │              │  • CORS whitelist           │
│  • Rate limiting       │              │  • 5MB size enforcement     │
│  • SHA-256 dedup       │              │  • Base64 encoding          │
│  • DB persistence      │              │  • 30s AbortController      │
│  • Cosine similarity   │              │  • JSON response parsing    │
└──────────┬─────────────┘              └──────────────┬──────────────┘
           │                                           │
           │ HTTP (FormData)                           │ HTTPS
           ▼                                           ▼
┌────────────────────────┐              ┌─────────────────────────────┐
│    FASTAPI AI ENGINE   │              │      NVIDIA NIM API         │
│    (Python 3.11)       │              │  meta/llama-3.2-90b-vision  │
│                        │              │  -instruct                  │
│  • Wav2Vec2 inference  │              │                             │
│  • Spectral analysis   │              │  • Spatial artifact detect  │
│  • ECAPA-TDNN embed    │              │  • Texture inconsistency    │
│  • moviepy fallback    │              │  • Lighting anomaly         │
└──────────┬─────────────┘              └─────────────────────────────┘
           │
     ┌─────┴──────┐
     ▼            ▼
┌──────────┐  ┌──────────────────┐
│PostgreSQL│  │  PyTorch Models  │
│(Drizzle) │  │  (Lazy-loaded)   │
│          │  │                  │
│• scans   │  │• Wav2Vec2        │
│• speakers│  │• ECAPA-TDNN      │
└──────────┘  └──────────────────┘
```

---

## Request Flows

### Audio Deepfake Scan (Upload)

```
Browser                API Gateway              AI Engine              PostgreSQL
  │                        │                        │                      │
  │── POST /scan-upload ──▶│                        │                      │
  │   (file + JWT)         │                        │                      │
  │                        │── Verify Clerk JWT ───▶│                      │
  │                        │── Check rate limit     │                      │
  │                        │── SHA-256 hash ────────┼──── Cache lookup ───▶│
  │                        │                        │                      │
  │                        │   [Cache miss]         │                      │
  │                        │── POST /scan-upload ──▶│                      │
  │                        │   (FormData)           │── Load Wav2Vec2      │
  │                        │                        │── Extract features   │
  │                        │                        │── ML + Heuristic     │
  │                        │◀── ScanResult ────────│                      │
  │                        │                        │                      │
  │                        │── INSERT scan ─────────┼─────────────────────▶│
  │◀── JSON response ─────│                        │                      │
```

### Speaker Enrollment

```
Browser                API Gateway              AI Engine              PostgreSQL
  │                        │                        │                      │
  │── POST /speaker/enroll▶│                        │                      │
  │   (file + name + JWT)  │                        │                      │
  │                        │── Verify JWT           │                      │
  │                        │── POST /embed ────────▶│                      │
  │                        │                        │── Load ECAPA-TDNN    │
  │                        │                        │── librosa 16kHz      │
  │                        │                        │── encode_batch()     │
  │                        │◀── { embedding: [] } ──│                      │
  │                        │                        │                      │
  │                        │── INSERT speaker ──────┼─────────────────────▶│
  │◀── { success: true } ──│                        │                      │
```

### Speaker Verification

```
Browser                API Gateway              AI Engine              PostgreSQL
  │                        │                        │                      │
  │── POST /speaker/verify▶│                        │                      │
  │   (file + JWT)         │                        │                      │
  │                        │── POST /embed ────────▶│                      │
  │                        │◀── { embedding: [] } ──│                      │
  │                        │                        │                      │
  │                        │── SELECT speakers ─────┼─────────────────────▶│
  │                        │   WHERE userId = ?     │                      │
  │                        │◀──────────────────────┼──── speaker rows ────│
  │                        │                        │                      │
  │                        │── Cosine similarity    │                      │
  │                        │   (threshold: 0.75)    │                      │
  │                        │                        │                      │
  │                        │── INSERT scan (log) ───┼─────────────────────▶│
  │◀── { isMatch, score } ─│                        │                      │
```

### Image Deepfake Scan

```
Browser                         Cloudflare Worker           NVIDIA NIM API
  │                                    │                         │
  │── POST (multipart/form-data) ─────▶│                         │
  │                                    │── Validate origin       │
  │                                    │── Check size (≤5MB)     │
  │                                    │── ArrayBuffer→Base64    │
  │                                    │── POST /chat/completions▶│
  │                                    │   (Data URI + prompt)    │
  │                                    │                         │── Vision analysis
  │                                    │◀── JSON response ───────│
  │                                    │── extractJSON()          │
  │                                    │── Clamp score [0,1]     │
  │◀── { isDeepfake, score, details } ─│                         │
```

---

## Data Flow Diagram

```
                    ┌──────────────────────────────────────┐
                    │           DATA STORES                 │
                    ├──────────────────────────────────────┤
                    │                                      │
                    │  PostgreSQL (Supabase/Neon/Railway)  │
                    │  ┌────────────┐  ┌───────────────┐  │
                    │  │   scans    │  │   speakers    │  │
                    │  │            │  │               │  │
                    │  │ • id (PK)  │  │ • id (UUID)   │  │
                    │  │ • userId   │  │ • userId      │  │
                    │  │ • scanType │  │ • name        │  │
                    │  │ • fileHash │  │ • embedding   │  │
                    │  │ • audioData│  │   (192-dim)   │  │
                    │  └────────────┘  └───────────────┘  │
                    │                                      │
                    └──────────────────────────────────────┘
                                      ▲
                                      │ Drizzle ORM
                                      │ (pg Pool, max 20)
                    ┌─────────────────┴────────────────────┐
                    │          API GATEWAY                   │
                    │                                       │
                    │  Auth Context ──▶ userId extraction   │
                    │  Rate Limiter ──▶ In-memory Map       │
                    │  Dedup Cache ───▶ SHA-256 fileHash    │
                    └──────────────────────────────────────┘
```

---

## Security Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│  TRUST BOUNDARY: Public Internet                                 │
│                                                                   │
│  ┌─────────────┐     ┌──────────────────────────────────────┐   │
│  │   Browser   │────▶│  Clerk (3rd-party Auth Provider)      │   │
│  └─────────────┘     └──────────────────────────────────────┘   │
│         │                                                        │
└─────────┼────────────────────────────────────────────────────────┘
          │ JWT Token
┌─────────┼────────────────────────────────────────────────────────┐
│  TRUST BOUNDARY: Backend Services                                 │
│         ▼                                                        │
│  ┌─────────────────┐    ┌──────────────────┐                    │
│  │  API Gateway    │───▶│  AI Engine       │  (internal only)   │
│  │  (JWT verified) │    │  (no auth)       │                    │
│  └────────┬────────┘    └──────────────────┘                    │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │  PostgreSQL     │  (SSL, connection pool)                    │
│  └─────────────────┘                                            │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  TRUST BOUNDARY: Edge (Cloudflare)                                │
│                                                                   │
│  ┌─────────────────────┐    ┌────────────────────┐              │
│  │  Cloudflare Worker  │───▶│  NVIDIA NIM API    │              │
│  │  (origin whitelist) │    │  (API key in       │              │
│  │  (size enforcement) │    │   Worker Secrets)  │              │
│  └─────────────────────┘    └────────────────────┘              │
└──────────────────────────────────────────────────────────────────┘
```

---

## Shared Package (`packages/shared`)

The `@repo/shared` package provides Zod validation schemas consumed by both `apps/api` and `apps/web`:

| Export | Type | Purpose |
|--------|------|---------|
| `AudioUploadSchema` | Zod Object | Validates scan request payloads |
| `AudioUploadType` | TypeScript Type | Inferred type from schema |
| `ScanResultSchema` | Zod Object | Validates scan response structure |
| `ScanResultType` | TypeScript Type | Inferred type from schema |

This ensures type-safe contracts between frontend and backend without code duplication.

---

## Scaling Considerations

| Component | Current | Scale Path |
|-----------|---------|------------|
| API Gateway | Single Render instance | Horizontal scale (stateless) |
| AI Engine | Single Render instance | GPU instances, model sharding |
| Database | Single PostgreSQL | Read replicas, connection pooling (PgBouncer) |
| Image Proxy | Cloudflare Workers | Auto-scales at edge (no action needed) |
| Rate Limiting | In-memory Map | Redis for multi-instance coordination |
| Model Loading | Lazy (first request) | Pre-warm on paid tiers |
