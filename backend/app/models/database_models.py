import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class Batch(Base):
    __tablename__ = "batches"

    id = Column(String(50), primary_key=True, index=True)
    status = Column(String(30), default="PENDING")  # PENDING, RUNNING, PAUSED, COMPLETED, FAILED
    total_requests = Column(Integer, default=6)
    processed_requests = Column(Integer, default=0)
    dispatched_requests = Column(Integer, default=0)
    human_review_requests = Column(Integer, default=0)
    total_tool_calls = Column(Integer, default=0)
    inspection_calls = Column(Integer, default=0)
    clarification_calls = Column(Integer, default=0)
    verification_calls = Column(Integer, default=0)
    dispatch_calls = Column(Integer, default=0)
    llm_input_tokens = Column(Integer, default=0)
    llm_output_tokens = Column(Integer, default=0)
    known_llm_spending = Column(Float, default=0.0)
    known_tool_spending = Column(Float, default=0.0)
    total_spending = Column(Float, default=0.0)
    budget_limit = Column(Float, default=5.00)
    unpriced_operations = Column(Integer, default=0)

    # Official Platform Tool Unit Measures (14 tool units budget, max 60 actions)
    tool_units_budget = Column(Integer, default=14)
    tool_units_spent = Column(Integer, default=0)
    total_actions_count = Column(Integer, default=0)
    max_actions_limit = Column(Integer, default=60)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    requests = relationship("CustomerRequest", back_populates="batch", cascade="all, delete-orphan")
    spending_records = relationship("SpendingRecord", back_populates="batch", cascade="all, delete-orphan")
    tool_call_logs = relationship("ToolCallLog", back_populates="batch", cascade="all, delete-orphan")


class CustomerRequest(Base):
    __tablename__ = "customer_requests"

    id = Column(String(50), primary_key=True, index=True)
    batch_id = Column(String(50), ForeignKey("batches.id"), nullable=False, index=True)
    customer_name = Column(String(100), default="Workshop Customer")
    original_message = Column(Text, nullable=False)
    updated_message = Column(Text, nullable=True)  # After clarification
    part_type = Column(String(50), default="Power Supply")
    
    # Extracted specifications
    extracted_voltage = Column(Float, nullable=True)
    voltage_unit = Column(String(10), default="V")
    voltage_status = Column(String(20), default="unknown")  # known, missing, ambiguous
    voltage_evidence = Column(Text, nullable=True)

    extracted_connector = Column(String(50), nullable=True)
    connector_status = Column(String(20), default="unknown")
    connector_evidence = Column(Text, nullable=True)

    extracted_min_wattage = Column(Float, nullable=True)
    wattage_unit = Column(String(10), default="W")
    wattage_status = Column(String(20), default="unknown")
    wattage_evidence = Column(Text, nullable=True)

    missing_fields_json = Column(Text, default="[]")
    ambiguous_fields_json = Column(Text, default="[]")

    status = Column(String(30), default="PENDING")  # PENDING, PROCESSING, CLARIFICATION_REQUIRED, STOCK_CHECK, DISPATCHED, HUMAN_REVIEW, FAILED
    final_outcome = Column(String(30), nullable=True)  # DISPATCH, HUMAN_REVIEW
    selected_part_id = Column(String(50), ForeignKey("parts_catalogue.id"), nullable=True)
    outcome_reason = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    batch = relationship("Batch", back_populates="requests")
    selected_part = relationship("PartCatalogue", foreign_keys=[selected_part_id])
    clarifications = relationship("ClarificationRecord", back_populates="request", cascade="all, delete-orphan")
    dispatches = relationship("DispatchRecord", back_populates="request", cascade="all, delete-orphan")
    decisions = relationship("DecisionRecord", back_populates="request", cascade="all, delete-orphan")
    evidence_items = relationship("EvidenceRecord", back_populates="request", cascade="all, delete-orphan")
    human_reviews = relationship("HumanReviewRecord", back_populates="request", cascade="all, delete-orphan")


class PartCatalogue(Base):
    __tablename__ = "parts_catalogue"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    voltage = Column(Float, nullable=False)
    connector = Column(String(50), nullable=False)
    wattage = Column(Float, nullable=False)
    technical_description = Column(Text, nullable=False)
    compatibility_notes = Column(Text, nullable=True)
    
    # Current active inventory state in ledger
    current_stock = Column(Integer, default=1)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    snapshots = relationship("StockSnapshot", back_populates="part", cascade="all, delete-orphan")
    verifications = relationship("StockVerification", back_populates="part", cascade="all, delete-orphan")
    dispatches = relationship("DispatchRecord", back_populates="part")


class StockSnapshot(Base):
    __tablename__ = "stock_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    part_id = Column(String(50), ForeignKey("parts_catalogue.id"), nullable=False, index=True)
    snapshot_quantity = Column(Integer, nullable=False)
    freshness = Column(String(20), nullable=False)  # RECENT or AGED
    captured_at = Column(DateTime, default=datetime.datetime.utcnow)
    raw_response = Column(Text, nullable=True)

    part = relationship("PartCatalogue", back_populates="snapshots")


class StockVerification(Base):
    __tablename__ = "stock_verifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(String(50), ForeignKey("customer_requests.id"), nullable=True, index=True)
    part_id = Column(String(50), ForeignKey("parts_catalogue.id"), nullable=False, index=True)
    tool_call_id = Column(String(100), nullable=True)
    snapshot_quantity = Column(Integer, nullable=False)
    snapshot_age = Column(String(20), nullable=False)
    verified_warehouse_quantity = Column(Integer, nullable=False)
    discrepancy_detected = Column(Boolean, default=False)
    discrepancy_type = Column(String(50), nullable=True)  # "OVERSTATED" (snap=1, act=0) or "UNDERSTATED" (snap=0, act=1)
    status = Column(String(20), default="SUCCESS")  # SUCCESS, FAILED
    error_message = Column(Text, nullable=True)
    verified_at = Column(DateTime, default=datetime.datetime.utcnow)

    part = relationship("PartCatalogue", back_populates="verifications")


class ClarificationRecord(Base):
    __tablename__ = "clarification_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(String(50), ForeignKey("customer_requests.id"), nullable=False, index=True)
    field_to_clarify = Column(String(50), nullable=False)  # voltage, connector, minimum_wattage
    question_asked = Column(Text, nullable=False)
    scripted_customer_response = Column(Text, nullable=True)
    status = Column(String(20), default="COMPLETED")  # COMPLETED, FAILED, NO_SCRIPT_FOUND
    attempt_number = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    request = relationship("CustomerRequest", back_populates="clarifications")


class DispatchRecord(Base):
    __tablename__ = "dispatch_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(String(50), ForeignKey("customer_requests.id"), nullable=False, index=True)
    part_id = Column(String(50), ForeignKey("parts_catalogue.id"), nullable=False, index=True)
    idempotency_key = Column(String(100), unique=True, nullable=False, index=True)
    status = Column(String(20), default="SUCCESS")  # SUCCESS, FAILED, DUPLICATE_BLOCKED
    dispatch_reference = Column(String(100), nullable=True)
    is_simulated = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)
    dispatched_at = Column(DateTime, default=datetime.datetime.utcnow)

    request = relationship("CustomerRequest", back_populates="dispatches")
    part = relationship("PartCatalogue", back_populates="dispatches")


class DecisionRecord(Base):
    __tablename__ = "decision_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(String(50), ForeignKey("customer_requests.id"), nullable=False, index=True)
    decision = Column(String(30), nullable=False)  # DISPATCH, HUMAN_REVIEW
    selected_part_id = Column(String(50), nullable=True)
    reasoning = Column(Text, nullable=False)
    voltage_match = Column(Boolean, default=False)
    connector_match = Column(Boolean, default=False)
    wattage_match = Column(Boolean, default=False)
    stock_confirmed = Column(Boolean, default=False)
    candidate_parts_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    request = relationship("CustomerRequest", back_populates="decisions")


class ToolCallLog(Base):
    __tablename__ = "tool_call_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    batch_id = Column(String(50), ForeignKey("batches.id"), nullable=False, index=True)
    request_id = Column(String(50), nullable=True, index=True)
    tool_name = Column(String(50), nullable=False)  # inspection, clarification, stock_verification, dispatch
    part_id = Column(String(50), nullable=True)
    input_payload = Column(Text, nullable=True)
    output_payload = Column(Text, nullable=True)
    status = Column(String(20), default="SUCCESS")  # SUCCESS, FAILED
    error_message = Column(Text, nullable=True)
    cost = Column(Float, default=0.0)
    execution_time_ms = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    batch = relationship("Batch", back_populates="tool_call_logs")


class EvidenceRecord(Base):
    __tablename__ = "evidence_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(String(50), ForeignKey("customer_requests.id"), nullable=False, index=True)
    source_type = Column(String(50), nullable=False)  # customer_message, catalogue_spec, clarification, verification, stock_snapshot
    source_reference = Column(String(100), nullable=True)
    evidence_text = Column(Text, nullable=False)
    interpretation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    request = relationship("CustomerRequest", back_populates="evidence_items")


class SpendingRecord(Base):
    __tablename__ = "spending_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    batch_id = Column(String(50), ForeignKey("batches.id"), nullable=False, index=True)
    request_id = Column(String(50), nullable=True)
    category = Column(String(30), nullable=False)  # llm_prompt, llm_completion, tool_inspection, tool_verification, tool_clarification, tool_dispatch
    units = Column(Float, default=0.0)  # token count or call count
    unit_cost = Column(Float, default=0.0)
    total_cost = Column(Float, default=0.0)
    is_priced = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    batch = relationship("Batch", back_populates="spending_records")


class HumanReviewRecord(Base):
    __tablename__ = "human_review_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(String(50), ForeignKey("customer_requests.id"), nullable=False, index=True)
    reason = Column(Text, nullable=False)
    missing_info = Column(Text, nullable=True)
    failed_checks = Column(Text, nullable=True)
    stock_issues = Column(Text, nullable=True)
    tool_failures = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=False)
    status = Column(String(30), default="PENDING_HUMAN_ACTION")  # PENDING_HUMAN_ACTION, RESOLVED_DISPATCHED, RESOLVED_CANCELLED
    resolution_notes = Column(Text, nullable=True)
    resolved_by = Column(String(100), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    request = relationship("CustomerRequest", back_populates="human_reviews")


class PersistentRequest(Base):
    """Permanent storage to record and remember all customer requests ever submitted across all batches."""
    __tablename__ = "persistent_requests"

    id = Column(String(50), primary_key=True, index=True)
    batch_id = Column(String(50), nullable=True)
    customer_name = Column(String(100), default="Workshop Customer")
    original_message = Column(Text, nullable=False)
    updated_message = Column(Text, nullable=True)
    part_type = Column(String(50), default="Power Supply")
    extracted_voltage = Column(Float, nullable=True)
    voltage_unit = Column(String(10), default="V")
    extracted_connector = Column(String(50), nullable=True)
    extracted_min_wattage = Column(Float, nullable=True)
    wattage_unit = Column(String(10), default="W")
    missing_fields_json = Column(Text, default="[]")
    status = Column(String(30), default="PENDING")
    final_outcome = Column(String(30), nullable=True)
    selected_part_id = Column(String(50), nullable=True)
    outcome_reason = Column(Text, nullable=True)
    cost_inr = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

