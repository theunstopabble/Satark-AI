import os
import uuid
import httpx
import librosa
import numpy as np
import soundfile as sf
from datetime import datetime
from schemas import AudioUpload, ScanResult

TEMP_DIR = "temp_audio"
os.makedirs(TEMP_DIR, exist_ok=True)

async def download_audio(url: str) -> str:
    """Downloads audio from URL and saves to a temp file."""
    # Try to get extension from URL, default to .mp3
    ext = os.path.splitext(url)[1].split("?")[0]
    if not ext or len(ext) > 5:
        ext = ".mp3"
        
    filename = f"{uuid.uuid4()}{ext}"
    path = os.path.join(TEMP_DIR, filename)
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    async with httpx.AsyncClient(verify=False) as client:
        response = await client.get(url, follow_redirects=True, headers=headers)
        if response.status_code != 200:
            raise Exception(f"Failed to download audio: {response.status_code}")
        
        with open(path, "wb") as f:
            f.write(response.content)
            
    return path

def extract_features(path: str):
    """Extracts basic audio features using Librosa."""
    try:
        # Optimize: resample to 22050Hz (standard) to speed up processing
        y, sr = librosa.load(path, sr=22050)
        
        zcr_val = np.mean(librosa.feature.zero_crossing_rate(y))
        rolloff_val = np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr))
        mfcc_val = librosa.feature.mfcc(y=y, sr=sr)
        mfcc_mean_val = np.mean(mfcc_val)
        
        # Create a simple 1D array for plotting (mean of MFCCs over time)
        # This will be used for the "Feature Graph" in the UI
        mfcc_plot = np.mean(mfcc_val, axis=0).tolist()
        
        non_silent_intervals = librosa.effects.split(y, top_db=20)
        non_silent_duration = sum([end - start for start, end in non_silent_intervals]) / sr
        total_duration = librosa.get_duration(y=y, sr=sr)
        silence_ratio = 1 - (non_silent_duration / total_duration) if total_duration > 0 else 0

        return {
            "zcr": float(zcr_val),
            "rolloff": float(rolloff_val),
            "mfcc_mean": float(mfcc_mean_val),
            "silence_ratio": float(silence_ratio),
            "duration": float(total_duration),
            "mfcc_plot": mfcc_plot # List of floats
        }
    except Exception as e:
        print(f"Error extracting features: {e}")
        return None

def analyze_file_path(path: str, user_id: str, source: str) -> ScanResult:
    """Analyzes audio file at given path and returns ScanResult."""
    try:
        features = extract_features(path)
        
        is_deepfake = False
        confidence = 0.0
        details = "Audio appears natural."

        if features:
            score = 0
            reasons = []

            if features["silence_ratio"] < 0.05:
                score += 30
                reasons.append("Unnaturally continuous speech pattern")

            if features["zcr"] > 0.15: 
                score += 20
                reasons.append("High frequency noise anomalies")
                
            if features["rolloff"] < 2000: 
                score += 10
                reasons.append("suspiciously low frequency bandwidth")

            total_score = min(score + 20, 99) 
            
            if total_score > 50:
                is_deepfake = True
                confidence = total_score / 100.0
                details = f"Deepfake suspected: {'; '.join(reasons)}"
            else:
                is_deepfake = False
                confidence = (100 - total_score) / 100.0
                details = "No significant artifacts detected."

        return ScanResult(
            id=str(uuid.uuid4()),
            userId=user_id,
            audioUrl=source, # URL or "uploaded file"
            isDeepfake=is_deepfake,
            confidenceScore=confidence,
            analysisDetails=details,
            features=features,
            createdAt=datetime.now()
        )
    finally:
        pass # Caller handles cleanup if needed

async def analyze_audio(data: AudioUpload) -> ScanResult:
    path = await download_audio(data.audioUrl)
    try:
        return analyze_file_path(path, data.userId, data.audioUrl)
    finally:
        if os.path.exists(path):
            os.remove(path)
