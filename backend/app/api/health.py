from fastapi import APIRouter, Depends
from datetime import datetime

router = APIRouter()

@router.get("/health", response_model=dict)
async def health_check():
    """Health check endpoint to verify the service is running"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "AgroBot Backend"
    }

@router.get("/status", response_model=dict)
async def status_check():
    """Detailed status check"""
    return {
        "status": "running",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "AgroBot Backend",
        "version": "1.0.0"
    }