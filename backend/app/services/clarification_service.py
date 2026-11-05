from typing import Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.database_models import ClarificationRecord, CustomerRequest
from app.integrations.clarification_adapter import get_clarification_adapter, BaseClarificationAdapter
from app.core.logging_config import logger

class ClarificationService:
    """Service orchestrating customer clarification workflows and updating request specifications."""

    def __init__(self, clarification_adapter: Optional[BaseClarificationAdapter] = None):
        self.clarification_adapter = clarification_adapter or get_clarification_adapter()

    def handle_clarification(
        self,
        db: Session,
        request: CustomerRequest,
        field_to_clarify: str
    ) -> Tuple[bool, Optional[str], Optional[ClarificationRecord]]:
        """
        Executes clarification with the scripted clarification tool.
        Returns: (resolved, updated_message_text, clarification_record)
        """
        # Rule 7: Do not repeatedly ask the same question
        previous_count = db.query(ClarificationRecord).filter(
            ClarificationRecord.request_id == request.id,
            ClarificationRecord.field_to_clarify == field_to_clarify
        ).count()

        if previous_count >= 1:
            logger.warning(f"Clarification already attempted for request {request.id} field {field_to_clarify}. Avoiding loop.")
            return False, None, None

        question = f"Could you please clarify your requirement for {field_to_clarify}?"
        tool_result = self.clarification_adapter.clarify_request(
            request_id=request.id,
            field_to_clarify=field_to_clarify,
            question=question
        )

        record = ClarificationRecord(
            request_id=request.id,
            field_to_clarify=field_to_clarify,
            question_asked=question,
            scripted_customer_response=tool_result.data.get("response") if tool_result.data else None,
            status="COMPLETED" if tool_result.success else "NO_SCRIPT_FOUND",
            attempt_number=previous_count + 1
        )
        db.add(record)
        db.commit()

        if tool_result.success and tool_result.data and tool_result.data.get("resolved"):
            customer_reply = tool_result.data["response"]
            # Append clarification response to customer request text for re-extraction
            combined_message = f"{request.original_message}\nCustomer clarification [{field_to_clarify}]: {customer_reply}"
            request.updated_message = combined_message
            db.commit()
            return True, combined_message, record
        else:
            return False, None, record
