import logging
from typing import Dict, Any, Optional
from datetime import datetime

from ..schemas.pesticide import PesticideCalculation, PesticideDoseResult

logger = logging.getLogger(__name__)

class DoseCalculator:
    def __init__(self):
        # Sample product database - in real implementation this would be more comprehensive
        self.product_database = {
            "glyphosate": {
                "name": "Glyphosate",
                "formulations": ["Roundup", "Glypo"],
                "label_rates": {
                    "L/ha": 1.0,
                    "g/ha": 850.0,
                    "oz/acre": 0.8,
                    "lbs/acre": 0.4
                },
                "restrictions": ["No application during bloom", "Buffer zones required"],
                "safety_data": {
                    "pH": 7.0,
                    "solubility": "High",
                    "toxicity": "Low"
                }
            },
            "chlorpyrifos": {
                "name": "Chlorpyrifos",
                "formulations": ["Lorsban", "Dursban"],
                "label_rates": {
                    "L/ha": 0.5,
                    "g/ha": 425.0,
                    "oz/acre": 0.4,
                    "lbs/acre": 0.2
                },
                "restrictions": ["Restricted use pesticide", "Buffer zones required"],
                "safety_data": {
                    "pH": 7.0,
                    "solubility": "Moderate",
                    "toxicity": "Moderate"
                }
            }
        }

    def calculate_dose(
        self,
        crop: str,
        pest: str,
        product_name: str,
        formulation: str,
        label_rate: float,
        label_units: str,
        treated_area_hectares: float,
        tank_capacity_liters: float,
        application_method: str
    ) -> PesticideDoseResult:
        """
        Calculate pesticide dose based on inputs
        """

        try:
            # Validate inputs
            if treated_area_hectares <= 0:
                raise ValueError("Treated area must be greater than zero")

            if tank_capacity_liters <= 0:
                raise ValueError("Tank capacity must be greater than zero")

            if label_rate <= 0:
                raise ValueError("Label rate must be greater than zero")

            # Calculate required product quantity
            required_product_quantity = label_rate * treated_area_hectares

            # Convert to appropriate units (if needed)
            if label_units == "L/ha":
                result_units = "L"
            elif label_units == "g/ha":
                result_units = "g"
            else:
                result_units = label_units

            # Calculate delivery volume
            estimated_delivery_volume = required_product_quantity  # Simplified - in reality would depend on concentration

            # Check if calculated amount fits in tank capacity
            tank_utilization = (required_product_quantity / tank_capacity_liters) * 100

            # Prepare assumptions
            assumptions = [
                f"Calculated dose based on label rate of {label_rate} {label_units}",
                f"Treated area: {treated_area_hectares} hectares",
                f"Tank capacity: {tank_capacity_liters} liters"
            ]

            # Check for missing information
            missing_info = []
            if not crop:
                missing_info.append("crop type")
            if not pest:
                missing_info.append("target pest")
            if not product_name:
                missing_info.append("product name")
            if not formulation:
                missing_info.append("formulation")

            # Check for warnings
            warnings = []
            if tank_utilization > 100:
                warnings.append(f"Calculated dose ({required_product_quantity:.2f} {result_units}) exceeds tank capacity ({tank_capacity_liters} liters)")

            if tank_utilization > 80:
                warnings.append("Tank utilization is high - consider splitting application")

            # Determine verification requirements
            verification_required = False
            if not product_name or product_name.lower() not in self.product_database:
                verification_required = True
                warnings.append("Product information not found in database - expert review required")

            # Return result
            return PesticideDoseResult(
                status="calculated",
                input_values={
                    "crop": crop,
                    "pest": pest,
                    "product_name": product_name,
                    "formulation": formulation,
                    "label_rate": label_rate,
                    "label_units": label_units,
                    "treated_area_hectares": treated_area_hectares,
                    "tank_capacity_liters": tank_capacity_liters,
                    "application_method": application_method
                },
                calculation_method="Label rate × Area",
                calculated_quantity=required_product_quantity,
                units=result_units,
                product_label_source="Verified product label",
                assumptions=assumptions,
                missing_information=missing_info,
                warnings=warnings,
                verification_required=verification_required
            )

        except Exception as e:
            logger.error(f"Error calculating dose: {str(e)}")
            raise ValueError(f"Dose calculation failed: {str(e)}")

    def validate_product(self, product_name: str) -> Dict[str, Any]:
        """Validate product information from database"""
        if product_name.lower() in self.product_database:
            return self.product_database[product_name.lower()]
        else:
            return {
                "status": "not_found",
                "message": f"Product '{product_name}' not found in database"
            }

    def get_product_info(self, product_name: str) -> Dict[str, Any]:
        """Get detailed product information"""
        if product_name.lower() in self.product_database:
            return self.product_database[product_name.lower()]
        else:
            return {
                "error": f"Product '{product_name}' not found",
                "status": "not_found"
            }