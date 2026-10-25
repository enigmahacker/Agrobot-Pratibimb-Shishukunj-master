from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from datetime import datetime

from ..schemas.recommendation import AgronomyRecommendationRequest, AgronomyRecommendationResponse
from ..services.agronomy_service import AgronomyService

router = APIRouter()
agronomy_service = AgronomyService()

@router.post("/recommendation", response_model=AgronomyRecommendationResponse)
async def get_agronomy_recommendation(request: AgronomyRecommendationRequest):
    """Get agronomic recommendations based on crop and pest information"""
    try:
        recommendation = await agronomy_service.get_recommendation(
            crop=request.crop,
            growth_stage=request.growth_stage,
            target_pest=request.target_pest,
            product_name=request.product_name
        )
        return recommendation
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/calculate", response_model=dict)
async def calculate_pesticide_application(request: AgronomyRecommendationRequest):
    """Calculate pesticide application parameters"""
    try:
        result = await agronomy_service.calculate_application(
            crop=request.crop,
            growth_stage=request.growth_stage,
            target_pest=request.target_pest,
            product_name=request.product_name,
            area_hectares=request.area_hectares,
            tank_capacity_liters=request.tank_capacity_liters
        )
        return {
            "status": "success",
            "calculation": result,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/sowing-estimate", response_model=dict)
async def calculate_sowing_seed(request: dict):
    """Calculate seed quantity for sowing based on idea.txt Section 9 deterministic formulas"""
    try:
        crop = request.get("crop", "Wheat")
        area_ha = float(request.get("area_hectares", 1.0))
        seed_rate_kg_ha = float(request.get("seed_rate_kg_per_ha", 100.0))
        germination_pct = float(request.get("germination_percentage", 90.0))
        row_spacing_m = float(request.get("row_spacing_meters", 0.22))

        # Deterministic formula M = A * S
        base_seed_mass_kg = area_ha * seed_rate_kg_ha
        germination_factor = max(0.1, min(1.0, germination_pct / 100.0))
        adjusted_seed_mass_kg = base_seed_mass_kg / germination_factor

        # Estimated linear row length (A in m2 / row_spacing_m)
        area_m2 = area_ha * 10000.0
        total_row_meters = area_m2 / max(0.05, row_spacing_m)

        return {
            "status": "success",
            "crop": crop,
            "area_hectares": area_ha,
            "base_seed_kg": round(base_seed_mass_kg, 2),
            "germination_percentage": germination_pct,
            "adjusted_seed_kg": round(adjusted_seed_mass_kg, 2),
            "total_row_meters": round(total_row_meters, 1),
            "method": "Deterministic Agronomy Calculation (idea.txt Section 9)",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))