import httpx
import logging
from typing import Dict, Any, Optional
from pydantic import BaseModel
from fastapi import HTTPException

from ..config import settings

logger = logging.getLogger(__name__)

class AIResponse(BaseModel):
    status: str
    data: dict
    timestamp: str
    confidence: float

class AIService:
    def __init__(self):
        self.base_url = settings.AI_MODEL_BASE_URL
        self.api_key = settings.AI_MODEL_API_KEY
        self.client = httpx.AsyncClient(timeout=30.0)

    async def get_recommendation(self, prompt: str) -> Dict[str, Any]:
        """Get recommendation from AI model"""
        try:
            headers = {
                "Content-Type": "application/json"
            }

            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"

            payload = {
                "prompt": prompt,
                "max_tokens": 500,
                "temperature": 0.7
            }

            response = await self.client.post(
                f"{self.base_url}/generate",
                json=payload,
                headers=headers
            )

            if response.status_code == 200:
                data = response.json()
                logger.info(f"AI recommendation received: {data}")
                return data
            else:
                logger.error(f"AI API error: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"AI service error: {response.text}"
                )

        except httpx.RequestError as e:
            logger.error(f"AI service request failed: {str(e)}")
            raise HTTPException(
                status_code=503,
                detail="AI service temporarily unavailable"
            )
        except Exception as e:
            logger.error(f"Unexpected AI service error: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Internal AI service error"
            )

    async def validate_product_info(self, product_name: str) -> Dict[str, Any]:
        """Validate product information using AI"""
        try:
            prompt = f"Validate pesticide product '{product_name}' and provide safety data, restrictions, and application guidelines."

            return await self.get_recommendation(prompt)
        except Exception as e:
            logger.error(f"Product validation failed: {str(e)}")
            raise

    async def analyze_crop_health(self, crop_data: dict) -> Dict[str, Any]:
        """Analyze crop health using AI"""
        try:
            prompt = f"Analyze crop data: {crop_data} and provide recommendations for pest control and treatment."

            return await self.get_recommendation(prompt)
        except Exception as e:
            logger.error(f"Crop health analysis failed: {str(e)}")
            raise

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()