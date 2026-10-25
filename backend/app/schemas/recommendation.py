from pydantic import BaseModel
from typing import Optional, List

class AgronomyRecommendationRequest(BaseModel):
    crop: str
    growth_stage: str
    target_pest: Optional[str] = None
    product_name: Optional[str] = None
    area_hectares: Optional[float] = 1.0
    tank_capacity_liters: Optional[float] = 100.0
    environmental_conditions: Optional[dict] = None

class AgronomyRecommendationResponse(BaseModel):
    status: str
    recommendation: str
    confidence_score: float
    explanation: str
    supporting_data: dict
    timestamp: str

class RecommendationResult(BaseModel):
    crop: str
    pest: Optional[str] = None
    product_recommendation: str
    application_rate: float
    rate_units: str
    safety_considerations: List[str]
    environmental_impact: str
    confidence: float