# Satark-AI: Defending Truth in the Age of Generative AI 🛡️

<div align="center">
  <img src="apps/web/public/satark-banner.webp" alt="Satark-AI Banner" width="480" />
</div>

<div align="center">

[![Live App](https://img.shields.io/badge/Live%20App-satark--deepfake.vercel.app-0A0A0A?style=for-the-badge&logo=vercel)](https://satark-deepfake.vercel.app)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa)](https://satark-deepfake.vercel.app)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.2-EE4C2C?style=for-the-badge&logo=pytorch)](https://pytorch.org)
[![SpeechBrain](https://img.shields.io/badge/SpeechBrain-1.0-FFD700?style=for-the-badge)](https://speechbrain.github.io)
[![Turborepo](https://img.shields.io/badge/Turborepo-Monorepo-EF4444?style=for-the-badge&logo=turborepo)](https://turbo.build)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com)
[![License](https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge)](LICENSE)

</div>

---

## 🌐 Live Demo

👉 **[Open App → satark-deepfake.vercel.app](https://satark-deepfake.vercel.app/)**

**Satark-AI** is a production-grade, full-stack **deepfake detection and speaker verification platform**. Built as a scalable microservices monorepo, it combines advanced audio forensics — MFCC, Spectral Analysis, Zero Crossing Rate — with state-of-the-art deep learning models (Wav2Vec2, ECAPA-TDNN) to identify synthetic media and verify speaker identities in real time.

---

## 📸 Screenshots

| Dashboard | Mobile View |
| :---: | :---: |
| ![Dashboard](apps/web/public/dashboard.webp) | ![Mobile](apps/web/public/mobile.webp) |

| Live Monitor | Speaker Identity |
| :---: | :---: |
| ![Live Monitor](apps/web/public/monitor.webp) | ![Speaker ID](apps/web/public/identity.webp) |

---

## 🌟 Feature Overview

### 🕵️ Deepfake Audio Detection
- **Wav2Vec2 Model**: Transformer-based deep learning model fine-tuned for synthetic speech detection.
- **Multi-Feature Forensics**: Analyzes MFCC coefficients, Spectral Rolloff, and Zero Crossing Rate (ZCR) for composite risk scoring.
- **Multi-Format Support**: Upload **MP3**, **WAV**, or extract audio from **MP4** video files — handled via `moviepy` fallback.
- **Explainable AI (XAI)**: Returns structured `analysisDetails` with per-feature reasoning (e.g., `"Anomalous zero crossing rate (0.214)"`).
- **Confidence Scoring**: 4-decimal precision confidence score returned per scan.
- **Smart Deduplication**: SHA-256 file hashing prevents redundant re-processing of identical files.

### 🖼️ Deepfake Image Detection
- Dedicated `/analyze` image endpoint via `detect_image.py`.
- Supports direct image file uploads through the `ImageUpload` component.

### 🆔 Voice Biometrics — Speaker Identity
- **Enrollment System**: Enroll a speaker by uploading a reference audio sample. ECAPA-TDNN extracts a 192-dim voice embedding stored securely in PostgreSQL.
- **Verification**: Match an unknown voice against all enrolled speakers using **Cosine Similarity** (threshold: **0.75**).
- **Scoped Isolation**: Users only verify against their **own** enrolled speakers — cross-user data access is prevented at the query level.
- **Auto-History Logging**: Every verification attempt is saved to the scan history table with identity details.

### 🎙️ Live Monitor
- **Real-Time Protection**: Continuously captures microphone input and processes it in **5-second chunks**.
- **Instant Feedback**: Each chunk is scanned and flagged as real or synthetic with confidence score.
- **Auto-Persistence**: All detected threats are saved to the history database automatically.

### 📊 Analytics Dashboard
- **Detection Ratio Chart**: Donut chart (Recharts PieChart) visualizing Real vs. Fake scan breakdown.
- **Confidence Bucketing**: Bar chart grouping scans into High (>80%), Medium (50–80%), and Low (<50%) confidence bands.
- **Summary Cards**: Total Scans, Deepfakes Detected, Real Audio count, and Average Confidence — animated with Framer Motion.

### 🎮 Deepfake Game (Interactive)
- `DeepfakeGame` component — an interactive challenge mode that tests the user's ability to distinguish real from AI-generated audio samples.

### 💬 Feedback System
- Users can submit feedback on any scan via `FeedbackWidget`.
- Stored in the `scans.feedback` column and retrievable via `/scans/:id/feedback`.

### 📱 PWA & Accessibility
- **Progressive Web App**: Installable on Android/iOS and Desktop via `InstallPWA` component. Powered by **Workbox** service worker with precaching and network-only strategies.
- **Dark / Light Mode**: Full theme toggle via `theme-provider` and `mode-toggle`.
- **Multilingual Support**: Language context (`LanguageContext.tsx`) with a language toggle component.
- **History & Playback**: Review all past scans, listen back to saved audio, and export detailed **PDF reports**.

---

## 🏗️ Architecture

Satark-AI is structured as a **Turborepo monorepo** with three independent microservices and one shared package:

```
satark-ai/
├── apps/
│   ├── web/          → React + Vite  (Frontend)
│   ├── api/          → Hono + Node.js (API Gateway)
│   └── engine/       → FastAPI + Python (AI Engine)
├── packages/
│   └── shared/       → Shared Zod schemas & TypeScript types
├── docker-compose.yml
└── turbo.json
```

### Service Responsibilities

| Service | Runtime | Role | Port |
|---|---|---|---|
| `apps/web` | React 18 + Vite | User interface, PWA shell | 5173 |
| `apps/api` | Node.js + Hono | Auth, DB, orchestration | 3000 |
| `apps/engine` | Python 3.11 + FastAPI | AI inference (deepfake + speaker) | 8000 |

### Request Flow

```
Browser (React) ──► Hono API Gateway ──► FastAPI AI Engine
                          │                     │
                          ▼                     ▼
                      PostgreSQL         PyTorch Models
                     (Drizzle ORM)    (Wav2Vec2, ECAPA-TDNN)
```

---

## 🧠 AI Models & Algorithms

### Deepfake Detection Pipeline (`detect.py`)

| Signal | Feature Extracted | Anomaly Trigger |
|---|---|---|
| Raw waveform | Wav2Vec2 classifier | Model confidence > threshold |
| Frequency domain | Spectral Rolloff | Rolloff < 2500 Hz |
| Time domain | Zero Crossing Rate | ZCR > 0.12 |
| Combined | Composite risk score | Weighted multi-feature fusion |

### Speaker Verification Pipeline (`speaker.py`)

| Step | Technology | Detail |
|---|---|---|
| Audio loading | Librosa | Resampled to 16 kHz mono |
| Embedding extraction | SpeechBrain ECAPA-TDNN | 192-dimensional vector |
| Similarity scoring | Cosine Similarity (TypeScript) | Computed server-side in API |
| Match decision | Threshold (0.75) | `score > 0.75` → Identity Confirmed |

---

## 🗂️ Codebase Deep Dive

### `apps/web` — Frontend

```
src/
├── api/
│   └── client.ts            → Typed API client (scanAudio, scanUpload, scanImage,
│                               enrollSpeaker, verifySpeaker, getHistory, submitFeedback)
├── components/
│   ├── AnalyticsStats.tsx   → Recharts pie + bar dashboard
│   ├── AudioUpload.tsx      → File picker with drag-drop for audio
│   ├── AudioVisualizer.tsx  → Real-time waveform canvas
│   ├── ConfidenceMeter.tsx  → Animated confidence score bar
│   ├── DeepfakeGame.tsx     → Interactive detection challenge game
│   ├── ErrorBoundary.tsx    → React error boundary wrapper
│   ├── FakeHeatmap.tsx      → Feature-level heatmap visualization
│   ├── FeatureChart.tsx     → Per-feature forensic breakdown chart
│   ├── FeedbackWidget.tsx   → User feedback submission UI
│   ├── Footer.tsx
│   ├── ImageUpload.tsx      → Image deepfake upload interface
│   ├── InstallPWA.tsx       → PWA install prompt handler
│   ├── LandingNavbar.tsx    → Public landing page navigation
│   ├── language-toggle.tsx  → i18n language switcher
│   ├── LiveMonitor.tsx      → Real-time mic monitoring (5s chunks)
│   ├── mode-toggle.tsx      → Dark/light theme switch
│   ├── Navbar.tsx           → Authenticated app navigation
│   ├── ScanHistory.tsx      → History list with audio playback
│   ├── SpeakerIdentity.tsx  → Enrollment + verification UI
│   └── theme-provider.tsx   → Global theme context
├── context/
│   └── LanguageContext.tsx  → i18n context provider
├── lib/
│   └── utils.ts             → Shared utility helpers
├── pages/
│   ├── History.tsx          → Full scan history page
│   └── Landing.tsx          → Public marketing landing
├── utils/
│   └── pdfGenerator.ts      → jsPDF-powered report generation
├── App.tsx                  → Root router + Clerk provider
└── AuthenticatedShell.tsx   → Protected app shell wrapper
```

**Key Libraries:**

| Library | Version | Purpose |
|---|---|---|
| React | 18 | Core UI framework |
| Vite | — | Build tool + HMR |
| TypeScript | 5.3 | Type safety |
| Tailwind CSS | — | Utility-first styling |
| Framer Motion | — | Animations |
| Clerk | — | Auth (JWT) |
| Recharts | — | Analytics charts |
| Lucide React | — | Icon set |
| Workbox | 7.3 | PWA / Service Worker |

---

### `apps/api` — API Gateway

```
src/
├── db/
│   ├── index.ts    → Drizzle + pg connection pool (max 20, timeout 5s, idle 30s)
│   └── schema.ts   → PostgreSQL schema definitions
├── middleware/
│   └── auth.ts     → Clerk JWT verification middleware (authMiddleware + requireAuth)
├── routes/
│   └── speaker.ts  → /speaker/enroll + /speaker/verify endpoints
└── index.ts        → Main Hono app, all route registration
```

**Database Schema:**

```typescript
// scans table
{
  id: serial (PK),
  userId: text (NOT NULL),         // Clerk user ID
  audioUrl: text (NOT NULL),
  isDeepfake: boolean,
  confidenceScore: float8,
  fileHash: text,                  // SHA-256 for deduplication
  audioData: text,                 // Base64 encoded audio (for playback)
  analysisDetails: text,           // Human-readable XAI output
  createdAt: timestamp (default now),
  feedback: text
  // Indexes: userId, createdAt, fileHash
}

// speakers table
{
  id: uuid (PK, random),
  userId: text (NOT NULL),         // Clerk user ID (scoped isolation)
  name: text (NOT NULL),
  embedding: json (NOT NULL),      // 192-dim ECAPA-TDNN float array
  createdAt: timestamp (NOT NULL)
  // Index: userId
}
```

**API Endpoints:**

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/upload` | ✅ | Upload audio file for deepfake scan |
| `POST` | `/scan` | ✅ | Scan audio from URL |
| `GET` | `/scans` | ✅ | Get user's scan history |
| `GET` | `/audio/:id` | ✅ | Stream audio blob for playback |
| `POST` | `/scans/:id/feedback` | ✅ | Submit feedback on a scan |
| `POST` | `/speaker/enroll` | ✅ | Enroll speaker voice print |
| `POST` | `/speaker/verify` | ✅ | Verify speaker identity |

---

### `apps/engine` — AI Engine

```
apps/engine/
├── main.py           → FastAPI app, endpoint definitions, lifespan context
├── detect.py         → Deepfake detection pipeline (Wav2Vec2 + spectral)
├── detect_image.py   → Image deepfake detection
├── speaker.py        → ECAPA-TDNN embedding generation + HF patches
├── schemas.py        → Pydantic models (AudioUpload, ScanResult)
├── dummy_custom.py   → SpeechBrain HuggingFace 404 fallback patch
├── requirements.txt  → Pinned Python dependencies
└── Dockerfile        → Python 3.11-slim, non-root user (appuser)
```

**Engine Endpoints:**

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Health check — `{"status": "AI Engine Running"}` |
| `POST` | `/scan` | Scan audio via URL (async download → analyze) |
| `POST` | `/scan-upload` | Scan uploaded audio file |
| `POST` | `/analyze` | Video/audio analysis with moviepy fallback |
| `POST` | `/embed` | Generate ECAPA-TDNN speaker embedding vector |

**Performance Notes:**
- **Lazy Model Loading**: Models load on first request (not at startup) to prevent OOM crashes on free-tier Render instances.
- **Thread Executor**: CPU-bound inference runs in `loop.run_in_executor()` to keep FastAPI async event loop non-blocking.
- **Temp File Cleanup**: All uploaded/extracted files are deleted in `finally` blocks — no disk leaks.

---

### `packages/shared`

Shared Zod validation schemas and TypeScript types (`ScanResultType`, `AudioUploadSchema`, etc.) consumed by both `apps/api` and `apps/web`.

---

### `.github/workflows/keep-alive.yml`

GitHub Actions cron job that pings both Render services **every 14 minutes** to prevent cold starts on the free tier.

```yaml
schedule:
  - cron: "*/14 * * * *"
```

Pings:
- API: `https://satark-ai-f5t7.onrender.com/`
- Engine: `https://satark-ai-es1v.onrender.com/`

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version |
|---|---|
| Node.js | v18+ |
| Python | 3.11+ |
| PostgreSQL | 14+ |
| Docker (optional) | Latest |

---

### Option A — Manual Setup (3 Terminals)

**1. Clone the Repository**

```bash
git clone https://github.com/theunstopabble/Satark-AI.git
cd Satark-AI
```

**2. Install Node.js Dependencies**

```bash
npm install   # installs all workspaces via Turborepo
```

**3. Install Python Dependencies (AI Engine)**

```bash
cd apps/engine
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
```

**4. Configure Environment Variables**

Create `.env` files in each app directory:

`apps/web/.env`
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxx
VITE_API_URL=http://localhost:3000
```

`apps/api/.env`
```env
DATABASE_URL=postgresql://user:password@localhost:5432/satark_db
CLERK_SECRET_KEY=sk_test_xxxx
CLERK_PUBLISHABLE_KEY=pk_test_xxxx
ALLOWED_ORIGINS=http://localhost:5173
ENGINE_URL=http://localhost:8000
```

`apps/engine/.env`
```env
# No required vars — models download from HuggingFace on first run
```

**5. Run Database Migrations**

```bash
cd apps/api
npx drizzle-kit push
```

**6. Start All Services**

| Terminal | Command |
|---|---|
| Terminal 1 — Frontend | `cd apps/web && npm run dev` |
| Terminal 2 — API Gateway | `cd apps/api && npm run dev` |
| Terminal 3 — AI Engine | `cd apps/engine && uvicorn main:app --reload --port 8000` |

Or run everything at once from root:
```bash
npm run dev   # Turborepo orchestrates all three concurrently
```

---

### Option B — Docker Compose

```bash
# Copy and fill in your .env values first
cp .env.example .env

docker-compose up --build
```

Services will start at:
- Frontend: `http://localhost:5173`
- API Gateway: `http://localhost:3000`
- AI Engine: `http://localhost:8000`

**Docker security hardening included:**
- Non-root user (`appuser`) in the engine container
- `no-new-privileges:true` security option on all services
- `tmpfs` mount for `/tmp` in API and web containers

---

## ☁️ Deployment

| Service | Platform | URL |
|---|---|---|
| Frontend (`apps/web`) | Vercel | [satark-deepfake.vercel.app](https://satark-deepfake.vercel.app) |
| API Gateway (`apps/api`) | Render | `satark-ai-f5t7.onrender.com` |
| AI Engine (`apps/engine`) | Render | `satark-ai-es1v.onrender.com` |
| Database | Supabase / Neon / Railway | PostgreSQL (SSL enabled) |

**Vercel config** (`apps/web/vercel.json`) — SPA routing rewrites all paths to `index.html`.

---

## 🔐 Security Architecture

| Layer | Mechanism | Detail |
|---|---|---|
| Authentication | Clerk JWT | All protected routes verify token server-side |
| Authorization | Context-scoped userId | `userId` extracted from auth token — never trusted from request body |
| Speaker isolation | DB-level scoping | Verify queries filter by `userId` — no cross-user voice data access |
| Speaker threshold | Cosine similarity ≥ 0.75 | Strict match threshold prevents false identity confirmations |
| File handling | UUID-prefixed temp files | Uploaded files stored with random UUID prefix, deleted post-processing |
| Container | Non-root user | Engine runs as `appuser` — no root privileges inside Docker |
| Connection pool | pg Pool | Max 20 connections, 5s timeout, graceful error recovery |

---

## 📦 Environment Variables Reference

| Variable | App | Required | Description |
|---|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | web | ✅ | Clerk frontend public key |
| `VITE_API_URL` | web | ✅ | Backend API base URL |
| `DATABASE_URL` | api | ✅ | PostgreSQL connection string |
| `CLERK_SECRET_KEY` | api | ✅ | Clerk backend secret key |
| `CLERK_PUBLISHABLE_KEY` | api | ✅ | Clerk public key (for validation) |
| `ALLOWED_ORIGINS` | api | ✅ | CORS allowed origins (comma-separated) |
| `ENGINE_URL` | api | ✅ | FastAPI engine base URL |
| `IMAGE_API_URL` | api | ⚪ | Cloudflare image proxy (optional) |

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit your changes (`git commit -m 'feat: add your feature'`)
4. Push to the branch (`git push origin feat/your-feature`)
5. Open a Pull Request

---

## 👨‍💻 Author

**Gautam Kumar** — Lead Developer

[![LinkedIn](https://img.shields.io/badge/LinkedIn-gautamkr62-0A66C2?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/gautamkr62/)
[![GitHub](https://img.shields.io/badge/GitHub-theunstopabble-181717?style=for-the-badge&logo=github)](https://github.com/theunstopabble)
[![Portfolio](https://img.shields.io/badge/Portfolio-gautam--kr.vercel.app-000000?style=for-the-badge&logo=vercel)](https://gautam-kr.vercel.app)

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <strong>Built with ❤️ in India 🇮🇳</strong><br/>
  <sub>Satark-AI — Because the truth still matters.</sub>
</div>