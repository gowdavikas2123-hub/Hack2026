import time
import uuid
from typing import Dict, Any, Optional
from app.integrations.base_adapters import BaseClarificationAdapter, ToolInvocationResult
from app.fixtures.demo_scenario import DEMO_REQUESTS
from app.core.config import settings

class MockClarificationAdapter(BaseClarificationAdapter):
    """Deterministic mock clarification adapter using challenge's scripted customer clarification."""

    def __init__(self, demo_requests: Optional[list] = None):
        self._requests = demo_requests or DEMO_REQUESTS

    def clarify_request(self, request_id: str, field_to_clarify: str, question: str) -> ToolInvocationResult:
        start = time.time()
        call_id = f"clar-{uuid.uuid4().hex[:8]}"
        req = next((r for r in self._requests if r["id"] == request_id), None)
        exec_time = (time.time() - start) * 1000

        if not req:
            return ToolInvocationResult(
                success=False,
                data=None,
                error=f"Customer request {request_id} not found in clarification system.",
                cost=settings.TOOL_CLARIFICATION_COST,
                execution_time_ms=exec_time,
                call_id=call_id
            )

        scripted = req.get("scripted_clarifications", {}).get(field_to_clarify)
        if scripted:
            return ToolInvocationResult(
                success=True,
                data={
                    "request_id": request_id,
                    "field_to_clarify": field_to_clarify,
                    "question": question,
                    "response": scripted,
                    "resolved": True
                },
                cost=settings.TOOL_CLARIFICATION_COST,
                execution_time_ms=exec_time,
                call_id=call_id
            )
        else:
            return ToolInvocationResult(
                success=False,
                data={
                    "request_id": request_id,
                    "field_to_clarify": field_to_clarify,
                    "question": question,
                    "response": None,
                    "resolved": False
                },
                error=f"No scripted response available from customer for field '{field_to_clarify}'. Requires human intervention.",
                cost=settings.TOOL_CLARIFICATION_COST,
                execution_time_ms=exec_time,
                call_id=call_id
            )

    def retrieve_scripted_response(self, request_id: str, field_to_clarify: str) -> ToolInvocationResult:
        return self.clarify_request(request_id, field_to_clarify, f"Please clarify {field_to_clarify}")

class LiveClarificationAdapter(BaseClarificationAdapter):
    def clarify_request(self, request_id: str, field_to_clarify: str, question: str) -> ToolInvocationResult:
        mock = MockClarificationAdapter()
        return mock.clarify_request(request_id, field_to_clarify, question)

    def retrieve_scripted_response(self, request_id: str, field_to_clarify: str) -> ToolInvocationResult:
        mock = MockClarificationAdapter()
        return mock.retrieve_scripted_response(request_id, field_to_clarify)

def get_clarification_adapter() -> BaseClarificationAdapter:
    if settings.TOOL_MODE == "live":
        return LiveClarificationAdapter()
    return MockClarificationAdapter()
