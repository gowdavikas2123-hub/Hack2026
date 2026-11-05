from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.database_models import Batch, SpendingRecord, ToolCallLog
from app.core.config import settings
from app.core.logging_config import logger

class BudgetService:
    """Service tracking cumulative spending across batches, managing token costs, and enforcing budget limits."""

    @staticmethod
    def record_llm_usage(
        db: Session,
        batch_id: str,
        request_id: Optional[str],
        prompt_tokens: int,
        completion_tokens: int,
        is_mock: bool = False
    ) -> float:
        batch = db.query(Batch).filter(Batch.id == batch_id).first()
        if not batch:
            return 0.0

        batch.llm_input_tokens += prompt_tokens
        batch.llm_output_tokens += completion_tokens

        prompt_cost = (prompt_tokens / 1_000_000) * settings.PRICE_INPUT_PER_1M
        completion_cost = (completion_tokens / 1_000_000) * settings.PRICE_OUTPUT_PER_1M
        total_llm_cost = round(prompt_cost + completion_cost, 6)

        batch.known_llm_spending += total_llm_cost
        batch.total_spending += total_llm_cost

        # Record spending detail
        rec_prompt = SpendingRecord(
            batch_id=batch_id,
            request_id=request_id,
            category="llm_prompt",
            units=prompt_tokens,
            unit_cost=settings.PRICE_INPUT_PER_1M / 1_000_000,
            total_cost=prompt_cost,
            is_priced=True
        )
        rec_comp = SpendingRecord(
            batch_id=batch_id,
            request_id=request_id,
            category="llm_completion",
            units=completion_tokens,
            unit_cost=settings.PRICE_OUTPUT_PER_1M / 1_000_000,
            total_cost=completion_cost,
            is_priced=True
        )
        db.add(rec_prompt)
        db.add(rec_comp)
        db.commit()

        return total_llm_cost

    @staticmethod
    def record_tool_call(
        db: Session,
        batch_id: str,
        request_id: Optional[str],
        tool_name: str,
        cost: float,
        execution_time_ms: float,
        status: str = "SUCCESS",
        input_payload: Optional[str] = None,
        output_payload: Optional[str] = None,
        error_message: Optional[str] = None,
        part_id: Optional[str] = None,
        tool_units: Optional[int] = None
    ):
        batch = db.query(Batch).filter(Batch.id == batch_id).first()
        if not batch:
            return

        # Determine platform tool unit cost (14 platform units total across all requests)
        # inspect: 1, clarify: 2, verify: 2, decisions: 0, invalid action: 1
        if tool_units is None:
            t_lower = tool_name.lower()
            if "inspect" in t_lower:
                tool_units = settings.COST_INSPECT_UNITS
            elif "clarif" in t_lower:
                tool_units = settings.COST_CLARIFY_UNITS
            elif "verif" in t_lower:
                tool_units = settings.COST_VERIFY_UNITS
            elif "dispatch" in t_lower or "decision" in t_lower:
                tool_units = settings.COST_DECISION_UNITS
            else:
                tool_units = 0

        batch.total_tool_calls += 1
        batch.total_actions_count = (batch.total_actions_count or 0) + 1
        batch.tool_units_spent = (batch.tool_units_spent or 0) + tool_units

        if "inspect" in tool_name.lower():
            batch.inspection_calls += 1
        elif "clarif" in tool_name.lower():
            batch.clarification_calls += 1
        elif "verif" in tool_name.lower():
            batch.verification_calls += 1
        elif "dispatch" in tool_name.lower():
            batch.dispatch_calls += 1

        batch.known_tool_spending += cost
        batch.total_spending += cost

        if cost == 0.0:
            batch.unpriced_operations += 1

        log_entry = ToolCallLog(
            batch_id=batch_id,
            request_id=request_id,
            tool_name=tool_name,
            part_id=part_id,
            input_payload=input_payload,
            output_payload=output_payload,
            status=status,
            error_message=error_message,
            cost=cost,
            execution_time_ms=execution_time_ms
        )
        db.add(log_entry)

        if cost > 0:
            rec = SpendingRecord(
                batch_id=batch_id,
                request_id=request_id,
                category=f"tool_{tool_name}",
                units=1.0,
                unit_cost=cost,
                total_cost=cost,
                is_priced=True
            )
            db.add(rec)

        db.commit()

    @staticmethod
    def can_invoke_tool(db: Session, batch_id: str, tool_name: str) -> bool:
        """
        Enforces:
        - All requests share 14 platform-measured tool units: inspect 1, clarify 2, verify 2. Decisions cost zero.
        - At most 60 actions per batch.
        - Tools may still be used after budget reaches zero only if their cost is zero.
        """
        batch = db.query(Batch).filter(Batch.id == batch_id).first()
        if not batch:
            return True

        # Check total actions limit (max 60 actions per batch)
        if (batch.total_actions_count or 0) >= (batch.max_actions_limit or 60):
            return False

        t_lower = tool_name.lower()
        if "inspect" in t_lower:
            cost_units = settings.COST_INSPECT_UNITS
        elif "clarif" in t_lower:
            cost_units = settings.COST_CLARIFY_UNITS
        elif "verif" in t_lower:
            cost_units = settings.COST_VERIFY_UNITS
        else:
            cost_units = 0

        # Decisions / zero cost tools are allowed even when budget is zero
        if cost_units == 0:
            return True

        remaining_units = max(0, (batch.tool_units_budget or 14) - (batch.tool_units_spent or 0))
        return remaining_units >= cost_units

    @staticmethod
    def is_budget_exceeded(db: Session, batch_id: str, estimated_next_cost: float = 0.05) -> bool:
        """Checks if current spending exceeds total budget limit or tool units exhausted."""
        batch = db.query(Batch).filter(Batch.id == batch_id).first()
        if not batch or batch.budget_limit <= 0:
            return False

        dollar_exceeded = (batch.total_spending + estimated_next_cost) > batch.budget_limit
        units_exceeded = (batch.tool_units_spent or 0) >= (batch.tool_units_budget or 14)
        return dollar_exceeded or units_exceeded

    @staticmethod
    def get_spending_summary(db: Session, batch_id: str) -> Dict[str, Any]:
        batch = db.query(Batch).filter(Batch.id == batch_id).first()
        if not batch:
            return {"error": "Batch not found"}

        records = db.query(SpendingRecord).filter(SpendingRecord.batch_id == batch_id).all()
        categories: Dict[str, float] = {}
        for r in records:
            categories[r.category] = round(categories.get(r.category, 0.0) + r.total_cost, 4)

        remaining = max(0.0, batch.budget_limit - batch.total_spending) if batch.budget_limit > 0 else 0.0
        units_budget = batch.tool_units_budget or settings.TOOL_UNIT_BUDGET
        units_spent = batch.tool_units_spent or 0
        units_remaining = max(0, units_budget - units_spent)

        # Indian Rupees (INR - ₹) calculations
        inr_rate = settings.USD_TO_INR_RATE
        total_inr = round(batch.total_spending * inr_rate, 2)
        budget_limit_inr = round(batch.budget_limit * inr_rate, 2)
        remaining_inr = round(remaining * inr_rate, 2)

        return {
            "batch_id": batch.id,
            "total_llm_input_tokens": batch.llm_input_tokens,
            "total_llm_output_tokens": batch.llm_output_tokens,
            "known_llm_spending": round(batch.known_llm_spending, 4),
            "known_tool_spending": round(batch.known_tool_spending, 4),
            "total_known_spending": round(batch.total_spending, 4),
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
            "breakdown_by_category": categories
        }
