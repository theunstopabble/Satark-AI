# API Reference

**Version:** 2.0.0 | **Last Updated:** May 2026

Complete endpoint documentation for the Satark-AI platform covering both the **Hono API Gateway** (Node.js) and the **FastAPI AI Engine** (Python).

---

## Base URLs

| Service | Local | Production |
|---------|-------|------------|
| API Gateway | `http://localhost:3000` | `https://satark-ai-f5t7.onrender.com` |
| AI Engine | `http://localhost:8000` | `https://satark-ai-es1v.onrender.com` |
| Image Proxy | — | `https://satark-image-proxy.gautamkumar43421.workers.dev` |

---

## Authentication

All protected endpoints require a **Clerk JWT** token in the `Authorization` header:

```
Authorization: Bearer <clerk_session_token>
```

The API extracts `userId` from the verified JWT — client-supplied `userId` fields are ignored.

---

## API Gateway Endpoints (Hono — Port 3000)

### `GET /`

Health check for the API gateway.

**Auth:** None

**Response:**
```
Satark-AI API is Running!
```

---

### `GET /health-db`

Database connectivity check.

**Auth:** None

**Response (200):**
```json
{ "status": "ok", "db": "connected" }
```

**Response (500):**
```json
{ "status": "error", "db": "disconnected" }
```

---

### `POST /scan`

Scan audio from a URL. Forwards to the AI Engine's `/scan` endpoint.

**Auth:** ✅ Required (Clerk JWT)

**Rate Limit:** 10 requests/minute per user

**Request Body:**
```json
{
  "audioUrl": "https://example.com/audio.mp3",
  "fileName": "sample.mp3"
}
```

**Response (200):**
```json
{
  "id": 42,
  "userId": "user_2abc123",
  "audioUrl": "https://example.com/audio.mp3",
  "isDeepfake": true,
  "confidenceScore": 0.8734,
  "analysisDetails": "[ML+Heuristic] Deepfake risk detected: Wav2Vec2 model flagged as deepfake; Anomalous zero crossing rate (0.214)",
  "features": {
    "zcr": 0.214,
    "rolloff": 1850.5,
    "mfcc_mean": -12.3,
    "silence_ratio": 0.35,
    "duration": 4.2,
    "mfcc_plot": [0.1, 0.2, ...],
    "segments": [{ "start": 0.0, "end": 0.5, "score": 0.8 }]
  },
  "createdAt": "2026-05-15T10:30:00.000Z"
}
```

**Error Responses:**

| Status | Body |
|--------|------|
| 401 | `{ "error": "Unauthorized", "message": "Valid session required" }` |
| 429 | `{ "error": "Rate limit exceeded." }` |
| 503 | `{ "error": "Failed to connect to AI Engine" }` |

---

### `POST /scan-upload`

Upload an audio file for deepfake analysis. Supports SHA-256 deduplication.

**Auth:** ✅ Required

**Rate Limit:** 60 requests/minute per user

**Max File Size:** 20 MB

**Request:** `multipart/form-data`

| Field | Type | Required |
|-------|------|----------|
| `file` | File (MP3/WAV/MP4) | ✅ |

**Response (200):**
```json
{
  "id": 43,
  "userId": "user_2abc123",
  "audioUrl": "uploaded://recording.wav",
  "isDeepfake": false,
  "confidenceScore": 0.1205,
  "analysisDetails": "[ML+Heuristic] No significant deepfake artifacts detected.",
  "features": { ... },
  "createdAt": "2026-05-15T10:31:00.000Z"
}
```

**Cached Response (duplicate file):**
```json
{
  "id": 43,
  "isDuplicate": true,
  "message": "Loaded from cache",
  ...
}
```

**Error Responses:**

| Status | Body |
|--------|------|
| 400 | `{ "error": "File is required" }` |
| 413 | `{ "error": "File too large", "details": "Max allowed is 20MB. Received 25.3MB." }` |
| 429 | `{ "error": "Rate limit exceeded." }` |

---

### `POST /scan-image`

Upload an image for deepfake detection via the Cloudflare Worker → NVIDIA NIM pipeline.

**Auth:** ✅ Required

**Rate Limit:** 60 requests/minute per user

**Max File Size:** 5 MB

**Request:** `multipart/form-data`

| Field | Type | Required |
|-------|------|----------|
| `file` | File (JPEG/PNG/WebP) | ✅ |

**Response (200):**
```json
{
  "id": 44,
  "userId": "user_2abc123",
  "audioUrl": "image_scan:photo.jpg",
  "scanType": "image",
  "isDeepfake": true,
  "confidenceScore": 0.92,
  "analysisDetails": "Detected blending artifacts around facial boundaries...",
  "fileHash": "a1b2c3d4...",
  "features": {},
  "createdAt": "2026-05-15T10:32:00.000Z"
}
```

**Confidence Calibration:** Results with `confidenceScore < 0.6` default to `isDeepfake: false` (low-confidence safety rule).

**Error Responses:**

| Status | Body |
|--------|------|
| 413 | `{ "error": "File too large", "details": "Max allowed is 5MB." }` |
| 502 | `{ "error": "Analysis Unavailable", "details": "Upstream returned HTTP 503." }` |
| 504 | `{ "error": "Scan Timeout", "details": "AI provider did not respond in 50s." }` |

---

### `GET /scans`

Retrieve the authenticated user's scan history (ordered by most recent).

**Auth:** ✅ Required

**Response (200):**
```json
[
  {
    "id": 43,
    "userId": "user_2abc123",
    "audioUrl": "uploaded://recording.wav",
    "scanType": "audio",
    "isDeepfake": false,
    "confidenceScore": 0.1205,
    "analysisDetails": "...",
    "fileHash": "abc123...",
    "createdAt": "2026-05-15T10:31:00.000Z",
    "feedback": null
  }
]
```

---

### `GET /audio/:id`

Stream the base64-decoded audio blob for playback. Only accessible by the scan owner.

**Auth:** ✅ Required

**Response (200):** Binary audio data (`Content-Type: audio/wav`)

**Error Responses:**

| Status | Body |
|--------|------|
| 403 | `{ "error": "Forbidden" }` |
| 404 | `Not found` |

---

### `POST /scans/:id/feedback`

Submit user feedback on a scan result. Max 500 characters.

**Auth:** ✅ Required

**Request Body:**
```json
{ "feedback": "This was correctly identified as a deepfake." }
```

**Response (200):**
```json
{ "success": true }
```

**Error Responses:**

| Status | Body |
|--------|------|
| 400 | `{ "error": "Feedback must be a string" }` |
| 400 | `{ "error": "Feedback cannot be empty" }` |
| 400 | `{ "error": "Feedback exceeds 500 characters" }` |
| 403 | `{ "error": "Forbidden" }` |
| 404 | `{ "error": "Scan not found" }` |

---

### `POST /api/speaker/enroll`

Enroll a speaker by uploading a reference audio sample. Extracts a 192-dim ECAPA-TDNN embedding.

**Auth:** ✅ Required

**Rate Limit:** 20 requests/minute per user

**Max File Size:** 10 MB

**Request:** `multipart/form-data`

| Field | Type | Required |
|-------|------|----------|
| `file` | File (WAV/MP3) | ✅ |
| `name` | String | ✅ |

**Response (200):**
```json
{ "success": true, "message": "Speaker enrolled successfully" }
```

---

### `POST /api/speaker/verify`

Verify an unknown voice against the user's enrolled speakers using cosine similarity.

**Auth:** ✅ Required

**Rate Limit:** 20 requests/minute per user

**Max File Size:** 10 MB

**Request:** `multipart/form-data`

| Field | Type | Required |
|-------|------|----------|
| `file` | File (WAV/MP3) | ✅ |

**Response (200 — Match Found):**
```json
{
  "isMatch": true,
  "name": "Gautam Kumar",
  "score": 0.8912,
  "details": "Matched with Gautam Kumar (89.1%)"
}
```

**Response (200 — No Match):**
```json
{
  "isMatch": false,
  "name": "Unknown",
  "score": 0.4231,
  "details": "No matching speaker found."
}
```

**Response (200 — No Enrolled Speakers):**
```json
{
  "success": true,
  "isMatch": false,
  "details": "No enrolled speakers found. Please enroll a reference voice first."
}
```

---

## AI Engine Endpoints (FastAPI — Port 8000)

### `GET /`

Engine health check.

**Response:**
```json
{ "status": "AI Engine Running", "framework": "FastAPI" }
```

---

### `POST /scan`

Analyze audio from a URL. Downloads the file, runs Wav2Vec2 + heuristic analysis.

**Request Body:**
```json
{
  "audioUrl": "https://example.com/audio.mp3",
  "userId": "user_2abc123"
}
```

**Response:** `ScanResult` (same schema as API gateway response)

---

### `POST /scan-upload`

Analyze an uploaded audio file.

**Request:** `multipart/form-data`

| Field | Type | Required |
|-------|------|----------|
| `file` | UploadFile | ✅ |
| `userId` | String (Form) | ✅ |

**Response:** `ScanResult`

---

### `POST /analyze`

Analyze video/audio with moviepy fallback for video-to-audio extraction.

**Request:** `multipart/form-data`

| Field | Type | Required |
|-------|------|----------|
| `file` | UploadFile (audio or video) | ✅ |

**Response:** `ScanResult`

---

### `POST /embed`

Generate a 192-dimensional ECAPA-TDNN speaker embedding vector.

**Request:** `multipart/form-data`

| Field | Type | Required |
|-------|------|----------|
| `file` | UploadFile (WAV/MP3) | ✅ |

**Response:**
```json
{
  "embedding": [0.0123, -0.0456, 0.0789, ... ]  // 192 floats
}
```

---

## Rate Limiting Summary

| Endpoint Group | Limit | Window |
|----------------|-------|--------|
| `/scan` | 10 req | 60 seconds |
| `/scan-upload`, `/scan-image` | 60 req | 60 seconds |
| `/api/speaker/*` | 20 req | 60 seconds |

Rate limit state is stored in-memory (per-process). Expired entries are garbage-collected every 5 minutes.

---

## CORS Configuration

Allowed origins (strict whitelist — no wildcard):

```
http://localhost:5173
https://satark-deepfake.vercel.app
```

Additional origins can be added via the `ALLOWED_ORIGINS` environment variable (comma-separated).
