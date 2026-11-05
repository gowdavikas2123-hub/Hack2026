from app.services.dispatch_service import DispatchService
from app.integrations.dispatch_adapter import MockDispatchAdapter
from app.models.database_models import PartCatalogue, DispatchRecord

def test_11_single_stock_part_prevents_double_dispatch(test_db):
    """TEST 11: Two requests attempt to dispatch the same single-stock part. Expected: Only one successful dispatch."""
    dispatch_service = DispatchService()

    part = test_db.query(PartCatalogue).filter(PartCatalogue.id == "PART-101").first()
    assert part.current_stock == 1

    # Request 1 dispatches PART-101
    success_1, record_1, msg_1 = dispatch_service.execute_dispatch(
        db=test_db,
        request_id="REQ-001",
        part_id="PART-101",
        idempotency_key="key-req-001"
    )
    assert success_1 is True
    assert record_1.status == "SUCCESS"

    test_db.refresh(part)
    assert part.current_stock == 0

    # Request 2 attempts to dispatch same PART-101
    success_2, record_2, msg_2 = dispatch_service.execute_dispatch(
        db=test_db,
        request_id="REQ-004",
        part_id="PART-101",
        idempotency_key="key-req-004"
    )
    assert success_2 is False
    assert "0 available units" in msg_2

    # Stock must remain 0 and not negative
    test_db.refresh(part)
    assert part.current_stock == 0

def test_12_dispatch_tool_failure_does_not_deduct_stock(test_db):
    """TEST 12: A dispatch tool fails. Expected: No successful dispatch recorded and inventory not deducted."""
    mock_adapter = MockDispatchAdapter()
    mock_adapter.set_inject_failure(True)  # Inject communication failure

    dispatch_service = DispatchService(dispatch_adapter=mock_adapter)
    part = test_db.query(PartCatalogue).filter(PartCatalogue.id == "PART-102").first()
    initial_stock = part.current_stock

    success, record, msg = dispatch_service.execute_dispatch(
        db=test_db,
        request_id="REQ-TEST",
        part_id="PART-102",
        idempotency_key="key-fail-test"
    )

    assert success is False
    assert record.status == "FAILED"

    # Inventory must NOT be deducted
    test_db.refresh(part)
    assert part.current_stock == initial_stock

def test_17_idempotency_prevents_duplicate_dispatch(test_db):
    """TEST 17: A dispatch request is submitted twice. Expected: Idempotency prevents duplicate dispatch."""
    dispatch_service = DispatchService()
    part = test_db.query(PartCatalogue).filter(PartCatalogue.id == "PART-103").first()
    assert part.current_stock == 1

    key = "idem-test-key-103"

    # First execution
    success_1, record_1, msg_1 = dispatch_service.execute_dispatch(
        db=test_db,
        request_id="REQ-002",
        part_id="PART-103",
        idempotency_key=key
    )
    assert success_1 is True
    assert record_1.status == "SUCCESS"

    test_db.refresh(part)
    assert part.current_stock == 0

    # Second execution with identical idempotency key
    success_2, record_2, msg_2 = dispatch_service.execute_dispatch(
        db=test_db,
        request_id="REQ-002",
        part_id="PART-103",
        idempotency_key=key
    )
    assert success_2 is True
    assert record_2.id == record_1.id
    assert "Idempotency preserved" in msg_2

    # Verify no second stock deduction occurred
    test_db.refresh(part)
    assert part.current_stock == 0
