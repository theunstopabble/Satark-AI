import os
import uuid
import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Tuple, Optional

from schemas import AudioUpload, ScanResult

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TEMP_DIR = "/tmp/satark_audio"
os.makedirs(TEMP_DIR, exist_ok=True)

MODEL_NAME = "garystafford/wav2vec2-deepfake-voice-detector"
DEVICE = "cpu"

_registry: dict = {}


def _load_audio_model():
    import torch
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


def _model_predict(path: str) -> Optional[Tuple[bool, float]]:
    import torch
    import librosa
    import numpy as np

    feature_extractor, model = _load_audio_model()

    if feature_extractor is None or model is None:
        logger.warning("Model not available, falling back to heuristics only.")
        return None

    try:
        y, sr = librosa.load(path, sr=16000)

        max_samples = 16000 * 30
        if len(y) > max_samples:
            y = y[:max_samples]

        inputs = feature_extractor(
            y, sampling_rate=16000, return_tensors="pt", padding=True
        )
        inputs = {k: v.to(torch.device("cpu")) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=-1)
            deepfake_prob = float(probs[0][1])

        is_deepfake = deepfake_prob > 0.5
        return is_deepfake, deepfake_prob

    except Exception as e:
        logger.error("Model prediction failed: %s", e)
        return None


async def download_audio(url: str) -> str:
    import httpx
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
    import librosa
    import numpy as np

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
    y, sr: int, chunk_duration: float = 0.5
) -> List[Dict]:
    import librosa
    import numpy as np

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
    try:
        features = extract_features(path)

        model_result = _model_predict(path)
        model_is_deepfake = None
        model_confidence = None
        if model_result:
            model_is_deepfake, model_confidence = model_result
            logger.info(
                f"ML Model: deepfake={model_is_deepfake}, confidence={model_confidence:.3f}"
            )

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

        if model_confidence is not None:
            confidence = 0.7 * model_confidence + 0.3 * heuristic_confidence
            is_deepfake = confidence > 0.5
            source_label = "ML+Heuristic"
        else:
            confidence = heuristic_confidence
            is_deepfake = confidence > 0.5
            source_label = "Heuristic only"

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
    path = await download_audio(data.audioUrl)
    try:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None, analyze_file_path, path, data.userId, data.audioUrl
        )
    finally:
        if os.path.exists(path):
            os.remove(path)
