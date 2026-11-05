import json
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.models.database_models import CustomerRequest, Batch, PersistentRequest
from app.agents.specification_agent import SpecificationAgent
from app.agents.decision_agent import DecisionAgent
from app.services.clarification_service import ClarificationService
from app.services.stock_service import StockService
from app.services.dispatch_service import DispatchService
from app.services.evidence_service import EvidenceService
from app.services.budget_service import BudgetService
from app.core.config import settings
from app.core.logging_config import logger

class RequestAgent:
    """Agent orchestrating end-to-end lifecycle for an individual customer request."""

    def __init__(
        self,
        spec_agent: Optional[SpecificationAgent] = None,
        decision_agent: Optional[DecisionAgent] = None,
        clarification_service: Optional[ClarificationService] = None,
        stock_service: Optional[StockService] = None,
        dispatch_service: Optional[DispatchService] = None
    ):
        self.spec_agent = spec_agent or SpecificationAgent()
        self.clarification_service = clarification_service or ClarificationService()
        self.stock_service = stock_service or StockService()
        self.decision_agent = decision_agent or DecisionAgent(stock_service=self.stock_service)
        self.dispatch_service = dispatch_service or DispatchService(stock_service=self.stock_service)

    def process_request(
        self,
        db: Session,
        batch_id: str,
        request_id: str,
        catalogue_parts: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Processes a single customer request through Steps 2 through 10."""
        req = db.query(CustomerRequest).filter(CustomerRequest.id == request_id).first()
        if not req:
            return {"error": f"Request {request_id} not found"}

        req.status = "PROCESSING"
        db.commit()

        # Step 1: Record initial evidence of customer message
        EvidenceService.record_evidence(
            db, request_id=req.id, source_type="customer_message",
            evidence_text=req.original_message,
            interpretation="Initial inbound customer message received."
        )

        # Step 2: Understand request / extract specifications
        text_to_analyze = req.updated_message if req.updated_message else req.original_message
        specs, token_usage = self.spec_agent.extract_specifications(text_to_analyze)

        # Record LLM usage & spending
        BudgetService.record_llm_usage(
            db, batch_id=batch_id, request_id=req.id,
            prompt_tokens=token_usage.get("prompt_tokens", 80),
            completion_tokens=token_usage.get("completion_tokens", 40),
            is_mock=token_usage.get("is_mock", True)
        )

        # Update request entity with extracted specs
        req.extracted_voltage = specs.voltage.value
        req.voltage_unit = specs.voltage.unit
        req.voltage_status = specs.voltage.status
        req.voltage_evidence = specs.voltage.evidence

        req.extracted_connector = specs.connector.value
        req.connector_status = specs.connector.status
        req.connector_evidence = specs.connector.evidence

        req.extracted_min_wattage = specs.minimum_wattage.value
        req.wattage_unit = specs.minimum_wattage.unit
        req.wattage_status = specs.minimum_wattage.status
        req.wattage_evidence = specs.minimum_wattage.evidence

        req.missing_fields_json = json.dumps(specs.missing_fields)
        req.ambiguous_fields_json = json.dumps(specs.ambiguous_fields)
        db.commit()

        # Step 3b: Wattage Clarification Avoidance Rule (Organizer Hackathon Measure):
        # "A verified 20 W part can therefore avoid a wattage clarification when the other requirements match."
        if ("wattage" in specs.missing_fields or "wattage" in specs.ambiguous_fields) and specs.voltage.value and specs.connector.value:
            has_20w_match = False
            for p in catalogue_parts:
                part_v = p.get("voltage")
                part_c = p.get("connector", "").lower()
                part_w = p.get("wattage", 0)
                if part_v == specs.voltage.value and (specs.connector.value.lower() in part_c or part_c in specs.connector.value.lower()) and part_w >= 20.0:
                    has_20w_match = True
                    break
            if has_20w_match:
                logger.info(f"Wattage clarification avoided for {req.id} because verified 20W+ compatible part exists.")
                specs.missing_fields = [f for f in specs.missing_fields if f != "wattage"]
                specs.ambiguous_fields = [f for f in specs.ambiguous_fields if f != "wattage"]
                if not specs.minimum_wattage.value:
                    specs.minimum_wattage.value = 10.0
                specs.minimum_wattage.status = "known"
                specs.minimum_wattage.evidence = "Satisfied by verified 20W+ part without clarification"
                req.extracted_min_wattage = specs.minimum_wattage.value
                req.missing_fields_json = json.dumps(specs.missing_fields)
                req.ambiguous_fields_json = json.dumps(specs.ambiguous_fields)
                db.commit()

        # Step 4: Handle missing or ambiguous specifications with Clarification Tool
        needs_clarification = (len(specs.missing_fields) > 0 or len(specs.ambiguous_fields) > 0)
        if needs_clarification:
            # Check platform tool units budget (clarification costs 2 units)
            can_clarify = BudgetService.can_invoke_tool(db, batch_id=batch_id, tool_name="clarification")
            if not can_clarify:
                logger.warning(f"Platform tool units budget (14 units) reached; cannot invoke clarification for {req.id}.")
                req.status = "HUMAN_REVIEW"
                req.final_outcome = "HUMAN_REVIEW"
                req.outcome_reason = "Platform tool unit budget (14 units) reached; clarification cannot be invoked."
                EvidenceService.record_evidence(
                    db, request_id=req.id, source_type="human_review",
                    evidence_text=req.outcome_reason,
                    interpretation="Tool units exhausted. Referred to human operator without extra cost."
                )
                db.commit()
                self._persist_request_memory(db, req, batch_id)
                return {
                    "request_id": req.id,
                    "status": req.status,
                    "final_outcome": req.final_outcome,
                    "selected_part_id": None,
                    "reason": req.outcome_reason
                }

            req.status = "CLARIFICATION_REQUIRED"
            db.commit()

            field_to_clarify = (specs.ambiguous_fields + specs.missing_fields)[0]
            logger.info(f"Request {req.id} requires clarification on field '{field_to_clarify}'")

            resolved, updated_text, clarif_rec = self.clarification_service.handle_clarification(
                db=db,
                request=req,
                field_to_clarify=field_to_clarify
            )

            # Record tool call in log (costs 2 tool units)
            BudgetService.record_tool_call(
                db, batch_id=batch_id, request_id=req.id,
                tool_name="clarification", cost=0.0, execution_time_ms=5.0,
                status="SUCCESS" if resolved else "FAILED",
                input_payload=f"Field: {field_to_clarify}",
                output_payload=clarif_rec.scripted_customer_response if clarif_rec else "None",
                tool_units=settings.COST_CLARIFY_UNITS
            )

            if resolved and updated_text:
                EvidenceService.record_evidence(
                    db, request_id=req.id, source_type="clarification",
                    evidence_text=clarif_rec.scripted_customer_response,
                    interpretation=f"Scripted customer response resolved field '{field_to_clarify}'"
                )

                # Re-extract specifications
                specs, token_usage_re = self.spec_agent.extract_specifications(updated_text)
                BudgetService.record_llm_usage(
                    db, batch_id=batch_id, request_id=req.id,
                    prompt_tokens=token_usage_re.get("prompt_tokens", 90),
                    completion_tokens=token_usage_re.get("completion_tokens", 45),
                    is_mock=token_usage_re.get("is_mock", True)
                )

                req.extracted_voltage = specs.voltage.value
                req.voltage_status = specs.voltage.status
                req.voltage_evidence = specs.voltage.evidence
                req.extracted_connector = specs.connector.value
                req.connector_status = specs.connector.status
                req.connector_evidence = specs.connector.evidence
                req.extracted_min_wattage = specs.minimum_wattage.value
                req.wattage_status = specs.minimum_wattage.status
                req.wattage_evidence = specs.minimum_wattage.evidence
                req.missing_fields_json = json.dumps(specs.missing_fields)
                req.ambiguous_fields_json = json.dumps(specs.ambiguous_fields)
                db.commit()

        # Step 5 & 6 & 7: Check stock, compatibility, and make final decision
        req.status = "STOCK_CHECK"
        db.commit()

        budget_exceeded = BudgetService.is_budget_exceeded(db, batch_id=batch_id)
        outcome, selected_part_id, reason, audit_meta = self.decision_agent.evaluate_request(
            db=db,
            request=req,
            specs=specs,
            catalogue_parts=catalogue_parts,
            budget_exceeded=budget_exceeded
        )

        req.final_outcome = outcome
        req.outcome_reason = reason
        req.selected_part_id = selected_part_id

        # Step 8: Execute dispatch if outcome is DISPATCH (costs 0 tool units)
        if outcome == "DISPATCH" and selected_part_id:
            success, disp_rec, msg = self.dispatch_service.execute_dispatch(
                db=db,
                request_id=req.id,
                part_id=selected_part_id
            )
            BudgetService.record_tool_call(
                db, batch_id=batch_id, request_id=req.id,
                tool_name="dispatch", cost=0.0, execution_time_ms=10.0,
                status="SUCCESS" if success else "FAILED",
                part_id=selected_part_id,
                input_payload=f"Request: {req.id}, Part: {selected_part_id}",
                output_payload=disp_rec.dispatch_reference if disp_rec else msg,
                error_message=None if success else msg,
                tool_units=settings.COST_DECISION_UNITS
            )

            if success:
                req.status = "DISPATCHED"
                EvidenceService.record_evidence(
                    db, request_id=req.id, source_type="dispatch",
                    source_reference=disp_rec.dispatch_reference if disp_rec else None,
                    evidence_text=f"Part {selected_part_id} dispatched. Ref: {disp_rec.dispatch_reference if disp_rec else 'N/A'}",
                    interpretation="Transactional simulated dispatch verified."
                )
            else:
                req.status = "FAILED"
                req.outcome_reason = f"Dispatch failed: {msg}"
        else:
            req.status = "HUMAN_REVIEW"
            EvidenceService.record_evidence(
                db, request_id=req.id, source_type="human_review",
                evidence_text=reason,
                interpretation="Escalated to human supervisor."
            )

        db.commit()

        # Permanent Memory: Record and remember in PersistentRequest
        self._persist_request_memory(db, req, batch_id)

        return {
            "request_id": req.id,
            "status": req.status,
            "final_outcome": req.final_outcome,
            "selected_part_id": req.selected_part_id,
            "reason": req.outcome_reason
        }

    def _persist_request_memory(self, db: Session, req: CustomerRequest, batch_id: str):
        """Records and remembers the request in permanent memory."""
        try:
            pers = db.query(PersistentRequest).filter(PersistentRequest.id == req.id).first()
            if not pers:
                pers = PersistentRequest(id=req.id)
                db.add(pers)
            pers.batch_id = batch_id
            pers.customer_name = req.customer_name
            pers.original_message = req.original_message
            pers.updated_message = req.updated_message
            pers.part_type = getattr(req, 'part_type', 'Power Supply')
            pers.extracted_voltage = req.extracted_voltage
            pers.voltage_unit = req.voltage_unit
            pers.extracted_connector = req.extracted_connector
            pers.extracted_min_wattage = req.extracted_min_wattage
            pers.wattage_unit = req.wattage_unit
            pers.missing_fields_json = req.missing_fields_json
            pers.status = req.status
            pers.final_outcome = req.final_outcome
            pers.selected_part_id = req.selected_part_id
            pers.outcome_reason = req.outcome_reason
            batch = db.query(Batch).filter(Batch.id == batch_id).first()
            pers.cost_inr = round((batch.total_spending if batch else 0.0) * settings.USD_TO_INR_RATE, 2)
            db.commit()
        except Exception as e:
            logger.warning(f"Error persisting request memory: {e}")
