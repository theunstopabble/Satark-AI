import logging
import shutil
import os
import asyncio
import uuid
import traceback

logger = logging.getLogger(__name__)

from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import JSONResponse
from schemas import AudioUpload, ScanResult
from detect import analyze_audio, analyze_file_path, TEMP_DIR


app = FastAPI(title="Satark-AI Engine")


@app.on_event("startup")
async def warmup_model():
    # ✅ Warmup disabled — models load on first request to avoid OOM
    logger.info("Engine started. Models will load on first request.")


@app.get("/")
def home():
    return {"status": "AI Engine Running", "framework": "FastAPI"}


@app.post("/scan", response_model=ScanResult)
async def scan_audio(data: AudioUpload):
    try:
        result = await analyze_audio(data)
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/scan-upload", response_model=ScanResult)
async def scan_upload(file: UploadFile = File(...), userId: str = Form(...)):
    safe_filename = f"{uuid.uuid4().hex}_{os.path.basename(file.filename)}" if file.filename else f"{uuid.uuid4().hex}.tmp"
    file_path = os.path.join(TEMP_DIR, safe_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    try:
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None, analyze_file_path, file_path, userId, f"uploaded://{safe_filename}"
        )
        return result
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)


@app.post("/analyze")
async def analyze_audio_endpoint(file: UploadFile = File(...)):
    try:
        is_video = file.content_type.startswith("video/") if getattr(file, "content_type", None) else False
        safe_filename = f"{uuid.uuid4().hex}_{os.path.basename(file.filename)}" if getattr(file, "filename", None) else f"{uuid.uuid4().hex}.tmp"
        temp_filename = os.path.join(TEMP_DIR, safe_filename)
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        audio_path = temp_filename
        if is_video:
            try:
                from moviepy.editor import VideoFileClip
            except ImportError:
                raise HTTPException(status_code=500, detail="moviepy is required for video processing.")
            video = VideoFileClip(temp_filename)
            audio_path = os.path.join(TEMP_DIR, f"{uuid.uuid4().hex}.wav")
            video.audio.write_audiofile(audio_path, logger=None)
            video.close()
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(None, analyze_audio, audio_path)
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
        if is_video and os.path.exists(audio_path):
            os.remove(audio_path)
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/embed")
async def embed_audio_endpoint(file: UploadFile = File(...)):
    from speaker import get_embedding
    try:
        safe_filename = f"{uuid.uuid4().hex}_{os.path.basename(file.filename)}" if getattr(file, "filename", None) else f"{uuid.uuid4().hex}.tmp"
        temp_filename = os.path.join(TEMP_DIR, safe_filename)
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        vector = get_embedding(temp_filename)
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
        return {"embedding": vector}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/scan-image")
async def scan_image_upload(request: Request):
    pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
