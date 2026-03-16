# Satark-AI - Project Deep Dive Analysis

This document provides a comprehensive technical analysis of the **Satark-AI** project, including its architecture, workflows, business logic, and technology stack.

## 1. Project Overview & Architecture

Satark-AI is a deepfake detection and speaker verification platform. The project is structured as a scalable **Monorepo** using **Turborepo** (`turbo.json`). 

It consists of three main microservices (`apps/`) and a shared package (`packages/`):

*   **Frontend (`apps/web`)**: A high-performance user interface built with React and Vite.
*   **API Gateway (`apps/api`)**: A Node.js backend handling routing, database operations, and authentication.
*   **AI Engine (`apps/engine`)**: A Python-based machine learning service that processes audio for deepfake detection and speaker verification.
*   **Shared (`packages/shared`)**: Shared Zod schemas enabling type-safe communication between the frontend and the API.

---

## 2. Technology Stack

### Frontend (`apps/web`)
*   **Core**: React 18, Vite, TypeScript.
*   **Styling & UI**: Tailwind CSS, Framer Motion, Radix UI, Class Variance Authority (CVA).
*   **State & Data Fetching**: React Query (`@tanstack/react-query`), React Router DOM.
*   **Authentication**: Clerk (`@clerk/clerk-react`).
*   **Utilities**: Wavesurfer.js (audio visualization), Recharts (charts), jsPDF (reports), React Hook Form + Zod.
*   **PWA**: Configured as a Progressive Web App using `vite-plugin-pwa`.

### Backend API (`apps/api`)
*   **Core**: Node.js, Hono framework (`@hono/node-server`), TypeScript.
*   **Database**: PostgreSQL managed via **Drizzle ORM**.
*   **Authentication**: Clerk integration (`@hono/clerk-auth`).
*   **Validation**: Zod via `@hono/zod-validator`.

### AI Engine (`apps/engine`)
*   **Core**: Python 3, FastAPI, Uvicorn.
*   **Audio Processing**: Librosa, Soundfile, Torchaudio.
*   **Machine Learning**: PyTorch, SpeechBrain (`speechbrain/spkrec-ecapa-voxceleb` model).
*   **Integration**: HuggingFace Hub (for model downloading).

---

## 3. Core Features & Business Logic

### A. Deepfake Detection Workflow
The core feature involves detecting synthetic or manipulated audio.

1.  **Client-Side (`web`)**: The user uploads an audio/video file or records live audio.
2.  **API Gateway (`api`)**:
    *   The `web` app makes a `POST /scan-upload` request to the backend.
    *   The backend calculates a SHA-256 hash of the incoming file buffer.
    *   *Deduplication*: It checks the `scans` table in PostgreSQL. If the exact file hash exists, it instantly returns the cached result, saving heavy AI processing time.
    *   If new, the file is forwarded to the AI Engine as `multipart/form-data`.
3.  **AI Engine (`engine` -> `detect.py`)**:
    *   The file is saved temporarily. If it's a video, `moviepy` extracts the audio trace into `.wav`.
    *   **Feature Extraction**: `librosa` computes the Zero Crossing Rate (ZCR), Spectral Rolloff, MFCC (Mel-frequency cepstral coefficients), and silence ratios.
    *   **Scoring Heuristics**: 
        *   Low silence ratio (< 0.05) adds +30 points (unnaturally continuous speech).
        *   High ZCR (> 0.15) adds +20 points (high-frequency noise anomalies).
        *   Low Spectral Rolloff (< 2000) adds +10 points (constrained bandwidth typical in generation).
    *   A score above 50 flags the audio as a Deepfake.
    *   The engine returns a structured JSON (`ScanResult`) to the API.
4.  **Database Storage (`api`)**:
    *   The API saves the result into the `scans` table, including the Base64 representation of the audio (`audioData`) to serve it back later without needing cloud storage like AWS S3.
5.  **Result Interface (`web`)**: Visualizes the confidence score, MFCC plots, and precise decision factors.

### B. Speaker Verification (Voice Biometrics)
Validating a speaker's identity using Deep Learning.

1.  **Enrollment & Embedding (`engine` -> `speaker.py`)**:
    *   Uses **SpeechBrain's ECAPA-TDNN** model (`spkrec-ecapa-voxceleb`).
    *   Audio is transformed into a 192-dimensional vector embedding (`[batch, 1, 192]`).
2.  **Database Strategy (`api`)**:
    *   The embeddings and speaker details are stored in the PostgreSQL `speakers` table.
3.  **Authentication**:
    *   When another clip is uploaded for verification, the engine generates an embedding and compares the cosine similarity or vector distance against the stored embedding to confirm the identity.

### C. Live Monitor
*   Captures live audio streams in chunks (e.g., 5 seconds) using browser APIs.
*   Pipes them progressively through the Deepfake Detection endpoint.
*   Provides real-time warning via the UI if a segment surpasses the fake classification threshold.

---

## 4. Database Schema Details (Drizzle ORM)

### Table: `scans`
Archives all deepfake detection analysis histories.
*   `id`: Primary key.
*   `userId`: Clerk user ID.
*   `audioUrl`: Source identifier.
*   `isDeepfake`: Boolean flag.
*   `confidenceScore`: Numeric likelihood.
*   `fileHash`: SHA-256 string for deduplication logic.
*   `audioData`: Base64 string of the audio content.
*   `analysisDetails`: Reasoing string from the AI heuristics.

### Table: `speakers`
Stores voice prints for biometrics matching.
*   `id`: UUID.
*   `userId`: Clerk user ID.
*   `name`: Label for the speaker.
*   `embedding`: JSON array storing the SpeechBrain 192-D tensor.

---

## 5. Security and Tradeoffs
*   **File Hashing**: Significant performance boost through request deduplication, sparing the Python API from redundant inference load.
*   **Base64 Audio Storage**: Bypassing Dedicated Buckets (like S3) makes deployment cheaper and simpler, although storing Base64 in PostgreSQL can increase database size significantly over time.
*   **Heuristics vs. Deep ML Detection**: The Deepfake audio logic currently relies heavily on DSP mathematical heuristics (ZCR, MFCC thresholds) rather than passing the audio through an end-to-end Deepfake Transformer/CNN model. While extremely fast, its accuracy against highly advanced modern deepfakes (like ElevenLabs) might be lower without a dedicated neural network trained specifically on synthetic artifacts. 
*   **Authentication**: Fully delegated to Clerk, ensuring secure and modern token validation.

---

## Summary
Satark-AI is a well-architected modern web-application demonstrating clear separation of concerns: an interactive React UI, a lightweight Node router/database orchestrator, and a dedicated resource-heavy Python inference server. 

### Recommended Next Steps for the Project:
1. Move from heuristic scoring in `detect.py` to an actual trained model (e.g., Wav2Vec2 fine-tuned for Deepfake detection).
2. Move Base64 audio storage out of Postgres to an S3-compatible Blob storage to prevent database bloat.
