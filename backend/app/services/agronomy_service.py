import logging
from typing import Dict, Any, Optional
from datetime import datetime

from .ai_service import AIService
from ..schemas.recommendation import AgronomyRecommendationRequest, AgronomyRecommendationResponse

logger = logging.getLogger(__name__)

class AgronomyService:
    def __init__(self):
        self.ai_service = AIService()

    async def get_recommendation(
        self,
        crop: str,
        growth_stage: str,
        target_pest: Optional[str] = None,
        product_name: Optional[str] = None
    ) -> AgronomyRecommendationResponse:
        """Get agronomic recommendations based on inputs"""

        try:
            # Build prompt for AI model
            prompt_parts = [
                f"Provide agronomic recommendations for {crop} crop",
                f"during {growth_stage} growth stage"
            ]

            if target_pest:
                prompt_parts.append(f"targeting pest/disease: {target_pest}")

            if product_name:
                prompt_parts.append(f"using pesticide product: {product_name}")

            prompt_parts.append("Include application rates, safety measures, and environmental considerations.")

            prompt = " ".join(prompt_parts)

            # Get recommendation from AI
            ai_response = await self.ai_service.get_recommendation(prompt)

            return AgronomyRecommendationResponse(
                status="success",
                recommendation=ai_response.get("text", "No recommendation provided"),
                confidence_score=ai_response.get("confidence", 0.8),
                explanation=ai_response.get("explanation", "AI analysis of agronomic factors"),
                supporting_data=ai_response.get("data", {}),
                timestamp=datetime.utcnow().isoformat()
            )

        except Exception as e:
            logger.error(f"Error getting agronomy recommendation: {str(e)}")
            raise ValueError(f"Failed to get agronomy recommendation: {str(e)}")

    async def calculate_application(
        self,
        crop: str,
        growth_stage: str,
        target_pest: Optional[str] = None,
        product_name: Optional[str] = None,
        area_hectares: float = 1.0,
        tank_capacity_liters: float = 100.0
    ) -> Dict[str, Any]:
        """Calculate pesticide application parameters"""

        try:
            # This would be more complex in a real implementation
            # For now, we'll just return some sample data

            calculation_data = {
                "crop": crop,
                "growth_stage": growth_stage,
                "target_pest": target_pest,
                "product_name": product_name,
                "area_hectares": area_hectares,
                "tank_capacity_liters": tank_capacity_liters,
                "application_rate": 2.5,  # Sample rate
                "required_product_quantity": area_hectares * 2.5,  # Simple calculation
                "units": "L/ha",
                "estimated_time": 30,  # minutes
                "equipment_needed": ["sprayer", "pump", "tank"]
            }

            return calculation_data

        except Exception as e:
            logger.error(f"Error calculating application: {str(e)}")
            raise ValueError(f"Failed to calculate application: {str(e)}")

    async def close(self):
        """Close AI service connection"""
        await self.ai_service.close()