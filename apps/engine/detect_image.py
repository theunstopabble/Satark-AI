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

IMAGE_MODEL_NAME = "prithivMLmods/Deep-Fake-Detector-Model"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

logger.info(f"Loading image deepfake model: {IMAGE_MODEL_NAME} on {DEVICE}")
_image_processor = AutoImageProcessor.from_pretrained(IMAGE_MODEL_NAME)
_image_model = AutoModelForImageClassification.from_pretrained(IMAGE_MODEL_NAME)
_image_model.to(DEVICE)
_image_model.eval()
logger.info("Image model loaded successfully.")


def analyze_image_bytes(image_bytes: bytes, user_id: str, filename: str) -> dict:
    """Analyze image bytes for deepfake detection."""
    import io
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    
    inputs = _image_processor(images=image, return_tensors="pt")
    inputs = {k: v.to(DEVICE) for k, v in inputs.items()}
    
    with torch.no_grad():
        outputs = _image_model(**inputs)
        probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
    
    # Model labels: 0=Real, 1=Fake (verify from model card)
    prob_real = probs.item()
    prob_fake = probs.item()[1]
    is_deepfake = prob_fake > 0.5
    confidence = round(max(prob_real, prob_fake) * 100, 2)
    
    # Image metadata
    width, height = image.size
    mode = image.mode
    
    analysis_details = (
        f"Deepfake probability: {prob_fake:.2%} | "
        f"Real probability: {prob_real:.2%} | "
        f"Model: {IMAGE_MODEL_NAME} | "
        f"Resolution: {width}x{height} | "
        f"Device: {DEVICE}"
    )
    
    return {
        "id": str(uuid.uuid4()),
        "userId": user_id,
        "audioUrl": f"image_upload:{filename}",
        "isDeepfake": is_deepfake,
        "confidenceScore": confidence,
        "analysisDetails": analysis_details,
        "features": {
            "zcr": 0.0,
            "rolloff": 0.0,
            "mfccmean": 0.0,
            "silenceratio": 0.0,
            "duration": 0.0,
            "mfccplot": [],
            "segments": [],
            "imageWidth": width,
            "imageHeight": height,
            "probReal": round(prob_real * 100, 2),
            "probFake": round(prob_fake * 100, 2),
        },
        "createdAt": datetime.now()
    }


def is_image_file(filename: str) -> bool:
    """Check if filename is an image."""
    IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'}
    ext = os.path.splitext(filename).lower()[1]
    return ext in IMAGE_EXTENSIONS
