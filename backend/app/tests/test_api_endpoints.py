import pytest
from fastapi import HTTPException
from app.api.routes import (
    catalogue_routes, batch_routes, request_routes,
    dispatch_routes, review_routes, analytics_routes
)
from app.models.schemas import ResolveRequestInput
from app.api.routes.analytics_routes import ChatMessageInput
from app.main import health_check, get_scenario_metadata

def test_api_health():
    res = health_check()
    assert res["status"] == "HEALTHY"
    assert res["database"] == "sqlite_connected"

def test_api_scenario():
    res = get_scenario_metadata()
    assert res["requests_count"] == 6
    assert res["parts_count"] == 12
    assert len(res["aged_discrepancies"]) == 2

def test_api_catalogue(test_db):
    parts = catalogue_routes.get_all_parts(db=test_db)
    assert len(parts) == 12

    part = catalogue_routes.get_part_by_id("PART-101", db=test_db)
    assert part.id == "PART-101"
    assert part.voltage == 12.0
    assert part.connector == "USB-C"

def test_api_batch_lifecycle_and_dispatches(test_db):
    # Run batch
    run_res = batch_routes.run_batch("TEST-BATCH-001", db=test_db)
    assert run_res.processed_requests == 6
    assert run_res.dispatched_requests + run_res.human_review_requests == 6

    # Get requests
    reqs = request_routes.get_batch_requests("TEST-BATCH-001", db=test_db)
    assert len(reqs) == 6

    # Get dispatches
    dispatches = dispatch_routes.get_batch_dispatches("TEST-BATCH-001", db=test_db)
    assert len(dispatches) >= 1
    assert dispatches[0]["is_simulated"] is True

    # Get audit
    audit = analytics_routes.get_batch_audit_trail("TEST-BATCH-001", db=test_db)
    assert len(audit["audit_trail"]) == 6

    # Get evidence
    evidence = analytics_routes.get_batch_evidence("TEST-BATCH-001", db=test_db)
    assert len(evidence) > 0

    # Get spending
    spending = analytics_routes.get_batch_spending("TEST-BATCH-001", db=test_db)
    assert spending.total_known_spending > 0

    # Get tool logs
    logs = analytics_routes.get_tool_call_logs("TEST-BATCH-001", db=test_db)
    assert len(logs) > 0

def test_api_human_review_revalidation_and_cancellation(test_db):
    # Ensure batch is run
    batch_routes.run_batch("TEST-BATCH-001", db=test_db)

    # REQ-004 requires 12V. PART-104 is 5V. Must be rejected by safety revalidation!
    with pytest.raises(HTTPException) as exc_info:
        review_routes.resolve_human_review(
            request_id="REQ-004",
            payload=ResolveRequestInput(
                action="DISPATCH",
                part_id="PART-104",
                operator_name="Supervisor",
                notes="Attempt invalid manual dispatch"
            ),
            db=test_db
        )
    assert exc_info.value.status_code == 400
    assert "Voltage mismatch" in exc_info.value.detail

    # Test valid cancellation
    cancel_res = review_routes.resolve_human_review(
        request_id="REQ-006",
        payload=ResolveRequestInput(
            action="CANCEL",
            operator_name="Supervisor",
            notes="36V part not found"
        ),
        db=test_db
    )
    assert cancel_res["status"] == "RESOLVED_CANCELLED"

def test_api_chatbot_assistant(test_db):
    res = analytics_routes.chatbot_assistant(
        payload=ChatMessageInput(message="What are the aged stock discrepancies?", batch_id="TEST-BATCH-001"),
        db=test_db
    )
    assert "PART-105" in res["reply"]
    assert "PART-108" in res["reply"]

def test_api_custom_customer_request_input_and_search(test_db):
    from app.api.routes import request_routes
    from app.models.schemas import CustomerRequestInput

    # User inputs a custom natural language request
    input_payload = CustomerRequestInput(
        message="I need a 12V power unit with a USB-C connector and at least 20W.",
        customer_name="Custom User Workshop",
        batch_id="TEST-BATCH-001"
    )

    result = request_routes.submit_and_process_custom_request(
        payload=input_payload,
        db=test_db
    )

    assert result.status == "DISPATCHED"
    assert result.extracted_voltage == 12.0
    assert result.extracted_connector == "USB-C"
    assert result.extracted_min_wattage == 20.0
    # In demo parts, PART-101 is 12V USB-C 20W RECENT stock
    assert result.selected_part_id == "PART-101"
    assert result.final_outcome == "DISPATCH"


def test_api_chatbot_part_search_intent(test_db):
    res = analytics_routes.chatbot_assistant(
        payload=ChatMessageInput(message="Can you search for a 12V USB-C part with 20W?", batch_id="TEST-BATCH-001"),
        db=test_db
    )
    assert "PART-101" in res["reply"]
    assert "Recommended Part" in res["reply"]

def test_api_persistent_request_memory_history(test_db):
    """Verifies that the system records and remembers all customer requests across batches."""
    from app.api.routes import request_routes
    history = request_routes.get_all_remembered_requests_history(db=test_db)
    assert len(history) >= 6
    for h in history:
        assert h.id is not None
        assert h.original_message is not None

def test_api_platform_tool_units_and_inr_spending(test_db):
    """Verifies official platform measures: 14 tool units budget, 60 actions, and INR spending."""
    from app.api.routes import batch_routes
    batch = batch_routes.get_batch(batch_id="TEST-BATCH-001", db=test_db)
    assert batch.tool_units_budget == 14
    assert batch.max_actions_limit == 60
    assert batch.tool_units_spent <= 14
    assert batch.total_actions_count <= 60
    assert batch.total_spending_inr is not None
    assert batch.total_spending_inr >= 0.0


