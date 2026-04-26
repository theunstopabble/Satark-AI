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


# FIX: @app.on_event("startup") is deprecated in FastAPI 0.109+
# Use lifespan context manager instead
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup/Shutdown lifecycle.
    Warmup is disabled intentionally to save RAM (OOM Prevention).
    Models will load lazily on the first actual request.
    """
    logger.info("Engine started. Lazy loading enabled.")
    yield
    logger.info("Engine shutting down.")

app = FastAPI(title="Satark-AI Engine", lifespan=lifespan)


@app.get("/")
def home():
    return {"status": "AI Engine Running", "framework": "FastAPI"}


@app.post("/scan", response_model=ScanResult)
async def scan_audio(data: AudioUpload):
    """Endpoint to scan audio provided via URL."""
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
    """Endpoint to scan uploaded audio/video files."""
    safe_filename = (
        f"{uuid.uuid4().hex}_{os.path.basename(file.filename)}"
        if file.filename
        else f"{uuid.uuid4().hex}.tmp"
    )
    file_path = os.path.join(TEMP_DIR, safe_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None, analyze_file_path, file_path, userId, f"uploaded://{safe_filename}"
        )
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)


@app.post("/analyze")
async def analyze_audio_endpoint(file: UploadFile = File(...)):
    """
    Specialized endpoint for complex video/audio analysis involving moviepy fallback.
    """
    # FIX: Initialize variables BEFORE try block to avoid NameError in finally
    temp_filename = None
    extracted_audio_path = None
    is_video = False

    try:
        is_video = (
            file.content_type.startswith("video/")
            if getattr(file, "content_type", None)
            else False
        )
        safe_filename = (
            f"{uuid.uuid4().hex}_{os.path.basename(file.filename)}"
            if getattr(file, "filename", None)
            else f"{uuid.uuid4().hex}.tmp"
        )
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
                raise HTTPException(
                    status_code=500,
                    detail="moviepy is required for video processing.",
                )

            try:
                video = VideoFileClip(temp_filename)
                extracted_audio_path = os.path.join(
                    TEMP_DIR, f"{uuid.uuid4().hex}.wav"
                )
                video.audio.write_audiofile(extracted_audio_path, logger=None)
                video.close()
                audio_path = extracted_audio_path
            except Exception as video_err:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to extract audio from video: {str(video_err)}",
                )

        # ╔════════════════════════════════════════════════════════════╗
        # ║  CRITICAL FIX:                                           ║
        # ║  OLD CODE: await loop.run_in_executor(None, analyze_audio, audio_path) ║
        # ║                                                          ║
        # ║  PROBLEM 1: analyze_audio() expects AudioUpload object,  ║
        # ║             not a string path → TypeError on every call  ║
        # ║  PROBLEM 2: analyze_audio() is async, but run_in_executor║
        # ║             cannot run coroutines → silent failure        ║
        # ║                                                          ║
        # ║  FIX: Use analyze_file_path() which takes a string path  ║
        # ║       and is a sync function (works with executor)        ║
        # ╚════════════════════════════════════════════════════════════╝
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None,
            analyze_file_path,
            audio_path,
            "anonymous",  # userId — /analyze endpoint doesn't accept userId
            f"upload://{safe_filename}",
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # FIX: All variables are guaranteed to be defined (initialized above)
        if temp_filename and os.path.exists(temp_filename):
            os.remove(temp_filename)
        if is_video and extracted_audio_path and os.path.exists(extracted_audio_path):
            os.remove(extracted_audio_path)


@app.post("/embed")
async def embed_audio_endpoint(file: UploadFile = File(...)):
    """Generates voice embedding vector for Speaker Identity verification."""
    from speaker import get_embedding

    temp_filename = None
    try:
        safe_filename = (
            f"{uuid.uuid4().hex}_{os.path.basename(file.filename)}"
            if getattr(file, "filename", None)
            else f"{uuid.uuid4().hex}.tmp"
        )
        temp_filename = os.path.join(TEMP_DIR, safe_filename)

        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        vector = get_embedding(temp_filename)

        return {"embedding": vector}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_filename and os.path.exists(temp_filename):
            os.remove(temp_filename)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
