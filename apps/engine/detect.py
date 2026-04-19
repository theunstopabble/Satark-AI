import os
import uuid
import httpx
import librosa
import numpy as np
import soundfile as sf
import asyncio
import logging
from datetime import datetime
from schemas import AudioUpload, ScanResult

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TEMP_DIR = "/tmp/satark_audio"
os.makedirs(TEMP_DIR, exist_ok=True)


MODEL_NAME = "garystafford/wav2vec2-deepfake-voice-detector"
import torch
DEVICE = "cpu"  # Always use CPU for inference to avoid VRAM issues

_registry: dict = {}



# Singleton loader for Wav2Vec2 model and feature extractor
def _load_audio_model():
    if "_feature_extractor" in _registry and "_model" in _registry:
        return _registry["_feature_extractor"], _registry["_model"]
    try:
        logger.info(f"Loading deepfake detection model: {MODEL_NAME} on {DEVICE}")
        from transformers import AutoFeatureExtractor, Wav2Vec2ForSequenceClassification
        _registry["_feature_extractor"] = AutoFeatureExtractor.from_pretrained(MODEL_NAME)
        model = Wav2Vec2ForSequenceClassification.from_pretrained(MODEL_NAME)
        model.to(torch.device("cpu"))  # Force CPU for inference
        model.eval()
        _registry["_model"] = model
        logger.info("Model loaded successfully.")
    except Exception as e:
        logger.warning(f"Failed to initialize Wav2Vec2 model: {e}")
        # Do not crash server, just leave registry empty
    return _registry.get("_feature_extractor"), _registry.get("_model")


def __getattr__(name: str):
    if name in ("_feature_extractor", "_model"):
        _load_audio_model()
        return _registry[name]
    raise AttributeError(f"module 'detect' has no attribute '{name}'")


# ✅ REMOVED: _load_audio_model() eager call — OOM fix!
# Model will load lazily on first request only


async def download_audio(url: str) -> str:
    ext = os.path.splitext(url)[1].split("?")[0]
    if not ext or len(ext) > 5:
        ext = ".mp3"
    filename = f"{uuid.uuid4()}{ext}"
    path = os.path.join(TEMP_DIR, filename)
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    async with httpx.AsyncClient() as client:
        response = await client.get(url, follow_redirects=True, headers=headers)
        if response.status_code != 200:
            raise Exception(f"Failed to download audio: {response.status_code}")
        with open(path, "wb") as f:
            f.write(response.content)
    return path


def analyze_segments(y, sr, chunk_duration=0.5):
    segments = []
    chunk_samples = int(chunk_duration * sr)
    total_samples = len(y)
    for start in range(0, total_samples, chunk_samples):
        end = min(start + chunk_samples, total_samples)
        if (end - start) < chunk_samples / 2:
            continue
        chunk = y[start:end]
        try:
            zcr = np.mean(librosa.feature.zero_crossing_rate(chunk))
            rolloff = np.mean(librosa.feature.spectral_rolloff(y=chunk, sr=sr))
            score = 0.0
            if zcr > 0.08: score += 0.4
            if rolloff < 3000: score += 0.4
            segments.append({
                "start": float(start / sr),
                "end": float(end / sr),
                "score": min(score, 1.0)
            })
        except Exception as e:
            logger.warning("Segment chunk analysis failed: %s", e)
    return segments


def extract_features(path: str):
    try:
        y, sr = librosa.load(path, sr=22050)
        zcr_val = np.mean(librosa.feature.zero_crossing_rate(y))
        rolloff_val = np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr))
        mfcc_val = librosa.feature.mfcc(y=y, sr=sr)
        mfcc_mean_val = np.mean(mfcc_val)
        mfcc_plot = np.mean(mfcc_val, axis=0).tolist()
        non_silent_intervals = librosa.effects.split(y, top_db=20)
        non_silent_duration = sum(end - start for start, end in non_silent_intervals) / sr
        total_duration = librosa.get_duration(y=y, sr=sr)
        silence_ratio = 1 - (non_silent_duration / total_duration) if total_duration > 0 else 0
        segments = analyze_segments(y, sr)
        return {
            "zcr": float(zcr_val),
            "rolloff": float(rolloff_val),
            "mfcc_mean": float(mfcc_mean_val),
            "silence_ratio": float(silence_ratio),
            "duration": float(total_duration),
            "mfcc_plot": mfcc_plot,
            "segments": segments
        }
    except Exception as e:
        logger.error("Error extracting features: %s", e)
        return None


def analyze_file_path(path: str, user_id: str, source: str) -> ScanResult:
    try:
        features = extract_features(path)
        is_deepfake = False
        confidence = 0.0
        details = "Audio appears natural."
        if features:
            # Multi-metric composite scoring
            silence = features.get("silence_ratio", 0.0)
            zcr = features.get("zcr", 0.0)
            rolloff = features.get("rolloff", 0.0)

            # Normalize each metric to [0, 1] risk
            # Silence Ratio: high silence = more suspicious (risk rises above 0.25)
            silence_risk = min(max((silence - 0.25) / 0.5, 0.0), 1.0)
            # ZCR: risk rises above 0.12 (empirical, >0.25 is very suspicious)
            zcr_risk = min(max((zcr - 0.12) / 0.13, 0.0), 1.0)
            # Rolloff: risk rises below 2500Hz (low rolloff = more suspicious)
            rolloff_risk = min(max((2500 - rolloff) / 1500, 0.0), 1.0)

            # Weighted composite (tune weights as needed)
            composite = 0.4 * silence_risk + 0.3 * zcr_risk + 0.3 * rolloff_risk
            confidence = min(max(composite, 0.0), 1.0)
            is_deepfake = confidence > 0.5

            reasons = []
            if silence_risk > 0.5:
                reasons.append(f"High silence ratio ({silence:.2f})")
            if zcr_risk > 0.5:
                reasons.append(f"Anomalous zero crossing rate ({zcr:.3f})")
            if rolloff_risk > 0.5:
                reasons.append(f"Low spectral rolloff ({rolloff:.1f} Hz)")
            if is_deepfake:
                details = f"Deepfake risk detected: {'; '.join(reasons) if reasons else 'Composite risk score high'}"
            else:
                details = "No significant deepfake artifacts detected."

        return ScanResult(
            id=str(uuid.uuid4()),
            userId=user_id,
            audioUrl=source,
            isDeepfake=is_deepfake,
            confidenceScore=confidence,
            analysisDetails=details,
            features=features,
            createdAt=datetime.now()
        )
    finally:
        pass


async def analyze_audio(data: AudioUpload) -> ScanResult:
    path = await download_audio(data.audioUrl)
    try:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, analyze_file_path, path, data.userId, data.audioUrl)
    finally:
        if os.path.exists(path):
            os.remove(path)
