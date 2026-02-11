# Satark-AI Project Status 🚀

**Date**: February 11, 2026
**Status**: 🟢 **Submission Ready (Internship)**

## 1. Overview

Satark-AI is a multi-modal security platform aimed at detecting **Deepfakes** (Audio/Video) and verifying **Speaker Identity** using biometric voice prints.
**Focus:** Final Polish & Submission Strategy

The project is **feature-complete** and optimized for the Microsoft Elevate Internship submission.
Key achievements include:

- **Real-time Deepfake Detection** (Live Monitor).
- **Persistent History** with Audio Playback & PDF Reports.
- **Smart Deduplication** using SHA-256 Hashing.
- **Microservices Architecture** (React + Hono + Python Engine).

Ready for video recording and demo. 🎥

## 2. Architecture 🏗️

The project follows a localized microservices architecture:

| Service      | Path          | Tech Stack                        | Port   | Description                                 |
| :----------- | :------------ | :-------------------------------- | :----- | :------------------------------------------ |
| **Frontend** | `apps/web`    | React, Vite, Tailwind, Clerk      | `5173` | User Interface (Dashboard, Uploads).        |
| **API**      | `apps/api`    | Node.js, Hono, Drizzle ORM        | `3000` | Orchestrator, Database Logic.               |
| **Engine**   | `apps/engine` | Python, FastAPI, Librosa, PyTorch | `5500` | AI Inference (Deepfake & Speaker ID).       |
| **Database** | `local`       | PostgreSQL                        | `5432` | Stores scan history and speaker embeddings. |

## 3. Live Deployment 🌐

The project is deployed and active at the following URLs:

| Service      | URL                                                                     | Hosting Provider | Config Required                                                        |
| :----------- | :---------------------------------------------------------------------- | :--------------- | :--------------------------------------------------------------------- |
| **Frontend** | [satark-deepfake.vercel.app](https://satark-deepfake.vercel.app/)       | Vercel           | `VITE_API_URL=https://satark-ai-f5t7.onrender.com`                     |
| **API**      | [satark-ai-f5t7.onrender.com](https://satark-ai-f5t7.onrender.com/)     | Render           | `ENGINE_URL=https://satark-ai-engine.onrender.com`, `DATABASE_URL=...` |
| **Engine**   | [satark-ai-engine.onrender.com](https://satark-ai-engine.onrender.com/) | Render           | None (Python Runtime)                                                  |

## 4. Current Features ✅

### A. Deepfake Detection 🕵️‍♂️

- **Audio**: MFCC & Spectral analysis to detect synthetic speech artifacts.
- **Video**: Extracts audio from MP4 files and analyzes it.
- **XAI**: Returns "Explainable AI" heatmap data (fake segments).

### B. Speaker Verification 🆔

- **Enrollment**: Registers a user's voice print (embedding) in DB.
- **Verification**: compares new audio against stored print using Cosine Similarity.
- **Engine**: Uses `speechbrain/spkrec-ecapa-voxceleb` (Patched for Windows).

### C. History & Analytics 📊

- **Dashboard**: Real-time stats (Total Scans, Fake Ratio).
- **History Page**: Lazy-loaded table of past scans with feedback loop.
- **Playback**: Listen to past audio scans (Stored in DB).

### D. Live Monitor (Upgrade) 🎙️

- **Real-Time Analysis**: Captures 5s chunks and sends to Engine.
- **Persistence**: Auto-saves every analysis to Database History.
- **Reporting**: PDF Reports with detailed analysis.

## 5. Key Files & Logic 📂

### Engine (`apps/engine`)

- `main.py`: FastAPI entry point. Defines `/scan`, `/scan-upload`, `/embed`.
- `detect.py`: Core Deepfake Detection logic. (Optimized with `run_in_executor`).
- `speaker.py`: Speaker Verification logic. (Contains Windows patches for Symlinks/Torchaudio).

### API (`apps/api`)

- `src/index.ts`: API Gateway. Routes requests to Engine or DB.
- `src/db/schema.ts`: Database Schema (`scans`, `speakers`). (Indexed for performance).

### Web (`apps/web`)

- `src/App.tsx`: Main Router. (Uses `React.lazy` for split chunks).
- `src/components/SpeakerIdentity.tsx`: Identity Enrollment/Verification UI.

## 6. Visual State 🖼️

### Dashboard Overview

![Dashboard](file:///C:/Users/gauta/.gemini/antigravity/brain/bebaf7f0-afce-4163-bf48-c40f5d23e499/dashboard_overview_1770741630046.png)

### Speaker Identity Tab

![Speaker ID](file:///C:/Users/gauta/.gemini/antigravity/brain/bebaf7f0-afce-4163-bf48-c40f5d23e499/dashboard_speaker_identity_1770741639207.png)

## 7. How to Resume Work 🔄

To start the project again from scratch:

1.  **Database**: Ensure PostgreSQL is running.
2.  **Terminals**: Open 3 separate terminals.
3.  **Run Engine**:
    ```bash
    cd apps/engine
    python -m uvicorn main:app --reload --port 5500
    ```
4.  **Run API**:
    ```bash
    cd apps/api
    npm run dev
    ```
5.  **Run Web**:
    ```bash
    cd apps/web
    npm run dev
    ```

**Note**: If you face "Port In Use" errors, use `npx kill-port 3000` (or 5500/5173).

## 8. Known Patches

- **Windows Symlinks**: `speaker.py` monkey-patches `speechbrain` to COPY files instead of using symlinks.
- **Torchaudio**: `speaker.py` forces `backend="soundfile"` to avoid `torchcodec` errors.

## 9. Verification Log (Automated) ✅

- **Deepfake Detector**: Verified via URL Scan (Success).
- **Speaker Identity**: Verified Enrollment UI accessibility (Success).
- **Live Deployment**: Verified Vercel & Render URLs (Active).
- **History Logging**: Fixed bug where Speaker Identity scans were not saved. verified via code patch.
- **Codebase Polish**: Optimized Engine imports/logging, Refactored API index.ts, Cleaned unused files.
- **Engine Crash Fix**: Added missing `torch` / `speechbrain` dependencies to requirements.txt & Dockerfile (Verified).
- **Torchaudio Patch**: Fixed `AttributeError` by reordering monkey patch before `speechbrain` imports (Verified).
- **Theme Toggle**: Implemented Dark/Light/System mode with persistence (Verified).
- **Live Monitor Persistence**: Verified Audio Recording, API Upload, and Database Entry (History).
- **PDF Reports**: Verified generation with correct Metadata and numeric ID handling.
- **Audio Storage & Playback**: Verified DB persistence (Base64) and Frontend Player (`apps/api/src/index.ts`).
- **Deduplication**: Verified SHA-256 Hashing and Cache Hit Logic.

## 10. User Preferences 🗣️

- **Language**: Always communicate in **Hindi** or **Hinglish**.
- **Data Persistence**: Ensure ALL scans (Live, Upload, URL) are saved to Database.
- **Privacy**: No Cloud Storage for audio files (Local Processing Only).
