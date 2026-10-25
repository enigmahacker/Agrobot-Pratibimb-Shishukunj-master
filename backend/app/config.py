from pydantic_settings import BaseSettings
from typing import List, Optional
import os

class Settings(BaseSettings):
    # Server configuration
    API_TITLE: str = "AgroBot AI Backend"
    API_VERSION: str = "1.0.0"
    SERVER_HOST: str = "0.0.0.0"
    SERVER_PORT: int = 8000

    # Security
    SECRET_KEY: str = "your-secret-key-here"  # Should be changed in production
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALLOWED_ORIGINS: List[str] = ["*"]

    # AI Model Configuration
    AI_MODEL_BASE_URL: str = "http://localhost:8080"  # Default local endpoint
    AI_MODEL_API_KEY: Optional[str] = None

    # Database (if needed in future)
    DATABASE_URL: Optional[str] = None

    # Pesticide Calculation Settings
    DEFAULT_TANK_CAPACITY_LITERS: float = 100.0
    DEFAULT_APPLICATION_RATE_UNITS: str = "L/ha"

    # Weather Service Configuration
    WEATHER_API_KEY: Optional[str] = None
    WEATHER_API_URL: str = "http://api.openweathermap.org/data/2.5/weather"

    # Rate limiting
    RATE_LIMIT_MAX_REQUESTS: int = 100
    RATE_LIMIT_WINDOW_SECONDS: int = 3600

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = True

# Initialize settings
settings = Settings()