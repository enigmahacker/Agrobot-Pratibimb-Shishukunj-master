from pydantic import BaseModel
from typing import Optional, List

class PesticideProduct(BaseModel):
    name: str
    brand: str
    formulation: str
    active_ingredients: List[str]
    product_code: str
    manufacturer: str
    registration_number: str
    safety_data: Optional[dict] = None

class LabelInformation(BaseModel):
    application_rate: float
    rate_units: str
    application_method: str
    timing: str
    crop_sensitivity: List[str]
    preharvest_interval_days: Optional[int] = None
    buffer_zones: Optional[float] = None
    restrictions: List[str]
    target_pests: List[str]

class PesticideCalculation(BaseModel):
    product_name: str
    application_rate_per_unit_area: float
    application_rate_units: str
    treated_area_hectares: float
    required_product_quantity: float
    required_product_units: str
    tank_capacity_liters: float
    estimated_delivery_volume: float
    delivery_units: str
    application_method: str
    calculated_at: str

class PesticideDoseResult(BaseModel):
    status: str
    input_values: dict
    calculation_method: str
    calculated_quantity: Optional[float] = None
    units: Optional[str] = None
    product_label_source: str
    assumptions: List[str]
    missing_information: List[str]
    warnings: List[str]
    verification_required: bool

class PesticideCalculationRequest(BaseModel):
    crop: Optional[str] = "Field Crop"
    pest: Optional[str] = "General"
    product_name: str
    formulation: Optional[str] = "Standard"
    label_rate: float
    label_units: str
    treated_area_hectares: float
    tank_capacity_liters: float = 100.0
    application_method: Optional[str] = "rover_spray_boom"

class PesticideCalculationResponse(BaseModel):
    status: str
    calculation: PesticideDoseResult
    timestamp: str