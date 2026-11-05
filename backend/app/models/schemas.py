import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

# --- Specification extraction models (matches prompt section 6 step 2) ---

class VoltageSpec(BaseModel):
    value: Optional[float] = None
    unit: str = "V"
    status: str = "unknown"  # known, missing, ambiguous
    evidence: Optional[str] = None

class ConnectorSpec(BaseModel):
    value: Optional[str] = None
    status: str = "unknown"
    evidence: Optional[str] = None

class WattageSpec(BaseModel):
    value: Optional[float] = None
    unit: str = "W"
    status: str = "known"
    evidence: Optional[str] = None

class ExtractedSpecifications(BaseModel):
    part_type: str = "Power Supply"
    voltage: VoltageSpec = Field(default_factory=VoltageSpec)
    connector: ConnectorSpec = Field(default_factory=ConnectorSpec)
    minimum_wattage: WattageSpec = Field(default_factory=WattageSpec)
    missing_fields: List[str] = Field(default_factory=list)
    ambiguous_fields: List[str] = Field(default_factory=list)
    raw_interpretation: Optional[str] = None

# --- Catalogue and Stock Schemas ---

class PartCatalogueSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    voltage: float
    connector: str
    wattage: float
    technical_description: str
    compatibility_notes: Optional[str] = None
    snapshot_quantity: int
    snapshot_freshness: str  # RECENT or AGED
    verified_quantity: Optional[int] = None
    current_stock: int
    has_discrepancy: bool = False
    discrepancy_type: Optional[str] = None

# --- Customer Request Schemas ---

class CustomerRequestInput(BaseModel):
    message: str
    customer_name: str = "Workshop Customer"
    batch_id: str = "BATCH-001"

class CustomerRequestBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    customer_name: str
    original_message: str
    updated_message: Optional[str] = None
    part_type: Optional[str] = "Power Supply"
    extracted_voltage: Optional[float] = None
    voltage_unit: Optional[str] = "V"
    extracted_connector: Optional[str] = None
    extracted_min_wattage: Optional[float] = None
    wattage_unit: Optional[str] = "W"
    missing_fields: List[str] = []
    status: str
    final_outcome: Optional[str] = None
    selected_part_id: Optional[str] = None
    outcome_reason: Optional[str] = None
    cost_inr: Optional[float] = 0.0
    created_at: Optional[datetime.datetime] = None

# --- Batch Schemas ---

class BatchSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: str
    total_requests: int
    processed_requests: int
    dispatched_requests: int
    human_review_requests: int
    total_tool_calls: int
    inspection_calls: int
    clarification_calls: int
    verification_calls: int
    dispatch_calls: int
    llm_input_tokens: int
    llm_output_tokens: int
    known_llm_spending: float
    known_tool_spending: float
    total_spending: float
    total_spending_inr: float = 0.0
    budget_limit: float
    budget_limit_inr: float = 435.0
    remaining_budget: float
    remaining_budget_inr: float = 435.0
    unpriced_operations: int
    tool_units_budget: int = 14
    tool_units_spent: int = 0
    tool_units_remaining: int = 14
    total_actions_count: int = 0
    max_actions_limit: int = 60
    created_at: datetime.datetime
    updated_at: datetime.datetime

# --- Tool Call Log Schemas ---

class ToolCallLogSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    batch_id: str
    request_id: Optional[str] = None
    tool_name: str
    part_id: Optional[str] = None
    input_payload: Optional[str] = None
    output_payload: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    cost: float
    execution_time_ms: float
    created_at: datetime.datetime

# --- Evidence and Audit Schemas ---

class EvidenceItemSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    request_id: str
    source_type: str
    source_reference: Optional[str] = None
    evidence_text: str
    interpretation: Optional[str] = None
    created_at: datetime.datetime

class DecisionRecordSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    request_id: str
    decision: str
    selected_part_id: Optional[str] = None
    reasoning: str
    voltage_match: bool
    connector_match: bool
    wattage_match: bool
    stock_confirmed: bool
    candidate_parts_json: Optional[str] = None
    created_at: datetime.datetime

# --- Human Review Schemas ---

class HumanReviewSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    request_id: str
    reason: str
    missing_info: Optional[str] = None
    failed_checks: Optional[str] = None
    stock_issues: Optional[str] = None
    tool_failures: Optional[str] = None
    recommended_action: str
    status: str
    resolution_notes: Optional[str] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime

class ResolveRequestInput(BaseModel):
    action: str  # DISPATCH or CANCEL
    part_id: Optional[str] = None
    operator_name: str = "Workshop Supervisor"
    notes: str = ""

# --- Spending Summary Schema ---

class SpendingSummarySchema(BaseModel):
    batch_id: str
    total_llm_input_tokens: int
    total_llm_output_tokens: int
    known_llm_spending: float
    known_tool_spending: float
    total_known_spending: float
    total_spending_inr: float = 0.0
    unpriced_operations: int
    budget_limit: float
    budget_limit_inr: float = 435.0
    remaining_budget: float
    remaining_budget_inr: float = 435.0
    tool_units_budget: int = 14
    tool_units_spent: int = 0
    tool_units_remaining: int = 14
    total_actions_count: int = 0
    max_actions_limit: int = 60
    breakdown_by_category: Dict[str, float]
