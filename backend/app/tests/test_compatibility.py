from app.services.compatibility_service import CompatibilityService
from app.models.schemas import ExtractedSpecifications, VoltageSpec, ConnectorSpec, WattageSpec

def test_1_wattage_10w_request_with_20w_part_accept():
    """TEST 1: A 10 W request is matched with a compatible 20 W part. Expected: ACCEPT."""
    compatible, reason = CompatibilityService.check_wattage_compatibility(
        requested_min_wattage=10.0,
        part_wattage=20.0
    )
    assert compatible is True
    assert ">= requested minimum" in reason

def test_2_wattage_20w_request_with_10w_part_reject():
    """TEST 2: A 20 W request is matched with a 10 W part. Expected: REJECT."""
    compatible, reason = CompatibilityService.check_wattage_compatibility(
        requested_min_wattage=20.0,
        part_wattage=10.0
    )
    assert compatible is False
    assert "< requested minimum" in reason

def test_3_voltage_mismatch_reject():
    """TEST 3: A voltage mismatch exists. Expected: REJECT."""
    compatible, reason = CompatibilityService.check_voltage_compatibility(
        requested_voltage=12.0,
        part_voltage=24.0
    )
    assert compatible is False
    assert "Voltage mismatch" in reason

def test_3b_voltage_exact_match_accept():
    compatible, reason = CompatibilityService.check_voltage_compatibility(
        requested_voltage=12.0,
        part_voltage=12.0
    )
    assert compatible is True
    assert "matches exactly" in reason

def test_4_connector_incompatible_reject():
    """TEST 4: The connector is incompatible. Expected: REJECT."""
    compatible, reason = CompatibilityService.check_connector_compatibility(
        requested_connector="USB-C",
        part_connector="Screw-Terminal"
    )
    assert compatible is False
    assert "Incompatible connector" in reason

def test_4b_connector_compatible_accept():
    compatible, reason = CompatibilityService.check_connector_compatibility(
        requested_connector="USB-C",
        part_connector="USB-C"
    )
    assert compatible is True
