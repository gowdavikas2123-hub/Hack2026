import time
import uuid
from typing import Dict, Any, Set
from app.integrations.base_adapters import BaseDispatchAdapter, ToolInvocationResult
from app.core.config import settings

class MockDispatchAdapter(BaseDispatchAdapter):
    """Transactional simulated dispatch adapter with idempotency enforcement."""

    def __init__(self):
        # In-memory tracking of processed idempotency keys
        self._processed_keys: Dict[str, Dict[str, Any]] = {}
        # Fault injection flag for testing failure handling
        self._inject_failure: bool = False

    def set_inject_failure(self, fail: bool):
        self._inject_failure = fail

    def dispatch_part(self, request_id: str, part_id: str, idempotency_key: str) -> ToolInvocationResult:
        start = time.time()
        call_id = f"disp-{uuid.uuid4().hex[:8]}"
        exec_time = (time.time() - start) * 1000

        # Check idempotency
        if idempotency_key in self._processed_keys:
            existing = self._processed_keys[idempotency_key]
            return ToolInvocationResult(
                success=True,
                data={
                    **existing,
                    "duplicate_prevented": True,
                    "message": "Idempotent response: dispatch was already executed previously."
                },
                cost=0.0,
                execution_time_ms=exec_time,
                call_id=call_id
            )

        # Handle injected or simulated failure
        if self._inject_failure:
            return ToolInvocationResult(
                success=False,
                data=None,
                error="Simulated dispatch service communication timeout. Physical dispatch aborted.",
                cost=settings.TOOL_DISPATCH_COST,
                execution_time_ms=exec_time,
                call_id=call_id
            )

        dispatch_ref = f"DSP-{uuid.uuid4().hex[:10].upper()}"
        result_data = {
            "dispatch_reference": dispatch_ref,
            "request_id": request_id,
            "part_id": part_id,
            "idempotency_key": idempotency_key,
            "is_simulated": True,
            "status": "DISPATCHED",
            "notes": "Transactional local dispatch simulated successfully. Physical packaging requested."
        }

        self._processed_keys[idempotency_key] = result_data

        return ToolInvocationResult(
            success=True,
            data=result_data,
            cost=settings.TOOL_DISPATCH_COST,
            execution_time_ms=exec_time,
            call_id=call_id
        )

class LiveDispatchAdapter(BaseDispatchAdapter):
    def dispatch_part(self, request_id: str, part_id: str, idempotency_key: str) -> ToolInvocationResult:
        mock = MockDispatchAdapter()
        return mock.dispatch_part(request_id, part_id, idempotency_key)

_global_dispatch_adapter = MockDispatchAdapter()

def get_dispatch_adapter() -> BaseDispatchAdapter:
    if settings.TOOL_MODE == "live":
        return LiveDispatchAdapter()
    return _global_dispatch_adapter
