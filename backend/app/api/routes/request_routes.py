import json
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.core.database import get_db
from app.models.database_models import CustomerRequest, Batch, PartCatalogue, PersistentRequest
from app.models.schemas import CustomerRequestBase, CustomerRequestInput
from app.agents.request_agent import RequestAgent
from app.integrations.inspection_adapter import get_inspection_adapter
from app.fixtures.demo_scenario import DEMO_PARTS
from app.core.config import settings

router = APIRouter(tags=["Requests"])
request_agent = RequestAgent()
inspection_adapter = get_inspection_adapter()

@router.post("/api/requests", response_model=CustomerRequestBase)
def submit_and_process_custom_request(payload: CustomerRequestInput, db: Session = Depends(get_db)):
    """
    Allows user to input a custom natural language customer request,
    immediately analyzes specifications, searches the parts catalogue,
    enforces voltage/connector/wattage compatibility, verifies warehouse stock,
    and returns the matched part or human escalation.
    """
    cleaned_msg = payload.message.strip()
    if not cleaned_msg:
        raise HTTPException(status_code=400, detail="Customer request message cannot be empty.")

    batch = db.query(Batch).filter(Batch.id == payload.batch_id).first()
    if not batch:
        # Create default batch if it doesn't exist
        batch = Batch(id=payload.batch_id, status="RUNNING", total_requests=0, budget_limit=5.0)
        db.add(batch)
        db.commit()

    # Generate sequential request ID
    existing_count = db.query(CustomerRequest).count()
    req_id = f"REQ-{existing_count + 1:03d}"

    new_req = CustomerRequest(
        id=req_id,
        batch_id=batch.id,
        customer_name=payload.customer_name or "Workshop Customer",
        original_message=cleaned_msg,
        status="PENDING"
    )
    db.add(new_req)
    batch.total_requests += 1
    db.commit()

    # Retrieve current catalogue parts
    insp_res = inspection_adapter.inspect_parts()
    catalogue_parts = insp_res.data or DEMO_PARTS

    # Process request through Agentic AI pipeline
    request_agent.process_request(
        db=db,
        batch_id=batch.id,
        request_id=new_req.id,
        catalogue_parts=catalogue_parts
    )

    # Refresh batch counters
    db.refresh(batch)
    batch.processed_requests = db.query(CustomerRequest).filter(
        CustomerRequest.batch_id == batch.id,
        CustomerRequest.status.in_(["DISPATCHED", "HUMAN_REVIEW", "FAILED"])
    ).count()
    batch.dispatched_requests = db.query(CustomerRequest).filter(
        CustomerRequest.batch_id == batch.id,
        CustomerRequest.status == "DISPATCHED"
    ).count()
    batch.human_review_requests = db.query(CustomerRequest).filter(
        CustomerRequest.batch_id == batch.id,
        CustomerRequest.status == "HUMAN_REVIEW"
    ).count()
    db.commit()

    db.refresh(new_req)
    missing = json.loads(new_req.missing_fields_json) if new_req.missing_fields_json else []

    return CustomerRequestBase(
        id=new_req.id,
        customer_name=new_req.customer_name,
        original_message=new_req.original_message,
        updated_message=new_req.updated_message,
        part_type=getattr(new_req, 'part_type', 'Power Supply') or 'Power Supply',
        extracted_voltage=new_req.extracted_voltage,
        voltage_unit=new_req.voltage_unit,
        extracted_connector=new_req.extracted_connector,
        extracted_min_wattage=new_req.extracted_min_wattage,
        wattage_unit=new_req.wattage_unit,
        missing_fields=missing,
        status=new_req.status,
        final_outcome=new_req.final_outcome,
        selected_part_id=new_req.selected_part_id,
        outcome_reason=new_req.outcome_reason,
        created_at=new_req.created_at
    )

@router.get("/api/batches/{batch_id}/requests", response_model=List[CustomerRequestBase])
def get_batch_requests(batch_id: str, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    requests = db.query(CustomerRequest).filter(CustomerRequest.batch_id == batch_id).order_by(CustomerRequest.id.asc()).all()
    results = []
    for r in requests:
        missing = json.loads(r.missing_fields_json) if r.missing_fields_json else []
        results.append(CustomerRequestBase(
            id=r.id,
            customer_name=r.customer_name,
            original_message=r.original_message,
            updated_message=r.updated_message,
            part_type=getattr(r, 'part_type', 'Power Supply') or 'Power Supply',
            extracted_voltage=r.extracted_voltage,
            voltage_unit=r.voltage_unit,
            extracted_connector=r.extracted_connector,
            extracted_min_wattage=r.extracted_min_wattage,
            wattage_unit=r.wattage_unit,
            missing_fields=missing,
            status=r.status,
            final_outcome=r.final_outcome,
            selected_part_id=r.selected_part_id,
            outcome_reason=r.outcome_reason,
            created_at=r.created_at
        ))
    return results

@router.get("/api/requests/history", response_model=List[CustomerRequestBase])
def get_all_remembered_requests_history(db: Session = Depends(get_db)):
    """
    Returns all customer requests ever recorded and remembered across all sessions,
    including earlier batches and custom user inquiries.
    """
    history_items = db.query(PersistentRequest).order_by(PersistentRequest.created_at.desc()).all()
    results = []
    for r in history_items:
        missing = json.loads(r.missing_fields_json) if r.missing_fields_json else []
        results.append(CustomerRequestBase(
            id=r.id,
            customer_name=r.customer_name,
            original_message=r.original_message,
            updated_message=r.updated_message,
            part_type=getattr(r, 'part_type', 'Power Supply') or 'Power Supply',
            extracted_voltage=r.extracted_voltage,
            voltage_unit=r.voltage_unit,
            extracted_connector=r.extracted_connector,
            extracted_min_wattage=r.extracted_min_wattage,
            wattage_unit=r.wattage_unit,
            missing_fields=missing,
            status=r.status,
            final_outcome=r.final_outcome,
            selected_part_id=r.selected_part_id,
            outcome_reason=r.outcome_reason,
            cost_inr=getattr(r, 'cost_inr', 0.0) or 0.0,
            created_at=r.created_at
        ))
    return results

@router.get("/api/requests/{request_id}", response_model=CustomerRequestBase)
def get_single_request(request_id: str, db: Session = Depends(get_db)):
    r = db.query(CustomerRequest).filter(CustomerRequest.id == request_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")

    missing = json.loads(r.missing_fields_json) if r.missing_fields_json else []
    return CustomerRequestBase(
        id=r.id,
        customer_name=r.customer_name,
        original_message=r.original_message,
        updated_message=r.updated_message,
        part_type=getattr(r, 'part_type', 'Power Supply') or 'Power Supply',
        extracted_voltage=r.extracted_voltage,
        voltage_unit=r.voltage_unit,
        extracted_connector=r.extracted_connector,
        extracted_min_wattage=r.extracted_min_wattage,
        wattage_unit=r.wattage_unit,
        missing_fields=missing,
        status=r.status,
        final_outcome=r.final_outcome,
        selected_part_id=r.selected_part_id,
        outcome_reason=r.outcome_reason,
        created_at=r.created_at
    )
