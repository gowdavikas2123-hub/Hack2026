from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

class ToolInvocationResult(BaseModel):
    success: bool
    data: Any
    error: Optional[str] = None
    cost: float = 0.0
    execution_time_ms: float = 0.0
    call_id: Optional[str] = None

class BaseInspectionAdapter(ABC):
    @abstractmethod
    def inspect_parts(self) -> ToolInvocationResult:
        """Inspects all catalogue parts and their snapshots."""
        pass

    @abstractmethod
    def retrieve_catalogue(self) -> ToolInvocationResult:
        """Retrieves raw parts catalogue."""
        pass

    @abstractmethod
    def retrieve_stock_snapshot(self, part_id: str) -> ToolInvocationResult:
        """Retrieves snapshot stock freshness and quantity for a part."""
        pass

class BaseClarificationAdapter(ABC):
    @abstractmethod
    def clarify_request(self, request_id: str, field_to_clarify: str, question: str) -> ToolInvocationResult:
        """Clarifies ambiguous or missing specifications with scripted customer response."""
        pass

    @abstractmethod
    def retrieve_scripted_response(self, request_id: str, field_to_clarify: str) -> ToolInvocationResult:
        """Retrieves scripted response if available."""
        pass

class BaseStockVerificationAdapter(ABC):
    @abstractmethod
    def verify_part_stock(self, part_id: str, snapshot_quantity: int, snapshot_age: str) -> ToolInvocationResult:
        """Queries authoritative warehouse inventory for true physical stock."""
        pass

class BaseDispatchAdapter(ABC):
    @abstractmethod
    def dispatch_part(self, request_id: str, part_id: str, idempotency_key: str) -> ToolInvocationResult:
        """Executes transactional dispatch with idempotency protection."""
        pass
