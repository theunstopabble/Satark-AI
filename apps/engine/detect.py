import os
import torch
import uuid
import httpx
import librosa
import numpy as np
import soundfile as sf
import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Tuple, Optional

from schemas import AudioUpload, ScanResult

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Directories
TEMP_DIR = "/tmp/satark_audio"
os.makedirs(TEMP_DIR, exist_ok=True)

# Configuration
MODEL_NAME = "garystafford/wav2vec2-deepfake-voice-detector"
DEVICE = "cpu"

# Singleton Pattern for PyTorch Model
_registry: dict = {}


def _load_audio_model():
    """Loads Wav2Vec2 model if not already in memory."""
    if "_feature_extractor" in _registry and "_model" in _registry:
        return _registry["_feature_extractor"], _registry["_model"]

    try:
        logger.info(f"Loading deepfake detection model: {MODEL_NAME} on {DEVICE}")
        from transformers import AutoFeatureExtractor, Wav2Vec2ForSequenceClassification

        _registry["_feature_extractor"] = AutoFeatureExtractor.from_pretrained(
            MODEL_NAME
        )
        model = Wav2Vec2ForSequenceClassification.from_pretrained(MODEL_NAME)
        model.to(torch.device("cpu"))
        model.eval()
        _registry["_model"] = model

        logger.info("Model loaded successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Wav2Vec2 model: {e}")

    return _registry.get("_feature_extractor"), _registry.get("_model")


# ╔══════════════════════════════════════════════════════════════╗
# ║  NEW: Wav2Vec2 Model-Based Prediction                       ║
# ║                                                              ║
# ║  OLD CODE: _load_audio_model() was defined but NEVER CALLED. ║
# ║  Analysis was purely heuristic (ZCR, rolloff, silence).      ║
# ║  The actual ML model was completely ignored.                  ║
# ║                                                              ║
# ║  FIX: Run audio through Wav2Vec2 model for real prediction,  ║
# ║       then combine with heuristic features for composite.    ║
# ╚══════════════════════════════════════════════════════════════╝
def _model_predict(path: str) -> Optional[Tuple[bool, float]]:
    """Runs Wav2Vec2 model inference on audio file."""
    feature_extractor, model = _load_audio_model()

    if feature_extractor is None or model is None:
        logger.warning("Model not available, falling back to heuristics only.")
        return None

    try:
        # Load audio at 16kHz (Wav2Vec2 expected sample rate)
        y, sr = librosa.load(path, sr=16000)

        # Limit to 30 seconds to prevent OOM on long files
        max_samples = 16000 * 30
        if len(y) > max_samples:
            y = y[:max_samples]

        # Run through feature extractor + model
        inputs = feature_extractor(
            y, sampling_rate=16000, return_tensors="pt", padding=True
        )
        inputs = {k: v.to(torch.device("cpu")) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=-1)
            # Assuming label 1 = deepfake, label 0 = real
            deepfake_prob = float(probs[0][1])

        is_deepfake = deepfake_prob > 0.5
        return is_deepfake, deepfake_prob

    except Exception as e:
        logger.error("Model prediction failed: %s", e)
        return None


async def download_audio(url: str) -> str:
    """Downloads audio file from URL to temp storage."""
    ext = os.path.splitext(url)[1].split("?")[0]
    if not ext or len(ext) > 5:
        ext = ".mp3"

    filename = f"{uuid.uuid4()}{ext}"
    path = os.path.join(TEMP_DIR, filename)

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(url, follow_redirects=True, headers=headers)
        if response.status_code != 200:
            raise Exception(f"Failed to download audio: {response.status_code}")
        with open(path, "wb") as f:
            f.write(response.content)
    return path


def extract_features(path: str) -> Optional[dict]:
    """Extracts spectral and temporal features from audio file."""
    try:
        y, sr = librosa.load(path, sr=22050)

        zcr_val = float(np.mean(librosa.feature.zero_crossing_rate(y)))
        rolloff_val = float(np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr)))

        mfcc_val = librosa.feature.mfcc(y=y, sr=sr)
        mfcc_mean_val = float(np.mean(mfcc_val))
        mfcc_plot = np.mean(mfcc_val, axis=0).tolist()

        non_silent_intervals = librosa.effects.split(y, top_db=20)
        non_silent_duration = (
            sum(end - start for start, end in non_silent_intervals) / sr
        )
        total_duration = librosa.get_duration(y=y, sr=sr)
        silence_ratio = (
            1 - (non_silent_duration / total_duration)
            if total_duration > 0
            else 0
        )

        segments = analyze_segments(y, sr)

        return {
            "zcr": zcr_val,
            "rolloff": rolloff_val,
            "mfcc_mean": mfcc_mean_val,
            "silence_ratio": silence_ratio,
            "duration": total_duration,
            "mfcc_plot": mfcc_plot,
            "segments": segments,
        }
    except Exception as e:
        logger.error("Error extracting features: %s", e)
        return None


def analyze_segments(
    y: np.ndarray, sr: int, chunk_duration: float = 0.5
) -> List[Dict]:
    """Breaks audio into chunks and scores each for anomalies."""
    segments = []
    chunk_samples = int(chunk_duration * sr)
    total_samples = len(y)

    for start in range(0, total_samples, chunk_samples):
        end = min(start + chunk_samples, total_samples)
        if (end - start) < chunk_samples / 2:
            continue

        chunk = y[start:end]
        try:
            zcr = float(np.mean(librosa.feature.zero_crossing_rate(chunk)))
            rolloff = float(
                np.mean(librosa.feature.spectral_rolloff(y=chunk, sr=sr))
            )

            score = 0.0
            if zcr > 0.08:
                score += 0.4
            if rolloff < 3000:
                score += 0.4

            segments.append(
                {
                    "start": float(start / sr),
                    "end": float(end / sr),
                    "score": min(score, 1.0),
                }
            )
        except Exception as e:
            logger.warning("Segment chunk analysis failed: %s", e)
    return segments


def analyze_file_path(path: str, user_id: str, source: str) -> ScanResult:
    """
    Performs comprehensive deepfake analysis using:
    1. Wav2Vec2 ML model prediction (primary)
    2. Heuristic feature analysis (secondary/composite)
    3. Combined scoring for final verdict
    """
    try:
        features = extract_features(path)

        # ── Step 1: ML Model Prediction ──
        model_result = _model_predict(path)
        model_is_deepfake = None
        model_confidence = None
        if model_result:
            model_is_deepfake, model_confidence = model_result
            logger.info(
                f"ML Model: deepfake={model_is_deepfake}, confidence={model_confidence:.3f}"
            )

        # ── Step 2: Heuristic Analysis ──
        heuristic_confidence = 0.0
        is_deepfake = False
        confidence = 0.0
        details = "Audio appears natural."

        if features:
            silence = features.get("silence_ratio", 0.0)
            zcr = features.get("zcr", 0.0)
            rolloff = features.get("rolloff", 0.0)

            silence_risk = min(max((silence - 0.25) / 0.5, 0.0), 1.0)
            zcr_risk = min(max((zcr - 0.12) / 0.13, 0.0), 1.0)
            rolloff_risk = min(max((2500 - rolloff) / 1500, 0.0), 1.0)

            heuristic_confidence = (
                0.4 * silence_risk + 0.3 * zcr_risk + 0.3 * rolloff_risk
            )

        # ── Step 3: Combine ML + Heuristic ──
        if model_confidence is not None:
            # ML model available: weight 70% ML, 30% heuristic
            confidence = 0.7 * model_confidence + 0.3 * heuristic_confidence
            is_deepfake = confidence > 0.5
            source_label = "ML+Heuristic"
        else:
            # No ML model: 100% heuristic
            confidence = heuristic_confidence
            is_deepfake = confidence > 0.5
            source_label = "Heuristic only"

        # Build details string
        reasons = []
        if features:
            silence = features.get("silence_ratio", 0.0)
            zcr = features.get("zcr", 0.0)
            rolloff = features.get("rolloff", 0.0)

            if min(max((silence - 0.25) / 0.5, 0.0), 1.0) > 0.5:
                reasons.append(f"High silence ratio ({silence:.2f})")
            if min(max((zcr - 0.12) / 0.13, 0.0), 1.0) > 0.5:
                reasons.append(f"Anomalous zero crossing rate ({zcr:.3f})")
            if min(max((2500 - rolloff) / 1500, 0.0), 1.0) > 0.5:
                reasons.append(f"Low spectral rolloff ({rolloff:.1f} Hz)")

        if model_is_deepfake:
            reasons.insert(0, "Wav2Vec2 model flagged as deepfake")

        if is_deepfake:
            details = (
                f"[{source_label}] Deepfake risk detected: "
                f"{'; '.join(reasons) if reasons else 'Composite risk score high'}"
            )
        else:
            details = (
                f"[{source_label}] No significant deepfake artifacts detected."
            )

        return ScanResult(
            id=str(uuid.uuid4()),
            userId=user_id,
            audioUrl=source,
            isDeepfake=is_deepfake,
            confidenceScore=round(confidence, 4),
            analysisDetails=details,
            features=features,
            createdAt=datetime.now(),
        )
    except Exception as e:
        logger.error("Analysis failed: %s", e)
        return ScanResult(
            id=str(uuid.uuid4()),
            userId=user_id,
            audioUrl=source,
            isDeepfake=False,
            confidenceScore=0.0,
            analysisDetails=f"Analysis Error: {str(e)}",
            features={},
            createdAt=datetime.now(),
        )


async def analyze_audio(data: AudioUpload) -> ScanResult:
    """Main entry point for URL based scanning."""
    path = await download_audio(data.audioUrl)
    try:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None, analyze_file_path, path, data.userId, data.audioUrl
        )
    finally:
        if os.path.exists(path):
            os.remove(path)
