from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import logging
from datetime import datetime

from .config import settings
from .api import health, rover, agronomy, pesticide, weather, spray_sessions
from .security import authentication

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title="AgroBot AI Backend",
    description="AI-powered agricultural rover backend with pest control calculations and agronomy assistance",
    version="1.0.0",
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add security
security = HTTPBearer()

# Include routers
app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(rover.router, prefix="/v1/rover", tags=["Rover"])
app.include_router(agronomy.router, prefix="/v1/agronomy", tags=["Agronomy"])
app.include_router(pesticide.router, prefix="/v1/pesticide", tags=["Pesticide"])
app.include_router(weather.router, prefix="/v1/weather", tags=["Weather"])
app.include_router(spray_sessions.router, prefix="/v1/spray-sessions", tags=["Spray Sessions"])

# Root endpoint
@app.get("/", response_model=dict)
async def root():
    return {
        "message": "AgroBot AI Backend API",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.utcnow().isoformat()
    }

# Health check endpoint
@app.get("/health", response_model=dict)
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "AgroBot Backend"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)