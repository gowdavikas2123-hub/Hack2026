import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.core.database import get_db
from app.models.database_models import HumanReviewRecord, CustomerRequest, PartCatalogue
from app.models.schemas import HumanReviewSchema, ResolveRequestInput
from app.services.compatibility_service import CompatibilityService
from app.services.dispatch_service import DispatchService
from app.models.schemas import ExtractedSpecifications, VoltageSpec, ConnectorSpec, WattageSpec

router = APIRouter(tags=["Human Review"])
dispatch_service = DispatchService()

@router.get("/api/batches/{batch_id}/human-review", response_model=List[HumanReviewSchema])
def get_human_review_cases(batch_id: str, db: Session = Depends(get_db)):
    records = db.query(HumanReviewRecord).join(CustomerRequest).filter(
        CustomerRequest.batch_id == batch_id
    ).order_by(HumanReviewRecord.created_at.desc()).all()
    return records

@router.post("/api/requests/{request_id}/resolve")
def resolve_human_review(
    request_id: str,
    payload: ResolveRequestInput,
    db: Session = Depends(get_db)
):
    """
    Operator workflow for resolving an escalated request.
    CRITICAL: Strictly revalidates hard technical & stock requirements before any dispatch!
    """
    req = db.query(CustomerRequest).filter(CustomerRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    review_record = db.query(HumanReviewRecord).filter(
        HumanReviewRecord.request_id == request_id,
        HumanReviewRecord.status == "PENDING_HUMAN_ACTION"
    ).order_by(HumanReviewRecord.id.desc()).first()

    if not review_record:
        raise HTTPException(status_code=400, detail="No pending human review record found for this request.")

    if payload.action.upper() == "CANCEL":
        review_record.status = "RESOLVED_CANCELLED"
        review_record.resolution_notes = payload.notes or "Cancelled by operator."
        review_record.resolved_by = payload.operator_name
        review_record.resolved_at = datetime.datetime.utcnow()
        req.outcome_reason = f"Request cancelled by human operator: {payload.notes}"
        db.commit()
        return {"status": "RESOLVED_CANCELLED", "message": "Request marked as cancelled."}

    elif payload.action.upper() == "DISPATCH":
        if not payload.part_id:
            raise HTTPException(status_code=400, detail="part_id is required to manually authorize dispatch.")

        part = db.query(PartCatalogue).filter(PartCatalogue.id == payload.part_id).first()
        if not part:
            raise HTTPException(status_code=404, detail=f"Part {payload.part_id} not found.")

        # Build current extracted specifications
        specs = ExtractedSpecifications(
            voltage=VoltageSpec(value=req.extracted_voltage, status=req.voltage_status),
            connector=ConnectorSpec(value=req.extracted_connector, status=req.connector_status),
            minimum_wattage=WattageSpec(value=req.extracted_min_wattage, status=req.wattage_status)
        )

        # REVALIDATE HARD TECHNICAL AND INVENTORY REQUIREMENTS
        part_dict = {
            "id": part.id,
            "name": part.name,
            "voltage": part.voltage,
            "connector": part.connector,
            "wattage": part.wattage,
            "compatibility_notes": part.compatibility_notes
        }
        eval_result = CompatibilityService.check_overall_compatibility(
            specs=specs,
            part=part_dict,
            current_ledger_stock=part.current_stock
        )

        if not eval_result["voltage_match"]:
            raise HTTPException(
                status_code=400,
                detail=f"Safety Rejection: Voltage mismatch! {eval_result['voltage_reason']}"
            )
        if not eval_result["connector_match"]:
            raise HTTPException(
                status_code=400,
                detail=f"Safety Rejection: Connector mismatch! {eval_result['connector_reason']}"
            )
        if not eval_result["wattage_match"]:
            raise HTTPException(
                status_code=400,
                detail=f"Safety Rejection: Wattage insufficient! {eval_result['wattage_reason']}"
            )
        if not eval_result["stock_match"]:
            raise HTTPException(
                status_code=400,
                detail=f"Safety Rejection: Zero stock available in warehouse ledger! {eval_result['stock_reason']}"
            )

        # If all technical & stock requirements pass, execute dispatch
        success, disp_rec, msg = dispatch_service.execute_dispatch(
            db=db,
            request_id=req.id,
            part_id=part.id,
            idempotency_key=f"human-disp-{req.id}-{part.id}"
        )

        if not success:
            raise HTTPException(status_code=500, detail=f"Dispatch execution failed: {msg}")

        # Update records
        req.status = "DISPATCHED"
        req.final_outcome = "DISPATCH"
        req.selected_part_id = part.id
        req.outcome_reason = f"Human authorized dispatch ({payload.operator_name}): {payload.notes}"

        review_record.status = "RESOLVED_DISPATCHED"
        review_record.resolution_notes = f"Operator override dispatched part {part.id}. Notes: {payload.notes}"
        review_record.resolved_by = payload.operator_name
        review_record.resolved_at = datetime.datetime.utcnow()
        db.commit()

        return {
            "status": "RESOLVED_DISPATCHED",
            "dispatch_reference": disp_rec.dispatch_reference if disp_rec else None,
            "message": f"Part {part.id} successfully verified and dispatched."
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Must be 'DISPATCH' or 'CANCEL'.")
