from fastapi import FastAPI
from schemas import AudioUpload, ScanResult
from detect import analyze_audio

app = FastAPI(title="Satark-AI Engine")

@app.get("/")
def home():
    return {"status": "AI Engine Running", "framework": "FastAPI"}

import traceback
from fastapi import HTTPException

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
from fastapi import UploadFile, File, Form
from detect import analyze_file_path, TEMP_DIR
from fastapi.responses import JSONResponse

@app.post("/scan-upload", response_model=ScanResult)
async def scan_upload(
    file: UploadFile = File(...), 
    userId: str = Form(...)
):
    # Save uploaded file
    file_path = os.path.join(TEMP_DIR, f"upload_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        # Analyze
        result = analyze_file_path(file_path, userId, source=f"uploaded://{file.filename}")
        return result
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

@app.post("/analyze")
async def analyze_audio_endpoint(file: UploadFile = File(...)):
    try:
        # Check if file is video
        is_video = file.content_type.startswith("video/")
        
        # Save uploaded file temporarily
        temp_filename = f"temp_{file.filename}"
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        audio_path = temp_filename

        # If video, extract audio
        if is_video:
            print(f"Processing video: {temp_filename}")
            try:
                from moviepy.editor import VideoFileClip
                video = VideoFileClip(temp_filename)
                audio_path = f"temp_audio_{file.filename}.wav"
                video.audio.write_audiofile(audio_path, logger=None)
                video.close()
            except Exception as e:
                return JSONResponse(content={"error": f"Video processing failed: {str(e)}"}, status_code=500)

        # Analyze Audio
        result = analyze_audio(audio_path)
        
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
        # Save temp file
        temp_filename = f"temp_embed_{file.filename}"
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
