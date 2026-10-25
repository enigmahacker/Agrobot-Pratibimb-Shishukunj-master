from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timedelta
import uuid

from ..schemas.spray_session import (
    SpraySessionRequest,
    SpraySessionResponse,
    SpraySessionValidationResponse
)
from ..services.validation_service import ValidationService

router = APIRouter()
validation_service = ValidationService()

@router.post("/validate", response_model=SpraySessionValidationResponse)
async def validate_spray_session(request: SpraySessionRequest):
    """Validate spray session parameters"""
    try:
        validation_result = validation_service.validate_spray_session(request)

        return SpraySessionValidationResponse(
            status="validated" if validation_result.is_valid else "invalid",
            session_id=str(uuid.uuid4()),
            validation_result=validation_result,
            timestamp=datetime.utcnow().isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{session_id}", response_model=SpraySessionResponse)
async def get_spray_session(session_id: str):
    """Get spray session details"""
    # In a real implementation, this would fetch from database
    return SpraySessionResponse(
        session_id=session_id,
        status="active",
        created_at=datetime.utcnow().isoformat(),
        updated_at=datetime.utcnow().isoformat(),
        validated=True
    )