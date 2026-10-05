import logging
import shutil
import os
import asyncio
import uuid
import traceback
import uvicorn

logger = logging.getLogger(__name__)

from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form, Header, Depends
from fastapi.responses import JSONResponse
from schemas import AudioUpload, ScanResult
from contextlib import asynccontextmanager

ENGINE_API_KEY = os.environ.get("ENGINE_API_KEY")


async def verify_internal_api_key(x_api_key: str = Header(default=None)):
    """Reject requests that do not present the shared internal API key.

    This prevents the engine from being called directly, bypassing the
    gateway's Clerk authentication, when it is reachable on the network.
    """
    if not ENGINE_API_KEY or x_api_key != ENGINE_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Engine started. Lazy loading enabled.")
    yield
    logger.info("Engine shutting down.")

app = FastAPI(title="Satark-AI Engine", lifespan=lifespan)


@app.get("/health")
@app.get("/")
def health():
    return {"status": "ok", "service": "Satark-AI Engine Startup Check"}


@app.post("/scan", response_model=ScanResult, dependencies=[Depends(verify_internal_api_key)])
async def scan_audio(data: AudioUpload):
    from detect import analyze_audio
    try:
        result = await analyze_audio(data)
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/scan-upload", response_model=ScanResult, dependencies=[Depends(verify_internal_api_key)])
async def scan_upload(
    file: UploadFile = File(...),
    userId: str = Form(...),
):
    from detect import analyze_file_path, TEMP_DIR
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


@app.post("/analyze", dependencies=[Depends(verify_internal_api_key)])
async def analyze_audio_endpoint(file: UploadFile = File(...)):
    temp_filename = None
    extracted_audio_path = None
    is_video = False

    try:
        from detect import analyze_file_path, TEMP_DIR

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

        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        audio_path = temp_filename

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

        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None,
            analyze_file_path,
            audio_path,
            "anonymous",
            f"upload://{safe_filename}",
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if temp_filename and os.path.exists(temp_filename):
            os.remove(temp_filename)
        if is_video and extracted_audio_path and os.path.exists(extracted_audio_path):
            os.remove(extracted_audio_path)


@app.post("/embed", dependencies=[Depends(verify_internal_api_key)])
async def embed_audio_endpoint(file: UploadFile = File(...)):
    from speaker import get_embedding
    from detect import TEMP_DIR

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
