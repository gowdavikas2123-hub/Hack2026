import uuid
import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models.database_models import (
    Batch, CustomerRequest, PartCatalogue, StockSnapshot, StockVerification,
    ClarificationRecord, DispatchRecord, DecisionRecord, ToolCallLog,
    EvidenceRecord, SpendingRecord, HumanReviewRecord, PersistentRequest
)
from app.fixtures.demo_scenario import DEMO_PARTS, DEMO_REQUESTS
from app.integrations.inspection_adapter import get_inspection_adapter
from app.agents.request_agent import RequestAgent
from app.services.budget_service import BudgetService
from app.core.config import settings
from app.core.logging_config import logger

class BatchService:
    """Service governing batch lifecycles, orchestration of all 6 customer requests, and demo scenario reset."""

    def __init__(self):
        self.inspection_adapter = get_inspection_adapter()
        self.request_agent = RequestAgent()

    def reset_demo_scenario(self, db: Session) -> Dict[str, Any]:
        """
        Resets and seeds the demo environment strictly with:
        - Exactly 12 parts with prose specifications and RECENT/AGED snapshots
        - Exactly 6 customer requests
        - Exactly 2 aged snapshot discrepancies (PART-105: 1->0, PART-108: 0->1)
        - Fresh active batch
        """
        logger.info("Resetting demo scenario to initial pristine challenge state...")

        # Clear existing transient run data (preserve custom requests in persistent memory)
        try:
            existing_custom = db.query(CustomerRequest).filter(~CustomerRequest.id.like("REQ-00%")).all()
            for c in existing_custom:
                exists = db.query(PersistentRequest).filter(PersistentRequest.id == c.id).first()
                if not exists:
                    db.add(PersistentRequest(
                        id=c.id,
                        batch_id=c.batch_id,
                        customer_name=c.customer_name,
                        original_message=c.original_message,
                        updated_message=c.updated_message,
                        part_type=getattr(c, 'part_type', 'Power Supply'),
                        extracted_voltage=c.extracted_voltage,
                        voltage_unit=c.voltage_unit,
                        extracted_connector=c.extracted_connector,
                        extracted_min_wattage=c.extracted_min_wattage,
                        wattage_unit=c.wattage_unit,
                        missing_fields_json=c.missing_fields_json,
                        status=c.status,
                        final_outcome=c.final_outcome,
                        selected_part_id=c.selected_part_id,
                        outcome_reason=c.outcome_reason
                    ))
            db.commit()
        except Exception as e:
            logger.warning(f"Note on archiving persistent requests: {e}")

        # Clear existing transient run data
        db.query(HumanReviewRecord).delete()
        db.query(DecisionRecord).delete()
        db.query(DispatchRecord).delete()
        db.query(ClarificationRecord).delete()
        db.query(StockVerification).delete()
        db.query(EvidenceRecord).delete()
        db.query(SpendingRecord).delete()
        db.query(ToolCallLog).delete()
        db.query(CustomerRequest).delete()
        db.query(StockSnapshot).delete()
        db.query(PartCatalogue).delete()
        db.query(Batch).delete()
        db.commit()

        # Seed 12 catalogue parts and initial stock snapshots
        for p in DEMO_PARTS:
            part = PartCatalogue(
                id=p["id"],
                name=p["name"],
                voltage=p["voltage"],
                connector=p["connector"],
                wattage=p["wattage"],
                technical_description=p["technical_description"],
                compatibility_notes=p.get("compatibility_notes"),
                current_stock=p["snapshot_quantity"]  # initial ledger reflects snapshot
            )
            db.add(part)
            db.flush()

            snapshot = StockSnapshot(
                part_id=p["id"],
                snapshot_quantity=p["snapshot_quantity"],
                freshness=p["snapshot_freshness"]
            )
            db.add(snapshot)

        # Create active primary batch with 14 shared tool units & 60 action limit
        batch_id = "BATCH-001"
        batch = Batch(
            id=batch_id,
            status="PENDING",
            total_requests=len(DEMO_REQUESTS),
            processed_requests=0,
            dispatched_requests=0,
            human_review_requests=0,
            budget_limit=5.00,
            tool_units_budget=settings.TOOL_UNIT_BUDGET,
            tool_units_spent=0,
            total_actions_count=0,
            max_actions_limit=settings.MAX_ACTIONS_PER_BATCH
        )
        db.add(batch)
        db.flush()

        # Seed 6 customer requests linked to the batch
        for r in DEMO_REQUESTS:
            req = CustomerRequest(
                id=r["id"],
                batch_id=batch_id,
                customer_name=r["customer_name"],
                original_message=r["original_message"],
                status="PENDING"
            )
            db.add(req)

            # Also remember in persistent history if not already recorded
            pers = db.query(PersistentRequest).filter(PersistentRequest.id == r["id"]).first()
            if not pers:
                db.add(PersistentRequest(
                    id=r["id"],
                    batch_id=batch_id,
                    customer_name=r["customer_name"],
                    original_message=r["original_message"],
                    status="PENDING"
                ))

        db.commit()
        logger.info(f"Demo scenario initialized with 12 parts and 6 requests under {batch_id}.")
        return {"batch_id": batch_id, "status": "RESET_SUCCESSFUL", "total_requests": len(DEMO_REQUESTS), "total_parts": len(DEMO_PARTS)}

    def run_batch(self, db: Session, batch_id: str) -> Dict[str, Any]:
        """Processes all pending requests in the batch sequentially until terminal outcome."""
        batch = db.query(Batch).filter(Batch.id == batch_id).first()
        if not batch:
            return {"error": f"Batch {batch_id} not found"}

        if batch.status in ("COMPLETED", "FAILED"):
            return {"message": f"Batch is already in terminal state: {batch.status}", "batch_id": batch_id}

        batch.status = "RUNNING"
        db.commit()

        # Step 3: Inspect parts catalogue once at batch level
        inspection_result = self.inspection_adapter.inspect_parts()
        catalogue_parts = inspection_result.data or DEMO_PARTS

        BudgetService.record_tool_call(
            db, batch_id=batch.id, request_id=None,
            tool_name="inspection", cost=inspection_result.cost,
            execution_time_ms=inspection_result.execution_time_ms,
            status="SUCCESS",
            input_payload="Inspect full catalogue and stock snapshots",
            output_payload=f"Retrieved {len(catalogue_parts)} parts.",
            tool_units=settings.COST_INSPECT_UNITS
        )

        requests = db.query(CustomerRequest).filter(
            CustomerRequest.batch_id == batch_id
        ).order_by(CustomerRequest.id.asc()).all()

        for req in requests:
            # Check if paused
            db.refresh(batch)
            if batch.status == "PAUSED":
                logger.info(f"Batch {batch_id} processing paused.")
                break

            # Skip already terminal requests
            if req.status in ("DISPATCHED", "HUMAN_REVIEW"):
                continue

            logger.info(f"Processing request {req.id}: {req.original_message[:40]}...")
            self.request_agent.process_request(
                db=db,
                batch_id=batch_id,
                request_id=req.id,
                catalogue_parts=catalogue_parts
            )

            # Update batch stats
            db.refresh(batch)
            batch.processed_requests = db.query(CustomerRequest).filter(
                CustomerRequest.batch_id == batch_id,
                CustomerRequest.status.in_(["DISPATCHED", "HUMAN_REVIEW", "FAILED"])
            ).count()

            batch.dispatched_requests = db.query(CustomerRequest).filter(
                CustomerRequest.batch_id == batch_id,
                CustomerRequest.status == "DISPATCHED"
            ).count()

            batch.human_review_requests = db.query(CustomerRequest).filter(
                CustomerRequest.batch_id == batch_id,
                CustomerRequest.status == "HUMAN_REVIEW"
            ).count()
            db.commit()

        db.refresh(batch)
        if batch.processed_requests >= batch.total_requests:
            batch.status = "COMPLETED"
        elif batch.status != "PAUSED":
            batch.status = "RUNNING"

        db.commit()
        return self.get_batch_summary(db, batch_id)

    def pause_batch(self, db: Session, batch_id: str) -> Dict[str, Any]:
        batch = db.query(Batch).filter(Batch.id == batch_id).first()
        if not batch:
            return {"error": "Batch not found"}
        batch.status = "PAUSED"
        db.commit()
        return {"batch_id": batch.id, "status": batch.status}

    def resume_batch(self, db: Session, batch_id: str) -> Dict[str, Any]:
        batch = db.query(Batch).filter(Batch.id == batch_id).first()
        if not batch:
            return {"error": "Batch not found"}
        batch.status = "RUNNING"
        db.commit()
        return self.run_batch(db, batch_id)

    def get_batch_summary(self, db: Session, batch_id: str) -> Dict[str, Any]:
        batch = db.query(Batch).filter(Batch.id == batch_id).first()
        if not batch:
            return {"error": "Batch not found"}

        remaining = max(0.0, batch.budget_limit - batch.total_spending) if batch.budget_limit > 0 else 0.0
        units_budget = batch.tool_units_budget or settings.TOOL_UNIT_BUDGET
        units_spent = batch.tool_units_spent or 0
        units_remaining = max(0, units_budget - units_spent)

        inr_rate = settings.USD_TO_INR_RATE
        total_inr = round(batch.total_spending * inr_rate, 2)
        budget_limit_inr = round(batch.budget_limit * inr_rate, 2)
        remaining_inr = round(remaining * inr_rate, 2)

        return {
            "id": batch.id,
            "status": batch.status,
            "total_requests": batch.total_requests,
            "processed_requests": batch.processed_requests,
            "dispatched_requests": batch.dispatched_requests,
            "human_review_requests": batch.human_review_requests,
            "pending_requests": max(0, batch.total_requests - batch.processed_requests),
            "total_tool_calls": batch.total_tool_calls,
            "inspection_calls": batch.inspection_calls,
            "clarification_calls": batch.clarification_calls,
            "verification_calls": batch.verification_calls,
            "dispatch_calls": batch.dispatch_calls,
            "llm_input_tokens": batch.llm_input_tokens,
            "llm_output_tokens": batch.llm_output_tokens,
            "known_llm_spending": round(batch.known_llm_spending, 4),
            "known_tool_spending": round(batch.known_tool_spending, 4),
            "total_spending": round(batch.total_spending, 4),
            "total_spending_inr": total_inr,
            "budget_limit": batch.budget_limit,
            "budget_limit_inr": budget_limit_inr,
            "remaining_budget": round(remaining, 4),
            "remaining_budget_inr": remaining_inr,
            "unpriced_operations": batch.unpriced_operations,
            "tool_units_budget": units_budget,
            "tool_units_spent": units_spent,
            "tool_units_remaining": units_remaining,
            "total_actions_count": batch.total_actions_count or 0,
            "max_actions_limit": batch.max_actions_limit or settings.MAX_ACTIONS_PER_BATCH,
            "created_at": batch.created_at,
            "updated_at": batch.updated_at
        }
