import os
import shutil
import pathlib
import logging
import torch
import torchaudio

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Monkey patch for torchaudio < 2.1 compatibility if needed by speechbrain
if not hasattr(torchaudio, "list_audio_backends"):
    torchaudio.list_audio_backends = lambda: ["soundfile"]  # Mock backend

import soundfile as sf
import huggingface_hub
from speechbrain.inference.speaker import EncoderClassifier

# Patch HuggingFace Download
_original_hf_download = huggingface_hub.hf_hub_download

def _patched_hf_download(*args, **kwargs):
    if "use_auth_token" in kwargs:
        if kwargs["use_auth_token"]:
             kwargs["token"] = kwargs.pop("use_auth_token")
        else:
             del kwargs["use_auth_token"]
    
    try:
        return _original_hf_download(*args, **kwargs)
    except Exception as e:
        # If custom.py is missing, return dummy
        filename = kwargs.get("filename") or (args[1] if len(args) > 1 else "")
        if "custom.py" in filename and "404" in str(e):
            logger.warning("custom.py not found on HF, using dummy.")
            return os.path.abspath("dummy_custom.py")
        raise e

huggingface_hub.hf_hub_download = _patched_hf_download

# Patch SpeechBrain Fetching
import speechbrain.utils.fetching

def _patched_link_strategy(src, dst, strategy):
    # Always copy, ignore strategy (Fixes Windows Symlink issues)
    if os.path.exists(dst):
        os.remove(dst)
    shutil.copyfile(src, dst)
    return pathlib.Path(dst)

speechbrain.utils.fetching.link_with_strategy = _patched_link_strategy

CLASSIFIER = None

def load_classifier():
    global CLASSIFIER
    if CLASSIFIER is None:
        logger.info("Loading Speaker Classifier (ECAPA-TDNN)...")
        # Ensure we don't redownload every time
        CLASSIFIER = EncoderClassifier.from_hparams(
            source="speechbrain/spkrec-ecapa-voxceleb",
            savedir="tmp_model"
        )

def get_embedding(wav_path):
    """Generates speaker embedding vector from audio file."""
    load_classifier()
    
    # Use soundfile directly to avoid torchaudio issues
    signal, fs = sf.read(wav_path)
    signal = torch.from_numpy(signal).float()
    
    # Handle optional channels (SpeechBrain expects mono or batch)
    if len(signal.shape) > 1:
        signal = signal[:, 0]

    # Generate embedding
    embeddings = CLASSIFIER.encode_batch(signal)
    # Shape is [batch, 1, 192]
    return embeddings[0,0].tolist()
