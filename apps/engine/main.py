
import logging
logger = logging.getLogger(__name__)

from fastapi import FastAPI
from schemas import AudioUpload, ScanResult
from detect import analyze_audio
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
import asyncio
from detect_image import analyze_image_bytes, is_image_file
import traceback

app = FastAPI(title="Satark-AI Engine")

@app.on_event("startup")
async def warmup_model():
    """Pre-warm the wav2vec2 model to avoid cold start on first request."""
    import logging
    logger = logging.getLogger(__name__)
    logger.info("Warming up deepfake detection model...")
    try:
        import detect  # This triggers full module-level model loading
        import numpy as np
        import torch

        dummy_audio = np.zeros(16000, dtype=np.float32)
        inputs = detect._feature_extractor(
            dummy_audio,
            sampling_rate=16000,
            return_tensors="pt",
            padding=True
        )
        inputs = {k: v.to(detect.DEVICE) for k, v in inputs.items()}
        with torch.no_grad():
            detect._model(**inputs)
        logger.info("Model warmup complete. Ready for requests.")
    except Exception as e:
        logger.warning(f"Warmup failed (non-critical): {e}")

@app.get("/")
def home():
    return {"status": "AI Engine Running", "framework": "FastAPI"}

@app.post("/scan", response_model=ScanResult)
async def scan_audio(data: AudioUpload):
    try:
        result = await analyze_audio(data)
        return result
    except Exception as e:
        print(f"Error processing scan: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

import shutil
import os
import asyncio
import uuid
from fastapi import UploadFile, File, Form
from detect import analyze_file_path, TEMP_DIR
from fastapi.responses import JSONResponse

@app.post("/scan-upload", response_model=ScanResult)
async def scan_upload(
    file: UploadFile = File(...), 
    userId: str = Form(...)
):
    # Save uploaded file safely using UUID
    safe_filename = f"{uuid.uuid4().hex}_{os.path.basename(file.filename)}" if file.filename else f"{uuid.uuid4().hex}.tmp"
    file_path = os.path.join(TEMP_DIR, safe_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        # Analyze without blocking event loop
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(None, analyze_file_path, file_path, userId, f"uploaded://{safe_filename}")
        return result
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

@app.post("/analyze")
async def analyze_audio_endpoint(file: UploadFile = File(...)):
    try:
        # Check if file is video
        is_video = file.content_type.startswith("video/") if getattr(file, "content_type", None) else False
        
        # Save uploaded file temporarily with UUID
        safe_filename = f"{uuid.uuid4().hex}_{os.path.basename(file.filename)}" if getattr(file, "filename", None) else f"{uuid.uuid4().hex}.tmp"
        temp_filename = os.path.join(TEMP_DIR, safe_filename)
        
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        audio_path = temp_filename

        # If video, extract audio
        if is_video:
            print(f"Processing video: {temp_filename}")
            try:
                try:
                    from moviepy.editor import VideoFileClip
                except ImportError:
                    raise HTTPException(status_code=500, detail="moviepy is required for video processing. Please install moviepy.")
                video = VideoFileClip(temp_filename)
                audio_path = os.path.join(TEMP_DIR, f"{uuid.uuid4().hex}.wav")
                video.audio.write_audiofile(audio_path, logger=None)
                video.close()
            except Exception as e:
                if os.path.exists(temp_filename): os.remove(temp_filename)
                return JSONResponse(content={"error": f"Video processing failed: {str(e)}"}, status_code=500)

        # Analyze Audio without blocking event loop
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(None, analyze_audio, audio_path)
        
        # Cleanup
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
        if is_video and os.path.exists(audio_path):
            os.remove(audio_path)

        return result

    except Exception as e:
        print(f"Error processing analysis: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

from speaker import get_embedding

@app.post("/embed")
async def embed_audio_endpoint(file: UploadFile = File(...)):
    """Generates speaker embedding vector."""
    try:
        # Save temp file securely
        safe_filename = f"{uuid.uuid4().hex}_{os.path.basename(file.filename)}" if getattr(file, "filename", None) else f"{uuid.uuid4().hex}.tmp"
        temp_filename = os.path.join(TEMP_DIR, safe_filename)
        
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get embedding
        vector = get_embedding(temp_filename)
        
        # Cleanup
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
            
        return {"embedding": vector}
    except Exception as e:
        print(f"Embedding error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/scan-image", response_model=ScanResult)
async def scan_image(data: UploadFile = File(...)):
    try:
        # Check if file is image
        if not is_image_file(data):
            raise HTTPException(status_code=400, detail="File is not an image")
        
        # Save uploaded file temporarily with UUID
        safe_filename = f"{uuid.uuid4().hex}_{os.path.basename(data.filename)}" if getattr(data, "filename", None) else f"{uuid.uuid4().hex}.tmp"
        temp_filename = os.path.join(TEMP_DIR, safe_filename)
        
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(data.file, buffer)

        # Analyze image
        result = await analyze_image_bytes(temp_filename)
        
        # Cleanup
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
            
        return result
    except Exception as e:
        print(f"Error processing scan: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/scan-image")
async def scan_image_upload(request: Request):
    """Deepfake detection for uploaded images."""
    try:
        form = await request.form()
        file = form.get("file")
        user_id = form.get("userId", "guest")

        if not file or not hasattr(file, 'filename'):
            raise HTTPException(status_code=400, detail="Image file is required")

        filename = file.filename
        if not is_image_file(filename):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file. Supported: .jpg, .jpeg, .png, .webp, .gif, .bmp"
            )

        image_bytes = await file.read()
        if len(image_bytes) > 50 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image too large. Max 50MB.")

        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None, analyze_image_bytes, image_bytes, user_id, filename
        )
        return JSONResponse(content={
            **result,
            "createdAt": result["createdAt"].isoformat()
        })
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image scan error: {e}")
        raise HTTPException(status_code=500, detail=f"Image analysis failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
