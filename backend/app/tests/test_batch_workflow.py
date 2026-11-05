from app.services.batch_service import BatchService
from app.models.database_models import CustomerRequest, Batch, PartCatalogue
from app.fixtures.demo_scenario import DEMO_PARTS, DEMO_REQUESTS
from app.agents.decision_agent import DecisionAgent
from app.models.schemas import ExtractedSpecifications, VoltageSpec, ConnectorSpec, WattageSpec

def test_14_no_compatible_part_leads_to_human_review(test_db):
    """TEST 14: A request has no technically compatible part. Expected: HUMAN_REVIEW."""
    # REQ-006 is 36V, military DIN connector, 40W (no 36V part exists in 12-part catalogue)
    req = test_db.query(CustomerRequest).filter(CustomerRequest.id == "REQ-006").first()
    specs = ExtractedSpecifications(
        voltage=VoltageSpec(value=36.0, status="known"),
        connector=ConnectorSpec(value="DIN-4", status="known"),
        minimum_wattage=WattageSpec(value=40.0, status="known")
    )

    decision_agent = DecisionAgent()
    outcome, selected_part_id, reason, meta = decision_agent.evaluate_request(
        db=test_db,
        request=req,
        specs=specs,
        catalogue_parts=DEMO_PARTS
    )

    assert outcome == "HUMAN_REVIEW"
    assert selected_part_id is None
    assert "No technically compatible part exists" in reason

def test_16_all_six_requests_processed_terminal_outcomes(test_db):
    """TEST 16: All six customer requests are processed. Expected: Six terminal outcomes, each DISPATCHED or HUMAN_REVIEW."""
    batch_service = BatchService()
    summary = batch_service.run_batch(test_db, batch_id="TEST-BATCH-001")

    assert summary["status"] == "COMPLETED"
    assert summary["processed_requests"] == 6

    requests = test_db.query(CustomerRequest).filter(CustomerRequest.batch_id == "TEST-BATCH-001").all()
    assert len(requests) == 6

    for r in requests:
        assert r.status in ("DISPATCHED", "HUMAN_REVIEW")
        assert r.final_outcome in ("DISPATCH", "HUMAN_REVIEW")
        assert r.outcome_reason is not None and len(r.outcome_reason) > 0

    assert summary["dispatched_requests"] >= 1
    assert summary["human_review_requests"] >= 1
    assert summary["dispatched_requests"] + summary["human_review_requests"] == 6

def test_18_reset_demo_scenario(test_db):
    """TEST 18: Reset the demo scenario. Expected: Initial demo inventory and requests restored consistently."""
    batch_service = BatchService()

    # First run batch to mutate ledger stock and statuses
    batch_service.run_batch(test_db, batch_id="TEST-BATCH-001")

    # Now reset demo scenario
    res = batch_service.reset_demo_scenario(test_db)
    assert res["status"] == "RESET_SUCCESSFUL"
    assert res["total_requests"] == 6
    assert res["total_parts"] == 12

    # Check that stock ledger is restored to initial snapshot values
    parts = test_db.query(PartCatalogue).all()
    assert len(parts) == 12
    p101 = test_db.query(PartCatalogue).filter(PartCatalogue.id == "PART-101").first()
    assert p101.current_stock == 1

    # Check requests are reset to PENDING
    reqs = test_db.query(CustomerRequest).all()
    assert len(reqs) == 6
    for r in reqs:
        assert r.status == "PENDING"
        assert r.final_outcome is None
