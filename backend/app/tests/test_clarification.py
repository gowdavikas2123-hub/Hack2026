from app.services.clarification_service import ClarificationService
from app.agents.specification_agent import SpecificationAgent
from app.agents.decision_agent import DecisionAgent
from app.models.database_models import CustomerRequest

def test_8_and_9_clarification_resolves_and_reextracts(test_db):
    """TEST 8 & 9: Clarification is attempted, customer script resolves it, and specs are re-extracted."""
    clarification_service = ClarificationService()
    spec_agent = SpecificationAgent()

    # REQ-003 has ambiguous/missing voltage ("forgot whether our board takes 5V or 12V")
    req = test_db.query(CustomerRequest).filter(CustomerRequest.id == "REQ-003").first()

    # Step 1: Initial extraction detects voltage ambiguity
    specs_1, _ = spec_agent.extract_specifications(req.original_message)
    assert specs_1.voltage.status == "ambiguous" or "voltage" in specs_1.ambiguous_fields

    # Step 2: Clarification tool called
    resolved, updated_text, record = clarification_service.handle_clarification(
        db=test_db,
        request=req,
        field_to_clarify="voltage"
    )

    assert resolved is True
    assert record.status == "COMPLETED"
    assert "5 volts" in record.scripted_customer_response

    # Step 3: Re-extraction with updated text
    specs_2, _ = spec_agent.extract_specifications(updated_text)
    assert specs_2.voltage.status == "known"
    assert specs_2.voltage.value == 5.0
    assert specs_2.connector.value == "USB-C"
    assert specs_2.minimum_wattage.value == 10.0

def test_10_clarification_unresolved_leads_to_human_review(test_db):
    """TEST 10: Clarification does not resolve missing information. Expected: HUMAN_REVIEW."""
    clarification_service = ClarificationService()
    decision_agent = DecisionAgent()
    spec_agent = SpecificationAgent()

    # Create dummy request with completely unknown requirements not covered by scripted clarifications
    dummy_req = CustomerRequest(
        id="REQ-TEST-UNRESOLVED",
        batch_id="TEST-BATCH-001",
        customer_name="Test Client",
        original_message="Please send me a power supply for my gear.",
        status="PENDING"
    )
    test_db.add(dummy_req)
    test_db.commit()

    # Initial extraction shows missing fields
    specs, _ = spec_agent.extract_specifications(dummy_req.original_message)
    assert "voltage" in specs.missing_fields

    # Attempt clarification on unscripted field
    resolved, updated_text, record = clarification_service.handle_clarification(
        db=test_db,
        request=dummy_req,
        field_to_clarify="voltage"
    )
    assert resolved is False
    assert record.status == "NO_SCRIPT_FOUND"

    # Evaluate decision: with unresolved specs, must escalate to HUMAN_REVIEW
    outcome, selected_part_id, reason, meta = decision_agent.evaluate_request(
        db=test_db,
        request=dummy_req,
        specs=specs,
        catalogue_parts=[]
    )
    assert outcome == "HUMAN_REVIEW"
    assert "incomplete or ambiguous" in reason
