from app.services.stock_service import StockService
from app.integrations.verification_adapter import MockStockVerificationAdapter
from app.models.database_models import PartCatalogue, StockSnapshot

def test_5_recent_snapshot_trusted(test_db):
    """TEST 5: A recent stock snapshot shows one available unit. Expected: Initial stock can be used."""
    stock_service = StockService()
    # PART-101 is RECENT with snapshot 1
    is_avail, stock_qty, verif_rec = stock_service.verify_stock_if_needed(
        db=test_db,
        part_id="PART-101",
        request_id="REQ-001"
    )
    assert is_avail is True
    assert stock_qty == 1
    # For RECENT snapshot, no warehouse verification record is needed
    assert verif_rec is None

def test_6_aged_snapshot_overstated_detects_zero_stock(test_db):
    """TEST 6: An aged snapshot advertises stock that does not exist.
    Expected: Verification detects zero warehouse stock, and the part cannot be dispatched."""
    stock_service = StockService()
    # PART-105 is AGED snapshot=1, but warehouse=0
    is_avail, stock_qty, verif_rec = stock_service.verify_stock_if_needed(
        db=test_db,
        part_id="PART-105",
        request_id="REQ-004"
    )
    assert is_avail is False
    assert stock_qty == 0
    assert verif_rec is not None
    assert verif_rec.discrepancy_detected is True
    assert verif_rec.discrepancy_type == "OVERSTATED"

def test_7_aged_snapshot_understated_discovers_available_stock(test_db):
    """TEST 7: An aged snapshot hides available stock.
    Expected: Verification discovers available stock, and the part may be dispatched if technically compatible."""
    stock_service = StockService()
    # PART-108 is AGED snapshot=0, but warehouse=1
    is_avail, stock_qty, verif_rec = stock_service.verify_stock_if_needed(
        db=test_db,
        part_id="PART-108",
        request_id="REQ-002"
    )
    assert is_avail is True
    assert stock_qty == 1
    assert verif_rec is not None
    assert verif_rec.discrepancy_detected is True
    assert verif_rec.discrepancy_type == "UNDERSTATED"

def test_13_verification_tool_fails_no_dispatch(test_db):
    """TEST 13: A verification tool fails. Expected: Do not dispatch using uncertain aged stock."""
    # Create mock verification adapter that simulates tool failure (part not found or network error)
    failing_adapter = MockStockVerificationAdapter()
    failing_adapter.set_inject_failure(True)
    stock_service = StockService(verification_adapter=failing_adapter)

    is_avail, stock_qty, verif_rec = stock_service.verify_stock_if_needed(
        db=test_db,
        part_id="PART-105",
        request_id="REQ-001"
    )
    assert is_avail is False
    assert stock_qty == 0
    assert verif_rec.status == "FAILED"
