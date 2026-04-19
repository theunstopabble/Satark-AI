# apps/engine/detect_image.py
import os
import uuid
import logging
import torch
import numpy as np
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForImageClassification
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TEMP_DIR = "/tmp/satark_images"
os.makedirs(TEMP_DIR, exist_ok=True)

# Configuration: Always use CPU on limited render/free-tier environments
USE_CUDA = os.getenv("FORCE_GPU", "false").lower() == "true"
DEVICE = "cuda" if (USE_CUDA and torch.cuda.is_available()) else "cpu"
logger.info(f"Initializing Image Model on Device: {DEVICE}")

IMAGE_MODEL_NAME = "prithivMLmods/Deep-Fake-Detector-Model"
_IMAGE_REGISTRY: dict = {}

def _load_image_model():
    """Load image model lazily with retry mechanism."""
    if "processor" in _IMAGE_REGISTRY:
        return _IMAGE_REGISTRY["processor"], _IMAGE_REGISTRY["model"]
    
    try:
        logger.info(f"Loading deepfake image model...")
        processor = AutoImageProcessor.from_pretrained(IMAGE_MODEL_NAME)
        model = AutoModelForImageClassification.from_pretrained(IMAGE_MODEL_NAME)
        
        model.eval()
        if DEVICE == "cuda":
            model.cuda()
            
        _IMAGE_REGISTRY["processor"] = processor
        _IMAGE_REGISTRY["model"] = model
        logger.info("Model loaded successfully.")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise RuntimeError(f"Model initialization failed: {e}")

def analyze_image_bytes(image_bytes: bytes, user_id: str, filename: str) -> dict:
    """Analyze image bytes for deepfake detection."""
    import io
    
    # Lazy load
    try:
        image_processor, image_model = _load_image_model()
    except RuntimeError as e:
        raise RuntimeError(f"Model Load Error: {e}")

    try:
        # Open image
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        # Preprocess
        inputs = image_processor(images=image, return_tensors="pt")
        
        # Move inputs to device
        if DEVICE == "cuda":
            inputs = {k: v.cuda() for k, v in inputs.items()}
        
        # Inference
        with torch.no_grad():
            outputs = image_model(**inputs)
        
        # Post-process
        probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
        
        # Calculate scores
        prob_real = probs[0][0].item()
        prob_fake = probs[0][1].item()
        is_deepfake = prob_fake > 0.5
        
        width, height = image.size
        
        return {
            "id": str(uuid.uuid4()),
            "userId": user_id,
            "audioUrl": f"image_scan:{filename}",
            "isDeepfake": is_deepfake,
            "confidenceScore": round(max(prob_real, prob_fake) * 100, 2),
            "analysisDetails": (
                f"Real: {prob_real:.2%} | Fake: {prob_fake:.2%} | "
                f"Resolution: {width}x{height}"
            ),
            "features": {
                "zcr": 0.0, "rolloff": 0.0, "mfcc_mean": 0.0,
                "silence_ratio": 0.0, "duration": 0.0, "mfcc_plot": [], 
                "segments": [], "imageWidth": width, "imageHeight": height,
                "probReal": round(prob_real * 100, 2), 
                "probFake": round(prob_fake * 100, 2)
            },
            "createdAt": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Inference error: {e}")
        raise RuntimeError(f"Inference failed: {e}")

def is_image_file(filename: str) -> bool:
    IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'}
    ext = os.path.splitext(filename)[1].lower()
    return ext in IMAGE_EXTENSIONS