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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
