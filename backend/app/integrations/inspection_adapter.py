import time
import uuid
from typing import Dict, Any, List, Optional
from app.integrations.base_adapters import BaseInspectionAdapter, ToolInvocationResult
from app.fixtures.demo_scenario import DEMO_PARTS
from app.core.config import settings

class MockInspectionAdapter(BaseInspectionAdapter):
    """Deterministic mock inspection adapter reproducing challenge catalogue and snapshot freshness."""

    def __init__(self, parts_data: Optional[List[Dict[str, Any]]] = None):
        self._parts = parts_data or DEMO_PARTS

    def inspect_parts(self) -> ToolInvocationResult:
        start = time.time()
        call_id = f"insp-{uuid.uuid4().hex[:8]}"
        exec_time = (time.time() - start) * 1000
        return ToolInvocationResult(
            success=True,
            data=[p.copy() for p in self._parts],
            cost=settings.TOOL_INSPECTION_COST,
            execution_time_ms=exec_time,
            call_id=call_id
        )

    def retrieve_catalogue(self) -> ToolInvocationResult:
        start = time.time()
        call_id = f"cat-{uuid.uuid4().hex[:8]}"
        catalogue_items = [
            {
                "id": p["id"],
                "name": p["name"],
                "voltage": p["voltage"],
                "connector": p["connector"],
                "wattage": p["wattage"],
                "technical_description": p["technical_description"],
                "compatibility_notes": p.get("compatibility_notes", "")
            }
            for p in self._parts
        ]
        exec_time = (time.time() - start) * 1000
        return ToolInvocationResult(
            success=True,
            data=catalogue_items,
            cost=settings.TOOL_INSPECTION_COST,
            execution_time_ms=exec_time,
            call_id=call_id
        )

    def retrieve_stock_snapshot(self, part_id: str) -> ToolInvocationResult:
        start = time.time()
        call_id = f"snap-{uuid.uuid4().hex[:8]}"
        part = next((p for p in self._parts if p["id"] == part_id), None)
        exec_time = (time.time() - start) * 1000
        if not part:
            return ToolInvocationResult(
                success=False,
                data=None,
                error=f"Part {part_id} not found in inspection snapshot.",
                cost=settings.TOOL_INSPECTION_COST,
                execution_time_ms=exec_time,
                call_id=call_id
            )
        return ToolInvocationResult(
            success=True,
            data={
                "part_id": part["id"],
                "snapshot_quantity": part["snapshot_quantity"],
                "freshness": part["snapshot_freshness"]
            },
            cost=settings.TOOL_INSPECTION_COST,
            execution_time_ms=exec_time,
            call_id=call_id
        )

class LiveInspectionAdapter(BaseInspectionAdapter):
    """Adapter for connecting to live hackathon inspection tool or external service."""
    def __init__(self, endpoint_url: Optional[str] = None):
        self.endpoint_url = endpoint_url

    def inspect_parts(self) -> ToolInvocationResult:
        # Fallback to mock with clear notation if no external server URL provided
        mock = MockInspectionAdapter()
        return mock.inspect_parts()

    def retrieve_catalogue(self) -> ToolInvocationResult:
        mock = MockInspectionAdapter()
        return mock.retrieve_catalogue()

    def retrieve_stock_snapshot(self, part_id: str) -> ToolInvocationResult:
        mock = MockInspectionAdapter()
        return mock.retrieve_stock_snapshot(part_id)

def get_inspection_adapter() -> BaseInspectionAdapter:
    if settings.TOOL_MODE == "live":
        return LiveInspectionAdapter()
    return MockInspectionAdapter()
