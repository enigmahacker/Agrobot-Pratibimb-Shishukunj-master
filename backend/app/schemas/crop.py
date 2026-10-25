from pydantic import BaseModel
from typing import Optional, List

class CropInfo(BaseModel):
    name: str
    scientific_name: Optional[str] = None
    growth_stage: str
    planting_date: Optional[str] = None
    harvest_date: Optional[str] = None
    region: Optional[str] = None
    climate_zone: Optional[str] = None

class CropDisease(BaseModel):
    name: str
    scientific_name: Optional[str] = None
    symptoms: List[str]
    severity: str
    treatment: List[str]

class CropPest(BaseModel):
    name: str
    scientific_name: Optional[str] = None
    damage_type: str
    life_cycle: str
    control_methods: List[str]