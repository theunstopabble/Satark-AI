import os
import sys

# Add current dir to sys.path
sys.path.append(os.getcwd())

print("Script starting...")

# Check for audio file
audio_path = "../api/test_audio.wav"
if not os.path.exists(audio_path):
    print(f"File not found: {audio_path}")
    # Generate one
    import numpy as np
    from scipy.io.wavfile import write
    audio_path = "debug_audio.wav"
    write(audio_path, 22050, np.int16(np.sin(np.linspace(0, 3, 22050*3)) * 32767))
    print(f"Generated {audio_path}")

try:
    print("Importing speaker module...")
    from speaker import get_embedding
    
    print(f"Generating embedding for {audio_path}...")
    vector = get_embedding(audio_path)
    print("SUCCESS!")
    print(f"Vector length: {len(vector)}")
    print(f"First few values: {vector[:5]}")

except Exception:
    import traceback
    traceback.print_exc()
