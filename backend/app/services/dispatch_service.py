import uuid
from typing import Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.database_models import CustomerRequest, PartCatalogue, DispatchRecord
from app.integrations.dispatch_adapter import get_dispatch_adapter, BaseDispatchAdapter
from app.services.stock_service import StockService
from app.core.logging_config import logger

class DispatchService:
    """Service handling transactional part dispatch with idempotency protection and atomic stock updates."""

    def __init__(self, dispatch_adapter: Optional[BaseDispatchAdapter] = None, stock_service: Optional[StockService] = None):
        self.dispatch_adapter = dispatch_adapter or get_dispatch_adapter()
        self.stock_service = stock_service or StockService()

    def execute_dispatch(
        self,
        db: Session,
        request_id: str,
        part_id: str,
        idempotency_key: Optional[str] = None
    ) -> Tuple[bool, Optional[DispatchRecord], str]:
        """
        Executes safe dispatch:
        1. Checks idempotency.
        2. Validates that part stock is available in ledger.
        3. Invokes dispatch tool.
        4. If dispatch succeeds, atomically deducts stock.
        Returns: (success, dispatch_record, message)
        """
        key = idempotency_key or f"disp-req-{request_id}-part-{part_id}"

        # 1. Idempotency check against database
        existing = db.query(DispatchRecord).filter(DispatchRecord.idempotency_key == key).first()
        if existing:
            logger.info(f"Dispatch already recorded for idempotency key {key}. Returning existing record.")
            return True, existing, "Idempotency preserved: Part already dispatched."

        # 2. Check stock before calling dispatch tool
        part = db.query(PartCatalogue).filter(PartCatalogue.id == part_id).first()
        if not part:
            return False, None, f"Part {part_id} does not exist."

        if part.current_stock < 1:
            return False, None, f"Cannot dispatch: Part {part_id} has 0 available units."

        # 3. Call dispatch adapter
        tool_result = self.dispatch_adapter.dispatch_part(
            request_id=request_id,
            part_id=part_id,
            idempotency_key=key
        )

        if not tool_result.success:
            logger.error(f"Dispatch tool failed for request {request_id}, part {part_id}: {tool_result.error}")
            record = DispatchRecord(
                request_id=request_id,
                part_id=part_id,
                idempotency_key=key,
                status="FAILED",
                is_simulated=True,
                notes=tool_result.error
            )
            db.add(record)
            db.commit()
            return False, record, f"Dispatch failed: {tool_result.error}"

        # 4. Atomically deduct stock ONLY after tool reports success
        deducted = self.stock_service.deduct_stock_on_dispatch(db, part_id)
        if not deducted:
            logger.error(f"Failed to deduct stock for part {part_id} after dispatch.")
            return False, None, "Stock deduction failed after dispatch tool call."

        data = tool_result.data
        record = DispatchRecord(
            request_id=request_id,
            part_id=part_id,
            idempotency_key=key,
            status="SUCCESS",
            dispatch_reference=data.get("dispatch_reference"),
            is_simulated=data.get("is_simulated", True),
            notes=data.get("notes")
        )
        db.add(record)
        db.commit()

        return True, record, "Dispatch executed and ledger stock updated successfully."
