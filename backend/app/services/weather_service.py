import httpx
import logging
from typing import Dict, Any, Optional
from datetime import datetime

from ..config import settings

logger = logging.getLogger(__name__)

class WeatherService:
    def __init__(self):
        self.api_key = settings.WEATHER_API_KEY
        self.api_url = settings.WEATHER_API_URL
        self.client = httpx.AsyncClient(timeout=10.0)

    async def get_current_weather(self, lat: float, lon: float, api_key: str = None) -> Dict[str, Any]:
        """Get current weather data for coordinates"""

        try:
            # Use configured API key or provided one
            key = api_key or self.api_key
            if not key:
                raise ValueError("Weather API key is required")

            params = {
                "lat": lat,
                "lon": lon,
                "appid": key,
                "units": "metric"
            }

            response = await self.client.get(self.api_url, params=params)

            if response.status_code == 200:
                data = response.json()

                # Extract relevant weather information
                weather_data = {
                    "temperature_celsius": data["main"]["temp"],
                    "humidity_percent": data["main"]["humidity"],
                    "wind_speed_mps": data["wind"]["speed"],
                    "wind_direction_degrees": data["wind"].get("deg"),
                    "pressure_hpa": data["main"]["pressure"],
                    "precipitation_mm": data.get("rain", {}).get("1h", 0),
                    "condition": data["weather"][0]["main"],
                    "description": data["weather"][0]["description"],
                    "timestamp": datetime.utcnow().isoformat(),
                    "coordinates": {
                        "latitude": lat,
                        "longitude": lon
                    }
                }

                logger.info(f"Weather data retrieved for {lat}, {lon}")
                return weather_data
            else:
                logger.error(f"Weather API error: {response.status_code} - {response.text}")
                raise Exception(f"Weather service error: {response.text}")

        except httpx.RequestError as e:
            logger.error(f"Weather service request failed: {str(e)}")
            raise Exception("Weather service temporarily unavailable")
        except Exception as e:
            logger.error(f"Unexpected weather service error: {str(e)}")
            raise Exception(f"Failed to fetch weather data: {str(e)}")

    async def get_forecast(self, lat: float, lon: float, days: int = 5, api_key: str = None) -> Dict[str, Any]:
        """Get weather forecast for coordinates"""

        try:
            # In a real implementation, you'd use a different API endpoint for forecasts
            # This is a simplified version that returns current weather data

            weather_data = await self.get_current_weather(lat, lon, api_key)

            # Add forecast-style information
            forecast = {
                "days": days,
                "data": [weather_data]  # Simplified - in reality would be multiple days
            }

            return forecast

        except Exception as e:
            logger.error(f"Weather forecast error: {str(e)}")
            raise Exception(f"Failed to fetch weather forecast: {str(e)}")

    async def validate_weather_conditions(self, lat: float, lon: float,
                                        pesticide_product: str,
                                        safety_requirements: dict) -> Dict[str, Any]:
        """Validate if current weather conditions are suitable for pesticide application"""

        try:
            # Get current weather
            weather = await self.get_current_weather(lat, lon)

            # Check various factors against safety requirements
            safety_checks = {
                "wind_speed_ok": weather["wind_speed_mps"] <= safety_requirements.get("max_wind_speed", 5.0),
                "temperature_ok": safety_requirements.get("min_temperature", -10) <= weather["temperature_celsius"] <= safety_requirements.get("max_temperature", 35),
                "precipitation_ok": weather["precipitation_mm"] == 0,  # No rain expected
                "conditions_suitable": True  # Placeholder for more complex logic
            }

            # Overall suitability check
            suitable = all(safety_checks.values())

            return {
                "suitable": suitable,
                "weather_data": weather,
                "safety_checks": safety_checks,
                "recommendation": "Application permitted" if suitable else "Application not recommended"
            }

        except Exception as e:
            logger.error(f"Weather validation error: {str(e)}")
            raise Exception(f"Weather validation failed: {str(e)}")

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()