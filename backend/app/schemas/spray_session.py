from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class SpraySessionRequest(BaseModel):
    crop: str
    pest: str
    product_name: str
    formulation: str
    label_rate: float
    label_units: str
    treated_area_hectares: float
    tank_capacity_liters: float
    application_method: str
    environmental_conditions: Optional[dict] = None
    weather_data: Optional[dict] = None

class SpraySessionValidationResult(BaseModel):
    is_valid: bool
    validation_errors: List[str]
    warnings: List[str]
    recommendations: List[str]
    required_fields: List[str]

class SpraySessionResponse(BaseModel):
    session_id: str
    status: str
    created_at: str
    updated_at: str
    validated: bool
    parameters: dict

class SpraySessionValidationResponse(BaseModel):
    status: str
    session_id: str
    validation_result: SpraySessionValidationResult
    timestamp: str