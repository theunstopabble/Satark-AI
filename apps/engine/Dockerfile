FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for librosa (audio processing)
RUN apt-get update && apt-get install -y \
    libsndfile1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .

# Install CPU-only torch and torchaudio first, then all other requirements
# (versions MUST match requirements.txt — pip will otherwise "upgrade" then downgrade)
RUN pip install --no-cache-dir torch==2.13.0 torchaudio==2.11.0 --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Copy ONLY application code (not corrupted files)
COPY main.py .
COPY detect.py .
COPY detect_image.py .
COPY schemas.py .
COPY speaker.py .
COPY dummy_custom.py .

EXPOSE 8000

# Create and switch to a non-root user for security
RUN useradd -m appuser
USER appuser

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
