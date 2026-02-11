# Satark-AI Project Status 🚀

**Date**: February 11, 2026
**Status**: 🟢 **Completed & Polished (Ready for Submission)**

## 1. Overview

Satark-AI is a comprehensive **AI-Powered Deepfake Detection & Voice Analysis Platform**.
Designed to defend truth in the age of Generative AI, it provides real-time detection, speaker verification, and live monitoring capabilities.

**Submission Target:** Microsoft Elevate Internship / Hackathon.

## 2. Architecture 🏗️

The project utilizes a modern **Monorepo** structure with **Turborepo**:

| Service      | Path          | Tech Stack                            | Port   | Description                   |
| :----------- | :------------ | :------------------------------------ | :----- | :---------------------------- |
| **Frontend** | `apps/web`    | React, Vite, Tailwind, Framer Motion  | `5173` | Responsive Dashboard, PWA.    |
| **API**      | `apps/api`    | Node.js, Hono, Drizzle ORM            | `3000` | Gateway, Business Logic, DB.  |
| **Engine**   | `apps/engine` | Python, FastAPI, PyTorch, SpeechBrain | `5500` | AI Inference, Audio Analysis. |

**Database**: PostgreSQL (Local/Supabase compatible).

## 3. Features ✅

### 📱 PWA & Mobile First

- **Progressive Web App**: Installable on iOS/Android/Desktop.
- **Responsive UI**: Optimized for all viewports (Mobile-first navigation).
- **Offline Support**: Caches key assets for instant improvements.

### 🕵️‍♂️ Deepfake Detection

- **Multi-Modal**: Analyzes Audio files (MP3/WAV) and Video Audio (MP4).
- **Advanced Metrics**: Uses **MFCC (Mel-frequency cepstral coefficients)** and **Spectral Analysis**.
- **Transparency**: Provides confidence scores and heatmaps (XAI).

### 🆔 Speaker Identity

- **Biometric Enrollment**: Creates a unique voice embedding for a speaker.
- **Verification**: Matches new audio against enrolled voices with high precision.
- **Engine**: Powered by `speechbrain/spkrec-ecapa-voxceleb`.

### 🎙️ Live Monitor

- **Real-Time Analysis**: records audio in 5s chunks from the browser.
- **Persistence**: Automatically saves analysis results to the database.
- **Continuous Protection**: Ideal for monitoring calls or live streams.

### 📊 Analytics & History

- **Smart Dashboard**: Visualizes threats and usage stats.
- **Playback**: Listen to past scans directly from the history table.
- **Deduplication**: SHA-256 hashing prevents redundant processing.
- **PDF Reports**: downloadable, detailed forensic reports.

## 4. Work Completed 🛠️

- **Core Logic**: End-to-end integration of Web -> API -> Engine.
- **UI Polish**:
  - Glassmorphism Design Concept.
  - Professional Footer with Social Links.
  - Dynamic Navbar (Mobile/Desktop).
  - Dark/Light Mode.
- **Optimization**:
  - `SpeechBrain` patches for Windows.
  - Database Indexing & Caching.
  - Code Cleanup (Removed unused logs/files).

## 5. Development Setup

To run the project locally:

1.  **Frontend**: `cd apps/web && npm run dev`
2.  **Backend**: `cd apps/api && npm run dev`
3.  **AI Engine**: `cd apps/engine && python -m uvicorn main:app --reload --port 5500`

---

**Developed by [Gautam Kumar](https://www.linkedin.com/in/gautamkr62/)**
