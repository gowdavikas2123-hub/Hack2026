from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.core.database import get_db
from app.models.database_models import DispatchRecord, CustomerRequest, PartCatalogue

router = APIRouter(prefix="/api/batches", tags=["Dispatches"])

@router.get("/{batch_id}/dispatches")
def get_batch_dispatches(batch_id: str, db: Session = Depends(get_db)):
    dispatches = db.query(DispatchRecord).join(CustomerRequest).filter(
        CustomerRequest.batch_id == batch_id
    ).order_by(DispatchRecord.dispatched_at.desc()).all()

    results = []
    for d in dispatches:
        part = db.query(PartCatalogue).filter(PartCatalogue.id == d.part_id).first()
        results.append({
            "id": d.id,
            "request_id": d.request_id,
            "part_id": d.part_id,
            "part_name": part.name if part else "Unknown",
            "voltage": part.voltage if part else None,
            "connector": part.connector if part else None,
            "wattage": part.wattage if part else None,
            "idempotency_key": d.idempotency_key,
            "status": d.status,
            "dispatch_reference": d.dispatch_reference,
            "is_simulated": d.is_simulated,
            "notes": d.notes,
            "dispatched_at": d.dispatched_at
        })
    return results
