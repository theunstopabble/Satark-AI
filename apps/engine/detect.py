import os
import uuid
import httpx
import librosa
import numpy as np
import soundfile as sf
import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Tuple, Optional

# Import Schema Types
from schemas import AudioUpload, ScanResult

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Directories
TEMP_DIR = "/tmp/satark_audio"
os.makedirs(TEMP_DIR, exist_ok=True)

# Configuration
MODEL_NAME = "garystafford/wav2vec2-deepfake-voice-detector"
DEVICE = "cpu"  # Optimized for Render Free Tier (No VRAM consumption)

# Singleton Pattern for PyTorch Model (Load Once)
_registry: dict = {}


# --- Model Loader (Lazily Loaded) ---
def _load_audio_model():
    """Loads Wav2Vec2 model if not already in memory."""
    if "_feature_extractor" in _registry and "_model" in _registry:
        return _registry["_feature_extractor"], _registry["_model"]
    
    try:
        logger.info(f"Loading deepfake detection model: {MODEL_NAME} on {DEVICE}")
        from transformers import AutoFeatureExtractor, Wav2Vec2ForSequenceClassification
        
        _registry["_feature_extractor"] = AutoFeatureExtractor.from_pretrained(MODEL_NAME)
        model = Wav2Vec2ForSequenceClassification.from_pretrained(MODEL_NAME)
        
        model.to(torch.device("cpu"))  # Ensure CPU placement
        model.eval()
        _registry["_model"] = model
        
        logger.info("Model loaded successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Wav2Vec2 model: {e}")
        # Don't crash app, allow fallback to heuristics
    return _registry.get("_feature_extractor"), _registry.get("_model")


# --- Network Downloading ---
async def download_audio(url: str) -> str:
    """Downloads audio file from URL to temp storage."""
    ext = os.path.splitext(url)[1].split("?")[0]
    if not ext or len(ext) > 5:
        ext = ".mp3"
        
    filename = f"{uuid.uuid4()}{ext}"
    path = os.path.join(TEMP_DIR, filename)
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(url, follow_redirects=True, headers=headers)
        if response.status_code != 200:
            raise Exception(f"Failed to download audio: {response.status_code}")
        with open(path, "wb") as f:
            f.write(response.content)
    return path


# --- Feature Extraction (Forensics) ---
def extract_features(path: str) -> Optional[dict]:
    """Extracts spectral and temporal features from audio file."""
    try:
        # Load audio with normalization
        y, sr = librosa.load(path, sr=22050)
        
        # Calculate Metrics
        zcr_val = float(np.mean(librosa.feature.zero_crossing_rate(y)))
        rolloff_val = float(np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr)))
        
        mfcc_val = librosa.feature.mfcc(y=y, sr=sr)
        mfcc_mean_val = float(np.mean(mfcc_val))
        mfcc_plot = np.mean(mfcc_val, axis=0).tolist()
        
        # Silence Detection
        non_silent_intervals = librosa.effects.split(y, top_db=20)
        non_silent_duration = sum(end - start for start, end in non_silent_intervals) / sr
        total_duration = librosa.get_duration(y=y, sr=sr)
        silence_ratio = 1 - (non_silent_duration / total_duration) if total_duration > 0 else 0
        
        # Segmentation Analysis
        segments = analyze_segments(y, sr)
        
        return {
            "zcr": zcr_val,
            "rolloff": rolloff_val,
            "mfcc_mean": mfcc_mean_val,
            "silence_ratio": silence_ratio,
            "duration": total_duration,
            "mfcc_plot": mfcc_plot,
            "segments": segments
        }
    except Exception as e:
        logger.error("Error extracting features: %s", e)
        return None


def analyze_segments(y: np.ndarray, sr: int, chunk_duration: float = 0.5) -> List[Dict]:
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
            rolloff = float(np.mean(librosa.feature.spectral_rolloff(y=chunk, sr=sr)))
            
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


# --- Core Analysis Logic ---
def analyze_file_path(path: str, user_id: str, source: str) -> ScanResult:
    """
    Performs comprehensive deepfake analysis using Composite Scoring.
    """
    try:
        features = extract_features(path)
        is_deepfake = False
        confidence = 0.0
        details = "Audio appears natural."
        
        if features:
            silence = features.get("silence_ratio", 0.0)
            zcr = features.get("zcr", 0.0)
            rolloff = features.get("rolloff", 0.0)

            # Normalize metrics to Risk Score [0.0 - 1.0]
            # Silence: High silence = Suspicious (> 0.25 rises risk)
            silence_risk = min(max((silence - 0.25) / 0.5, 0.0), 1.0)
            
            # ZCR: Abnormal rate = Suspicious (> 0.12 rises risk)
            zcr_risk = min(max((zcr - 0.12) / 0.13, 0.0), 1.0)
            
            # Rolloff: Low frequency limit = Digital Artifact (< 2500Hz rises risk)
            rolloff_risk = min(max((2500 - rolloff) / 1500, 0.0), 1.0)

            # Weighted Composite Formula
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
            createdAt=datetime.now()
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