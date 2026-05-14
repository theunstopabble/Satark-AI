# Deployment Guide

**Version:** 2.0.0 | **Last Updated:** May 2026

Step-by-step deployment instructions for all 4 Satark-AI services.

---

## Deployment Overview

| Service | Platform | URL Pattern |
|---------|----------|-------------|
| Frontend (`apps/web`) | Vercel | `satark-deepfake.vercel.app` |
| API Gateway (`apps/api`) | Render (Web Service) | `satark-ai-f5t7.onrender.com` |
| AI Engine (`apps/engine`) | Render (Web Service) | `satark-ai-es1v.onrender.com` |
| Image Proxy | Cloudflare Workers | `satark-image-proxy.gautamkumar43421.workers.dev` |
| Database | Supabase / Neon / Railway | PostgreSQL 14+ (SSL) |

---

## 1. Database (PostgreSQL)

### Option A: Supabase (Recommended for free tier)

1. Create a project at [supabase.com](https://supabase.com)
2. Navigate to **Settings → Database → Connection string**
3. Copy the `postgresql://` URI (use "Session mode" for Drizzle)
4. Run schema migration:

```bash
cd apps/api
echo "DATABASE_URL=postgresql://..." > .env
npx drizzle-kit push
```

### Option B: Neon

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string from the dashboard
3. Run `npx drizzle-kit push` as above

### Verify Tables

After migration, confirm these tables exist:
- `scans` (with indexes: `scans_user_id_idx`, `scans_created_at_idx`, `scans_file_hash_idx`, `scans_scan_type_idx`)
- `speakers` (with index: `speakers_user_id_idx`)

---

## 2. AI Engine (Render)

### Setup

1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect your GitHub repository
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `satark-ai-engine` |
| **Root Directory** | `apps/engine` |
| **Runtime** | Docker |
| **Dockerfile Path** | `./Dockerfile` |
| **Instance Type** | Free (or Starter for faster cold starts) |

### Environment Variables

No environment variables required — models download from HuggingFace on first request.

### Dockerfile Details

```dockerfile
FROM python:3.11-slim
# System deps: libsndfile1, ffmpeg
# CPU-only PyTorch (saves ~1.5GB image size)
# Non-root user: appuser
# Exposes port 8000
```

### Important Notes

- **First request will be slow** (~30–60s) as models download and load into memory
- **Free tier:** Instance sleeps after 15 minutes of inactivity (mitigated by keep-alive cron)
- **RAM requirement:** ~1.5 GB minimum (Wav2Vec2 + ECAPA-TDNN loaded together)

---

## 3. API Gateway (Render)

### Setup

1. Go to Render → **New Web Service**
2. Connect your GitHub repository
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `satark-ai-api` |
| **Root Directory** | `apps/api` |
| **Runtime** | Node |
| **Build Command** | `npm install && npx tsc` |
| **Start Command** | `node dist/index.js` |
| **Instance Type** | Free (or Starter) |

### Environment Variables

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/dbname?sslmode=require` |
| `CLERK_SECRET_KEY` | `sk_test_...` or `sk_live_...` |
| `CLERK_PUBLISHABLE_KEY` | `pk_test_...` or `pk_live_...` |
| `ALLOWED_ORIGINS` | `https://satark-deepfake.vercel.app,http://localhost:5173` |
| `ENGINE_URL` | `https://satark-ai-es1v.onrender.com` (your engine URL) |
| `IMAGE_API_URL` | `https://satark-image-proxy.gautamkumar43421.workers.dev` |
| `PORT` | `3000` (Render auto-detects, but explicit is safer) |

### Health Check

Configure Render health check path: `GET /` (returns `200 OK`)

---

## 4. Frontend (Vercel)

### Setup

1. Go to [vercel.com](https://vercel.com) → **Import Project**
2. Connect your GitHub repository
3. Configure:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `apps/web` |
| **Build Command** | `cd ../.. && npm install && npx turbo build --filter=web` |
| **Output Directory** | `dist` |

### Environment Variables

| Variable | Value |
|----------|-------|
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_test_...` or `pk_live_...` |
| `VITE_API_URL` | `https://satark-ai-f5t7.onrender.com` |

### SPA Routing

Create `apps/web/vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

This ensures client-side routing works for all paths.

### PWA Configuration

The Vite PWA plugin (`vite-plugin-pwa`) generates a service worker with Workbox. The `InstallPWA` component handles the install prompt on supported browsers.

---

## 5. Cloudflare Worker (Image Proxy)

### Setup

1. Install Wrangler CLI:
```bash
npm install -g wrangler
wrangler login
```

2. Navigate to the worker directory:
```bash
cd cloudflare-worker
```

3. Deploy:
```bash
wrangler deploy
```

4. Set the NVIDIA API key as a secret:
```bash
wrangler secret put NVIDIA_API_KEY
# Paste your NVIDIA NIM API key when prompted
```

### Worker Configuration

The worker handles:
- CORS origin whitelist (`satark-deepfake.vercel.app`, `localhost:5173`, `localhost:3000`)
- File size enforcement (5 MB, double-checked)
- Base64 encoding of images for NVIDIA NIM
- 30-second timeout via `AbortController`
- Robust JSON parsing (strips markdown fences, clamps scores)

### CORS Origins

To add new allowed origins, update the whitelist array in the worker source code and redeploy.

---

## 6. Keep-Alive Cron (GitHub Actions)

The free-tier Render instances sleep after 15 minutes of inactivity. A GitHub Actions workflow pings both services every 14 minutes.

**File:** `.github/workflows/keep-alive.yml`

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

> **Note:** Update the URLs if your Render service names change.

---

## Docker Compose (Local Development)

For local multi-service development:

```bash
# Create .env at project root with all required variables
cp .env.example .env
# Fill in DATABASE_URL, CLERK keys, etc.

# Start all services
docker-compose up --build
```

Services start at:
- Frontend: `http://localhost:5173`
- API Gateway: `http://localhost:3000`
- AI Engine: `http://localhost:8000`

### Docker Security Hardening

| Feature | Applied To |
|---------|-----------|
| `no-new-privileges: true` | All services |
| `tmpfs: /tmp` | All services |
| Non-root user (`appuser`) | Engine container |
| No `read_only` on engine | Required for model cache writes |

---

## Post-Deployment Checklist

- [ ] Database tables created (`scans`, `speakers`)
- [ ] AI Engine responds to `GET /` → `{"status": "AI Engine Running"}`
- [ ] API Gateway responds to `GET /` → `Satark-AI API is Running!`
- [ ] API Gateway connects to DB: `GET /health-db` → `{"status": "ok"}`
- [ ] Frontend loads at Vercel URL
- [ ] Clerk authentication works (sign in/sign up)
- [ ] Audio scan completes end-to-end
- [ ] Image scan completes via Cloudflare Worker
- [ ] Speaker enrollment and verification work
- [ ] Keep-alive cron is active (check GitHub Actions tab)

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Engine returns 503 | Cold start (model loading) | Wait 30–60s, retry. Keep-alive cron prevents this. |
| `CORS error` in browser | Origin not in whitelist | Add origin to `ALLOWED_ORIGINS` env var |
| `Unauthorized` on all routes | Clerk keys mismatch | Ensure `CLERK_SECRET_KEY` matches the Clerk app |
| `DB connection timeout` | Wrong `DATABASE_URL` or SSL issue | Verify connection string, ensure `?sslmode=require` |
| Image scan returns 504 | NVIDIA NIM cold start | Retry after 30s. First request to NIM can be slow. |
| `File too large` | Exceeds size limit | Audio: 20MB, Image: 5MB, Speaker: 10MB |
