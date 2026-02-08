from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AudioUpload(BaseModel):
    audioUrl: str
    userId: str
    fileName: Optional[str] = None

class ScanResult(BaseModel):
    id: str
    userId: str
    audioUrl: str
    isDeepfake: bool
    confidenceScore: float
    analysisDetails: Optional[str] = None
    features: Optional[dict] = None
    createdAt: datetime
