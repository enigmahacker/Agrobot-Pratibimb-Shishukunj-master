import pytest
from app.services.dose_calculator import DoseCalculator
from app.schemas.pesticide import PesticideDoseResult

def test_calculate_dose_basic():
    """Test basic dose calculation"""
    calculator = DoseCalculator()

    result = calculator.calculate_dose(
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

    assert result.status == "calculated"
    assert result.calculated_quantity == 5.0  # 1.0 L/ha * 5.0 hectares
    assert result.units == "L"
    assert result.input_values["crop"] == "wheat"

def test_calculate_dose_with_large_area():
    """Test dose calculation with large treated area"""
    calculator = DoseCalculator()

    result = calculator.calculate_dose(
        crop="corn",
        pest="worm",
        product_name="chlorpyrifos",
        formulation="Lorsban",
        label_rate=0.5,
        label_units="L/ha",
        treated_area_hectares=100.0,
        tank_capacity_liters=100.0,
        application_method="drip"
    )

    assert result.status == "calculated"
    assert result.calculated_quantity == 50.0  # 0.5 L/ha * 100.0 hectares

def test_calculate_dose_invalid_inputs():
    """Test dose calculation with invalid inputs"""
    calculator = DoseCalculator()

    # Test with zero area
    try:
        calculator.calculate_dose(
            crop="wheat",
            pest="aphid",
            product_name="glyphosate",
            formulation="Roundup",
            label_rate=1.0,
            label_units="L/ha",
            treated_area_hectares=0.0,
            tank_capacity_liters=100.0,
            application_method="spray"
        )
        assert False, "Should have raised ValueError"
    except ValueError:
        pass  # Expected

def test_calculate_dose_negative_rate():
    """Test dose calculation with negative rate"""
    calculator = DoseCalculator()

    try:
        calculator.calculate_dose(
            crop="wheat",
            pest="aphid",
            product_name="glyphosate",
            formulation="Roundup",
            label_rate=-1.0,
            label_units="L/ha",
            treated_area_hectares=5.0,
            tank_capacity_liters=100.0,
            application_method="spray"
        )
        assert False, "Should have raised ValueError"
    except ValueError:
        pass  # Expected