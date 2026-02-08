import librosa
import numpy as np
import soundfile as sf
import os
import httpx
import asyncio

async def test_mp3():
    url = "https://www.w3schools.com/html/horse.mp3"
    filename = "test_horse.mp3"
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(url)
        with open(filename, "wb") as f:
            f.write(resp.content)
            
    try:
        y, sr = librosa.load(filename, sr=None)
        print(f"Loaded MP3: {len(y)} samples, sr={sr}")
        os.remove(filename)
        print("Test Passed")
    except Exception as e:
        print(f"Error loading MP3: {e}")

asyncio.run(test_mp3())
