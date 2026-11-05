from app.services.budget_service import BudgetService
from app.agents.decision_agent import DecisionAgent
from app.models.database_models import Batch, CustomerRequest
from app.models.schemas import ExtractedSpecifications, VoltageSpec, ConnectorSpec, WattageSpec

def test_15_spending_limit_halts_and_escalates_to_human(test_db):
    """TEST 15: Spending limit reached. Expected: No unsafe automatic action. Escalates to HUMAN_REVIEW."""
    batch = test_db.query(Batch).filter(Batch.id == "TEST-BATCH-001").first()
    # Artificially set budget to $0.05 and simulate accumulated spending of $0.06
    batch.budget_limit = 0.05
    batch.total_spending = 0.06
    test_db.commit()

    is_exceeded = BudgetService.is_budget_exceeded(test_db, batch_id=batch.id)
    assert is_exceeded is True

    req = test_db.query(CustomerRequest).filter(CustomerRequest.id == "REQ-001").first()
    specs = ExtractedSpecifications(
        voltage=VoltageSpec(value=12.0, status="known"),
        connector=ConnectorSpec(value="USB-C", status="known"),
        minimum_wattage=WattageSpec(value=20.0, status="known")
    )

    decision_agent = DecisionAgent()
    outcome, selected_part_id, reason, meta = decision_agent.evaluate_request(
        db=test_db,
        request=req,
        specs=specs,
        catalogue_parts=[],
        budget_exceeded=is_exceeded
    )

    assert outcome == "HUMAN_REVIEW"
    assert selected_part_id is None
    assert "budget limit exceeded" in reason

def test_cumulative_spending_tracking(test_db):
    """Verifies that spending records accumulate across multiple operations without resetting."""
    batch_id = "TEST-BATCH-001"

    cost1 = BudgetService.record_llm_usage(test_db, batch_id=batch_id, request_id="REQ-001", prompt_tokens=1000, completion_tokens=500)
    cost2 = BudgetService.record_llm_usage(test_db, batch_id=batch_id, request_id="REQ-002", prompt_tokens=2000, completion_tokens=800)

    summary = BudgetService.get_spending_summary(test_db, batch_id=batch_id)
    assert summary["total_llm_input_tokens"] == 3000
    assert summary["total_llm_output_tokens"] == 1300
    assert summary["total_known_spending"] > 0
    assert summary["remaining_budget"] < summary["budget_limit"]
