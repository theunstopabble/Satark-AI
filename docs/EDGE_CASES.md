# Edge Cases & Error Handling

**Version:** 2.0.0 | **Last Updated:** May 2026

Comprehensive documentation of error handling strategies, graceful degradation patterns, and edge case management across the Satark-AI platform.

---

## Lazy Model Loading (OOM Prevention)

**Problem:** Loading Wav2Vec2 (~400MB) and ECAPA-TDNN (~100MB) at startup causes OOM crashes on free-tier Render instances (512MB RAM).

**Solution:** Singleton pattern with lazy initialization — models load on first request, not at startup.

```python
# detect.py — Singleton registry
_registry: dict = {}

def _load_audio_model():
    if "_model" in _registry:
        return _registry["_feature_extractor"], _registry["_model"]
    # Load only when first needed
    _registry["_model"] = Wav2Vec2ForSequenceClassification.from_pretrained(MODEL_NAME)
    ...
```

```python
# speaker.py — Global singleton
CLASSIFIER = None

def load_classifier():
    global CLASSIFIER
    if CLASSIFIER is None:
        CLASSIFIER = EncoderClassifier.from_hparams(...)
```

**Trade-off:** First request after cold start takes 30–60s. Mitigated by the keep-alive cron job.

---

## Thread Executor (Non-Blocking Inference)

**Problem:** PyTorch inference is CPU-bound and blocks the FastAPI async event loop, causing all concurrent requests to hang.

**Solution:** All inference runs in `loop.run_in_executor()`:

```python
loop = asyncio.get_running_loop()
result = await loop.run_in_executor(
    None,  # Default ThreadPoolExecutor
    analyze_file_path, path, userId, source
)
```

**Applied to:**
- `/scan` (URL-based audio analysis)
- `/scan-upload` (file upload analysis)
- `/analyze` (video/audio with moviepy)

---

## Timeout Handling

### Cloudflare Worker → NVIDIA NIM (30s)

```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

const response = await fetch(NVIDIA_URL, { signal: controller.signal });
clearTimeout(timeoutId);
```

Returns `504 Gateway Timeout` if NVIDIA NIM doesn't respond within 30 seconds.

### API Gateway → Cloudflare Worker (50s)

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 50000);

const extRes = await fetch(apiUrl, { signal: controller.signal });
clearTimeout(timeoutId);
```

The API gateway allows 50s to account for NVIDIA NIM cold starts. Returns:
```json
{
  "error": "Scan Timeout",
  "details": "AI provider did not respond in 50s. Try again — first request may need model cold-start."
}
```

### Engine Audio Download (20s)

```python
async with httpx.AsyncClient(timeout=20.0) as client:
    response = await client.get(url, follow_redirects=True)
```

---

## CORS Whitelisting

**Strategy:** Strict origin whitelist — no wildcard `*`.

```typescript
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "...")
  .split(",").map(o => o.trim());

origin: (origin) => {
  if (!origin || allowedOrigins.includes(origin)) {
    return origin || "*";
  }
  return undefined; // REJECT unknown origins
}
```

**Allowed origins:**
- `https://satark-deepfake.vercel.app` (production)
- `http://localhost:5173` (development)

**Cloudflare Worker** has its own independent origin whitelist enforced at the edge.

---

## File Size Enforcement

### Double-Layer Enforcement (Image Proxy)

| Layer | Check | Limit |
|-------|-------|-------|
| Pre-read | `content-length` header | 5 MB |
| Post-read | `arrayBuffer.byteLength` | 5 MB |

This prevents:
1. Clients lying about `content-length`
2. Chunked transfers bypassing header checks

### API Gateway Size Limits

| Endpoint | Max Size | Enforcement |
|----------|----------|-------------|
| `/scan-upload` | 20 MB | `file.size` check before `arrayBuffer()` |
| `/scan-image` | 5 MB | `file.size` check before `arrayBuffer()` |
| `/api/speaker/enroll` | 10 MB | `file.size` check before forwarding |
| `/api/speaker/verify` | 10 MB | `file.size` check before forwarding |

**Response format (413):**
```json
{
  "error": "File too large",
  "details": "Max allowed is 20MB. Received 25.3MB."
}
```

---

## SHA-256 Deduplication

**Problem:** Users may upload the same file multiple times, wasting compute.

**Solution:** SHA-256 hash computed before processing, checked against DB cache.

```typescript
const arrayBuffer = await file.arrayBuffer();
const hashArray = Array.from(
  new Uint8Array(await crypto.subtle.digest("SHA-256", arrayBuffer))
);
const fileHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

// Cache lookup (SCOPED to userId — prevents cross-user data leakage)
const existingScan = await db.query.scans.findFirst({
  where: and(eq(scans.fileHash, fileHash), eq(scans.userId, userId))
});
```

**Critical:** Cache lookups filter by BOTH `fileHash` AND `userId` to prevent one user from seeing another user's scan results.

---

## Model Fallback (Heuristic-Only Mode)

**Problem:** Wav2Vec2 model may fail to load (network issues, OOM, corrupted download).

**Solution:** Graceful fallback to heuristic-only analysis:

```python
def _model_predict(path: str) -> Optional[Tuple[bool, float]]:
    feature_extractor, model = _load_audio_model()
    if feature_extractor is None or model is None:
        logger.warning("Model not available, falling back to heuristics only.")
        return None  # Triggers heuristic-only path
```

**Scoring modes:**
- **ML + Heuristic** (normal): 70% model weight + 30% heuristic weight
- **Heuristic only** (fallback): 100% heuristic (ZCR, spectral rolloff, silence ratio)

---

## Confidence Calibration (Image Scans)

**Problem:** LLM vision models (Llama 3.2-90B) produce unreliable confidence scores below 0.6.

**Solution:** Low-confidence results default to safe (not deepfake):

```typescript
const CONFIDENCE_THRESHOLD = 0.6;
const isDeepfake = rawConfidence >= CONFIDENCE_THRESHOLD ? rawIsDeepfake : false;
```

Logged as a warning for monitoring:
```
[scan-image] Low confidence (0.42) for user user_2abc. Raw deepfake=true, defaulted to SAFE.
```

---

## Temp File Cleanup

**Problem:** Uploaded files accumulate on disk if not cleaned up after processing.

**Solution:** All temp files are deleted in `finally` blocks — guaranteed cleanup even on exceptions:

```python
try:
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    result = await loop.run_in_executor(None, analyze_file_path, file_path, ...)
    return result
finally:
    if os.path.exists(file_path):
        os.remove(file_path)
```

**Applied to:** `/scan-upload`, `/analyze`, `/embed`, and `analyze_audio` (URL download).

**File naming:** UUID-prefixed to prevent collisions: `{uuid4}_{original_filename}`

---

## Video-to-Audio Extraction (moviepy Fallback)

**Problem:** Users may upload MP4 video files for audio deepfake analysis.

**Solution:** The `/analyze` endpoint detects video content types and extracts audio:

```python
if file.content_type.startswith("video/"):
    from moviepy.editor import VideoFileClip
    video = VideoFileClip(temp_filename)
    video.audio.write_audiofile(extracted_audio_path, logger=None)
    video.close()
    audio_path = extracted_audio_path
```

**Cleanup:** Both the original video file and extracted audio are deleted in `finally`.

---

## Rate Limiting

**Implementation:** In-memory `Map<userId, { count, resetAt }>` with periodic garbage collection.

```typescript
// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap.entries()) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60_000);
```

**Limits:**

| Scope | Limit | Window |
|-------|-------|--------|
| `/scan` | 10 | 60s |
| `/scan-upload`, `/scan-image` | 60 | 60s |
| `/api/speaker/*` | 20 | 60s |

**Response (429):**
```json
{ "error": "Rate limit exceeded." }
```

**Limitation:** In-memory state is per-process. If scaled horizontally, rate limits reset per instance. Production fix: Redis-backed rate limiter.

---

## Audio Length Limiting (OOM Prevention)

**Problem:** Very long audio files (>30s) can cause OOM during Wav2Vec2 inference.

**Solution:** Audio is truncated to 30 seconds before model inference:

```python
max_samples = 16000 * 30  # 30 seconds at 16kHz
if len(y) > max_samples:
    y = y[:max_samples]
```

Feature extraction (librosa) processes the full file since it's less memory-intensive.

---

## SpeechBrain HuggingFace Compatibility Patches

**Problem:** SpeechBrain's ECAPA-TDNN model has compatibility issues:
1. `custom.py` file returns 404 on HuggingFace
2. `use_auth_token` parameter deprecated in newer `huggingface_hub`
3. Windows symlink issues in SpeechBrain's fetching strategy

**Solutions (speaker.py):**

```python
# Patch 1: Return dummy_custom.py when HF returns 404
def _patched_hf_download(*args, **kwargs):
    try:
        return _original_hf_download(*args, **kwargs)
    except Exception as e:
        if "custom.py" in filename and "404" in str(e):
            return os.path.abspath("dummy_custom.py")
        raise e

# Patch 2: Convert deprecated use_auth_token to token
if "use_auth_token" in kwargs:
    kwargs["token"] = kwargs.pop("use_auth_token")

# Patch 3: Always copy files instead of symlinks (Windows fix)
def _patched_link_strategy(src, dst, strategy):
    shutil.copyfile(src, dst)
    return pathlib.Path(dst)
```

---

## Database Connection Resilience

```typescript
const pool = new Pool({
  max: 20,                      // Bounded pool size
  idleTimeoutMillis: 30000,     // Reclaim idle connections
  connectionTimeoutMillis: 5000 // Fail fast, don't hang
});

// Prevent unhandled crashes from pool errors
pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err);
});
```

**Missing DATABASE_URL:** App starts but logs a fatal warning. DB queries fail with clear errors rather than crashing at startup.

---

## Upstream Response Parsing (Image Scans)

**Problem:** NVIDIA NIM or Cloudflare Worker may return non-JSON responses (HTML error pages, gateway errors).

**Solution:** Safe JSON parsing with fallback:

```typescript
let data: any;
const responseText = await extRes.text();
try {
  data = JSON.parse(responseText);
} catch (parseErr) {
  return c.json({
    error: "Unexpected API response",
    details: "Upstream did not return valid JSON."
  }, 502);
}
```

The Cloudflare Worker also strips markdown code fences from NVIDIA's response before JSON parsing.

---

## Authentication Edge Cases

| Scenario | Handling |
|----------|----------|
| Missing JWT token | 401 with `"Valid session required"` |
| Expired JWT | Clerk middleware rejects → 401 |
| Valid JWT but no userId claim | 401 (authMiddleware checks `auth?.userId`) |
| User accesses another user's audio | 403 Forbidden |
| User submits feedback on another user's scan | 403 Forbidden |

---

## Summary Table

| Edge Case | Strategy | Fallback |
|-----------|----------|----------|
| Model OOM at startup | Lazy loading | App starts without models |
| Model fails to load | Heuristic-only mode | Reduced accuracy, still functional |
| Long audio (>30s) | Truncate to 30s | Partial analysis |
| Duplicate file upload | SHA-256 cache hit | Return cached result |
| NVIDIA NIM timeout | AbortController (30s/50s) | 504 with retry message |
| Non-JSON upstream response | Safe parse + 502 | Clear error to client |
| Low confidence image scan | Default to safe | `isDeepfake: false` |
| Video file uploaded | moviepy extraction | Audio-only analysis |
| Cross-user data access | userId scoping on all queries | 403 Forbidden |
| Rate limit exceeded | In-memory counter | 429 with message |
| File too large | Pre-read size check | 413 before memory allocation |
| DB connection failure | Pool error handler | Graceful error, no crash |
