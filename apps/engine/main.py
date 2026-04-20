import logging
import shutil
import os
import asyncio
import uuid
import traceback
import uvicorn

logger = logging.getLogger(__name__)

from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import JSONResponse
from schemas import AudioUpload, ScanResult
from detect import analyze_audio, analyze_file_path, TEMP_DIR

# Initialize Application
app = FastAPI(title="Satark-AI Engine")


@app.on_event("startup")
async def startup_event():
    """
    Startup Event:
    Warmup is disabled intentionally to save RAM (OOM Prevention).
    Models will load lazily on the first actual request.
    """
    logger.info("Engine started. Lazy loading enabled.")


@app.get("/")
def home():
    return {"status": "AI Engine Running", "framework": "FastAPI"}


@app.post("/scan", response_model=ScanResult)
async def scan_audio(data: AudioUpload):
    """
    Endpoint to scan audio provided via URL.
    """
    try:
        result = await analyze_audio(data)
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/scan-upload", response_model=ScanResult)
async def scan_upload(
    file: UploadFile = File(...),
    userId: str = Form(...),
):
    """
    Endpoint to scan uploaded audio/video files.
    """
    safe_filename = f"{uuid.uuid4().hex}_{os.path.basename(file.filename)}" if file.filename else f"{uuid.uuid4().hex}.tmp"
    file_path = os.path.join(TEMP_DIR, safe_filename)
    
    try:
        # 1. Save incoming file to memory-safe temp directory
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 2. Run Analysis in thread pool (prevents blocking async event loop)
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None, analyze_file_path, file_path, userId, f"uploaded://{safe_filename}"
        )
        return result
    finally:
        # 3. Cleanup: Always delete temp file after processing
        if os.path.exists(file_path):
            os.remove(file_path)


@app.post("/analyze")
async def analyze_audio_endpoint(file: UploadFile = File(...)):
    """
    Specialized endpoint for complex video/audio analysis involving moviepy fallback.
    """
    try:
        is_video = file.content_type.startswith("video/") if getattr(file, "content_type", None) else False
        safe_filename = f"{uuid.uuid4().hex}_{os.path.basename(file.filename)}" if getattr(file, "filename", None) else f"{uuid.uuid4().hex}.tmp"
        temp_filename = os.path.join(TEMP_DIR, safe_filename)
        
        # Save original file
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        audio_path = temp_filename
        
        # If Video, extract audio track
        if is_video:
            try:
                from moviepy.editor import VideoFileClip
            except ImportError:
                raise HTTPException(status_code=500, detail="moviepy is required for video processing.")
            
            try:
                video = VideoFileClip(temp_filename)
                extracted_audio_path = os.path.join(TEMP_DIR, f"{uuid.uuid4().hex}.wav")
                video.audio.write_audiofile(extracted_audio_path, logger=None)
                video.close()
                audio_path = extracted_audio_path
            except Exception as video_err:
                raise HTTPException(status_code=500, detail=f"Failed to extract audio from video: {str(video_err)}")

        # Run analysis
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(None, analyze_audio, audio_path)
        
        return result

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Cleanup resources
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
        if is_video and 'extracted_audio_path' in locals() and os.path.exists(audio_path):
            os.remove(audio_path)


@app.post("/embed")
async def embed_audio_endpoint(file: UploadFile = File(...)):
    """
    Generates voice embedding vector for Speaker Identity verification.
    """
    from speaker import get_embedding
    
    try:
        safe_filename = f"{uuid.uuid4().hex}_{os.path.basename(file.filename)}" if getattr(file, "filename", None) else f"{uuid.uuid4().hex}.tmp"
        temp_filename = os.path.join(TEMP_DIR, safe_filename)
        
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Generate Embedding
        vector = get_embedding(temp_filename)
        
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
            
        return {"embedding": vector}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    # Run in production mode (reload=False for better performance)
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)