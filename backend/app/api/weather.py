from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from datetime import datetime

from ..schemas.telemetry import WeatherData
from ..services.weather_service import WeatherService

router = APIRouter()
weather_service = WeatherService()

@router.get("/current", response_model=WeatherData)
async def get_current_weather(
    lat: float,
    lon: float,
    api_key: str = None
):
    """Get current weather data for coordinates"""
    try:
        weather_data = weather_service.get_current_weather(lat, lon, api_key)
        return weather_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/forecast", response_model=dict)
async def get_weather_forecast(
    lat: float,
    lon: float,
    days: int = 5,
    api_key: str = None
):
    """Get weather forecast for coordinates"""
    try:
        forecast_data = weather_service.get_forecast(lat, lon, days, api_key)
        return {
            "status": "success",
            "forecast": forecast_data,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))