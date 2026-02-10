import numpy as np
from scipy.io.wavfile import write
import os

output_path = "../api/test_audio.wav" # Save to API folder for test script

rate = 22050
t = np.linspace(0, 3, rate * 3) # 3 seconds
data = np.sin(2 * np.pi * 440 * t) # 440Hz sine wave
scaled = np.int16(data * 32767)

# Ensure directory exists? output is relative to apps/engine
# API is ../api

try:
    write(output_path, rate, scaled)
    print(f"Generated {output_path}")
except Exception as e:
    print(e)
