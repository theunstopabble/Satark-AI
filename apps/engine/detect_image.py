import os
import uuid
import io
import logging
import torch
import numpy as np
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForImageClassification
from datetime import datetime

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TEMP_DIR = "/tmp/satark_images"
os.makedirs(TEMP_DIR, exist_ok=True)

# ✅ FIX: Force CPU mode to prevent OOM/GPU crashes on free Render servers
USE_CUDA = os.getenv("FORCE_GPU", "false").lower() == "true"
DEVICE = "cuda" if (USE_CUDA and torch.cuda.is_available()) else "cpu"

logger.info(f"Initializing Image Deepfake Detector...")
logger.info(f"Target Device: {DEVICE}")

IMAGE_MODEL_NAME = "prithivMLmods/Deep-Fake-Detector-Model"
_IMAGE_REGISTRY: dict = {}

def _load_image_model():
    """Load model lazily to save startup resources."""
    if "processor" not in _IMAGE_REGISTRY:
        try:
            logger.info(f"Downloading/loading model: {IMAGE_MODEL_NAME}...")
            # Use local files if cached, otherwise download
            processor = AutoImageProcessor.from_pretrained(IMAGE_MODEL_NAME)
            model = AutoModelForImageClassification.from_pretrained(IMAGE_MODEL_NAME)
            
            model.eval()
            if DEVICE == "cuda":
                model.cuda()
                
            _IMAGE_REGISTRY["processor"] = processor
            _IMAGE_REGISTRY["model"] = model
            logger.info("Image model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise RuntimeError(f"Model initialization failed: {e}")
    return _IMAGE_REGISTRY["processor"], _IMAGE_REGISTRY["model"]

def analyze_image_bytes(image_bytes: bytes, user_id: str, filename: str) -> dict:
    """Analyze image bytes for deepfake detection."""
    
    # Lazy load model
    try:
        image_processor, image_model = _load_image_model()
    except RuntimeError as e:
        logger.critical("Critical failure loading model:", e)
        raise RuntimeError(f"Analysis Failed: {e}")

    try:
        # Open Image
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        # Preprocess
        inputs = image_processor(images=image, return_tensors="pt")
        
        # Move to device
        if DEVICE == "cuda":
            inputs = {k: v.cuda() for k, v in inputs.items()}
        
        # Inference
        with torch.no_grad():
            outputs = image_model(**inputs)
            
        # Post-process
        probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
        
        # Fix: Correctly index probabilities for binary classification
        prob_real = probs[0][0].item()
        prob_fake = probs[0][1].item()
        
        is_deepfake = prob_fake > 0.5
        
        width, height = image.size
        
        result = {
            "id": str(uuid.uuid4()),
            "userId": user_id,
            "audioUrl": f"image_scan:{filename}",
            "isDeepfake": is_deepfake,
            "confidenceScore": round(max(prob_real, prob_fake) * 100, 2),
            "analysisDetails": (
                f"Real Probability: {prob_real:.2%} | Fake Probability: {prob_fake:.2%} | "
                f"Resolution: {width}x{height}"
            ),
            "features": {
                "zcr": 0.0, "rolloff": 0.0, "mfcc_mean": 0.0,
                "silence_ratio": 0.0, "duration": 0.0, "mfcc_plot": [],
                "segments": [], 
                "imageWidth": width, 
                "imageHeight": height,
                "probReal": round(prob_real * 100, 2),
                "probFake": round(prob_fake * 100, 2)
            },
            "createdAt": datetime.now().isoformat()
        }
        
        logger.info(f"Scan completed. Result: {'FAKE' if is_deepfake else 'REAL'}")
        return result

    except Exception as e:
        logger.error(f"Inference Error: {e}")
        raise RuntimeError(f"Image analysis failed: {e}")

def is_image_file(filename: str) -> bool:
    IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'}
    ext = os.path.splitext(filename)[1].lower()
    return ext in IMAGE_EXTENSIONS