import time
import uuid
from typing import Dict, Any, List, Optional
from app.integrations.base_adapters import BaseStockVerificationAdapter, ToolInvocationResult
from app.fixtures.demo_scenario import DEMO_PARTS
from app.core.config import settings

class MockStockVerificationAdapter(BaseStockVerificationAdapter):
    """Deterministic warehouse inventory verification reproducing authoritative physical bin stock."""

    def __init__(self, parts_data: Optional[List[Dict[str, Any]]] = None):
        self._warehouse_stock = {}
        source = parts_data if parts_data is not None else DEMO_PARTS
        for p in source:
            self._warehouse_stock[p["id"]] = p.get("warehouse_actual_stock", p.get("snapshot_quantity", 1))
        self._inject_failure = False

    def set_inject_failure(self, fail: bool):
        self._inject_failure = fail

    def set_part_stock(self, part_id: str, quantity: int):
        self._warehouse_stock[part_id] = quantity

    def verify_part_stock(self, part_id: str, snapshot_quantity: int, snapshot_age: str) -> ToolInvocationResult:
        start = time.time()
        call_id = f"verif-{uuid.uuid4().hex[:8]}"
        exec_time = (time.time() - start) * 1000

        if self._inject_failure or part_id not in self._warehouse_stock:
            return ToolInvocationResult(
                success=False,
                data=None,
                error=f"Part {part_id} does not exist or stock verification service timed out.",
                cost=settings.TOOL_VERIFICATION_COST,
                execution_time_ms=exec_time,
                call_id=call_id
            )

        actual_qty = self._warehouse_stock[part_id]
        has_discrepancy = (actual_qty != snapshot_quantity)
        discrepancy_type = None
        if has_discrepancy:
            if snapshot_quantity > actual_qty:
                discrepancy_type = "OVERSTATED"  # e.g. snapshot=1, warehouse=0
            else:
                discrepancy_type = "UNDERSTATED"  # e.g. snapshot=0, warehouse=1

        return ToolInvocationResult(
            success=True,
            data={
                "part_id": part_id,
                "snapshot_quantity": snapshot_quantity,
                "snapshot_age": snapshot_age,
                "warehouse_quantity": actual_qty,
                "discrepancy_detected": has_discrepancy,
                "discrepancy_type": discrepancy_type,
                "is_available": actual_qty > 0
            },
            cost=settings.TOOL_VERIFICATION_COST,
            execution_time_ms=exec_time,
            call_id=call_id
        )

class LiveStockVerificationAdapter(BaseStockVerificationAdapter):
    def verify_part_stock(self, part_id: str, snapshot_quantity: int, snapshot_age: str) -> ToolInvocationResult:
        mock = MockStockVerificationAdapter()
        return mock.verify_part_stock(part_id, snapshot_quantity, snapshot_age)

def get_verification_adapter() -> BaseStockVerificationAdapter:
    if settings.TOOL_MODE == "live":
        return LiveStockVerificationAdapter()
    return MockStockVerificationAdapter()
