import pytest
from app.services.validation_service import ValidationService
from app.schemas.spray_session import SpraySessionRequest, SpraySessionValidationResult

def test_validate_spray_session_basic():
    """Test basic spray session validation"""
    validator = ValidationService()

    request = SpraySessionRequest(
        crop="wheat",
        pest="aphid",
        product_name="glyphosate",
        formulation="Roundup",
        label_rate=1.0,
        label_units="L/ha",
        treated_area_hectares=5.0,
        tank_capacity_liters=100.0,
        application_method="spray"
    )

    result = validator.validate_spray_session(request)

    assert result.is_valid == True
    assert len(result.validation_errors) == 0
    assert len(result.warnings) == 0

def test_validate_spray_session_missing_fields():
    """Test validation with missing required fields"""
    validator = ValidationService()

    request = SpraySessionRequest(
        crop="",  # Missing crop
        pest="aphid",
        product_name="",  # Missing product
        formulation="Roundup",
        label_rate=1.0,
        label_units="L/ha",
        treated_area_hectares=5.0,
        tank_capacity_liters=100.0,
        application_method="spray"
    )

    result = validator.validate_spray_session(request)

    assert result.is_valid == False
    assert len(result.validation_errors) >= 2  # Should have errors for missing crop and product

def test_validate_spray_session_invalid_tank_capacity():
    """Test validation with invalid tank capacity"""
    validator = ValidationService()

    request = SpraySessionRequest(
        crop="wheat",
        pest="aphid",
        product_name="glyphosate",
        formulation="Roundup",
        label_rate=1.0,
        label_units="L/ha",
        treated_area_hectares=5.0,
        tank_capacity_liters=0.0,  # Invalid capacity
        application_method="spray"
    )

    result = validator.validate_spray_session(request)

    assert result.is_valid == False
    assert len(result.validation_errors) >= 1

def test_validate_spray_session_high_wind_speed():
    """Test validation with high wind speed"""
    validator = ValidationService()

    request = SpraySessionRequest(
        crop="wheat",
        pest="aphid",
        product_name="glyphosate",
        formulation="Roundup",
        label_rate=1.0,
        label_units="L/ha",
        treated_area_hectares=5.0,
        tank_capacity_liters=100.0,
        application_method="spray",
        environmental_conditions={
            "wind_speed_mps": 7.0  # High wind speed
        }
    )

    result = validator.validate_spray_session(request)

    assert result.is_valid == True  # Should still be valid, but with warning
    assert len(result.warnings) >= 1