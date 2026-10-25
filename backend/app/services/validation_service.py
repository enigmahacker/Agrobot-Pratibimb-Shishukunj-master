import logging
from typing import Dict, Any, Optional
from datetime import datetime

from ..schemas.spray_session import SpraySessionRequest, SpraySessionValidationResult

logger = logging.getLogger(__name__)

class ValidationService:
    def __init__(self):
        # Sample validation rules - in real implementation these would be more comprehensive
        self.validation_rules = {
            "minimum_tank_capacity": 10.0,  # liters
            "maximum_tank_capacity": 1000.0,  # liters
            "maximum_application_rate": 5.0,  # L/ha or equivalent
            "minimum_application_rate": 0.1,  # L/ha or equivalent
            "max_wind_speed_mps": 5.0,  # m/s
            "safe_temperature_range": (-10, 35)  # Celsius
        }

    def validate_spray_session(self, request: SpraySessionRequest) -> SpraySessionValidationResult:
        """Validate spray session parameters"""

        try:
            errors = []
            warnings = []
            recommendations = []

            # Validate required fields
            if not request.crop:
                errors.append("Crop type is required")

            if not request.pest:
                errors.append("Target pest is required")

            if not request.product_name:
                errors.append("Product name is required")

            if not request.formulation:
                errors.append("Formulation is required")

            if not request.label_rate or request.label_rate <= 0:
                errors.append("Valid label rate is required")

            if not request.treated_area_hectares or request.treated_area_hectares <= 0:
                errors.append("Valid treated area (hectares) is required")

            if not request.tank_capacity_liters or request.tank_capacity_liters <= 0:
                errors.append("Valid tank capacity (liters) is required")

            # Validate numerical values
            if request.tank_capacity_liters < self.validation_rules["minimum_tank_capacity"]:
                errors.append(f"Tank capacity must be at least {self.validation_rules['minimum_tank_capacity']} liters")

            if request.tank_capacity_liters > self.validation_rules["maximum_tank_capacity"]:
                errors.append(f"Tank capacity exceeds maximum of {self.validation_rules['maximum_tank_capacity']} liters")

            if request.label_rate > self.validation_rules["maximum_application_rate"]:
                warnings.append(f"Application rate ({request.label_rate} {request.label_units}) is high - verify with product label")

            if request.label_rate < self.validation_rules["minimum_application_rate"]:
                warnings.append(f"Application rate ({request.label_rate} {request.label_units}) is low - verify with product label")

            # Check application method
            valid_methods = ["spray", "drip", "foliar", "soil", "granular"]
            if request.application_method and request.application_method.lower() not in valid_methods:
                warnings.append(f"Application method '{request.application_method}' is not standard - verify with product label")

            # Check environmental conditions
            if request.environmental_conditions:
                wind_speed = request.environmental_conditions.get("wind_speed_mps")
                if wind_speed and wind_speed > self.validation_rules["max_wind_speed_mps"]:
                    errors.append(f"Wind speed ({wind_speed} m/s) exceeds maximum of {self.validation_rules['max_wind_speed_mps']} m/s")

            # Check area vs tank capacity
            if request.tank_capacity_liters > 0 and request.treated_area_hectares > 0:
                # Simple check - in reality this would be more complex
                if request.treated_area_hectares > 1000:  # Very large area
                    warnings.append("Very large treated area - consider splitting application")

            # Check if all required fields are present for validation
            required_fields = [
                "crop", "pest", "product_name", "formulation",
                "label_rate", "treated_area_hectares", "tank_capacity_liters"
            ]

            # If there are no errors, session is valid
            is_valid = len(errors) == 0

            if not is_valid:
                recommendations.append("Review and correct validation errors before proceeding")

            return SpraySessionValidationResult(
                is_valid=is_valid,
                validation_errors=errors,
                warnings=warnings,
                recommendations=recommendations,
                required_fields=required_fields
            )

        except Exception as e:
            logger.error(f"Validation error: {str(e)}")
            raise Exception(f"Validation failed: {str(e)}")

    def validate_product_label(self, product_name: str, label_data: dict) -> Dict[str, Any]:
        """Validate product label information"""

        try:
            # This would check against a database of product labels
            # For now, we'll just return basic validation results

            if not product_name:
                return {
                    "valid": False,
                    "errors": ["Product name is required"],
                    "warnings": []
                }

            # In real implementation, this would validate against actual label data
            return {
                "valid": True,
                "errors": [],
                "warnings": [],
                "product_info": {
                    "name": product_name,
                    "status": "verified"
                }
            }

        except Exception as e:
            logger.error(f"Product label validation error: {str(e)}")
            raise Exception(f"Label validation failed: {str(e)}")

    def validate_weather_conditions(self, weather_data: dict) -> Dict[str, Any]:
        """Validate if current weather conditions are suitable"""

        try:
            # Extract weather parameters
            wind_speed = weather_data.get("wind_speed_mps", 0)
            temperature = weather_data.get("temperature_celsius", 20)

            # Check safety requirements
            is_safe = (
                wind_speed <= self.validation_rules["max_wind_speed_mps"] and
                self.validation_rules["safe_temperature_range"][0] <= temperature <= self.validation_rules["safe_temperature_range"][1]
            )

            return {
                "weather_safe": is_safe,
                "wind_speed": wind_speed,
                "temperature": temperature,
                "safety_recommendation": "Safe for application" if is_safe else "Not safe for application"
            }

        except Exception as e:
            logger.error(f"Weather validation error: {str(e)}")
            raise Exception(f"Weather validation failed: {str(e)}")