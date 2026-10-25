from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from datetime import datetime

from ..schemas.pesticide import PesticideCalculationRequest, PesticideCalculationResponse
from ..services.dose_calculator import DoseCalculator

router = APIRouter()
calculator = DoseCalculator()

@router.post("/calculate", response_model=PesticideCalculationResponse)
async def calculate_pesticide_dose(request: PesticideCalculationRequest):
    """Calculate pesticide application dose based on inputs"""
    try:
        result = calculator.calculate_dose(
            crop=request.crop,
            pest=request.pest,
            product_name=request.product_name,
            formulation=request.formulation,
            label_rate=request.label_rate,
            label_units=request.label_units,
            treated_area_hectares=request.treated_area_hectares,
            tank_capacity_liters=request.tank_capacity_liters,
            application_method=request.application_method
        )

        return PesticideCalculationResponse(
            status="success",
            calculation=result,
            timestamp=datetime.utcnow().isoformat()
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")