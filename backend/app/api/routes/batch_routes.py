from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.database_models import Batch
from app.models.schemas import BatchSchema
from app.services.batch_service import BatchService

router = APIRouter(prefix="/api/batches", tags=["Batch Operations"])
batch_service = BatchService()

@router.get("", response_model=List[BatchSchema])
def list_batches(db: Session = Depends(get_db)):
    batches = db.query(Batch).order_by(Batch.created_at.desc()).all()
    results = []
    for b in batches:
        summary = batch_service.get_batch_summary(db, b.id)
        results.append(BatchSchema(**summary))
    return results

@router.post("", response_model=BatchSchema)
def create_batch(db: Session = Depends(get_db)):
    res = batch_service.reset_demo_scenario(db)
    summary = batch_service.get_batch_summary(db, res["batch_id"])
    return BatchSchema(**summary)

@router.get("/{batch_id}", response_model=BatchSchema)
def get_batch(batch_id: str, db: Session = Depends(get_db)):
    summary = batch_service.get_batch_summary(db, batch_id)
    if "error" in summary:
        raise HTTPException(status_code=404, detail=summary["error"])
    return BatchSchema(**summary)

@router.post("/{batch_id}/run", response_model=BatchSchema)
def run_batch(batch_id: str, db: Session = Depends(get_db)):
    res = batch_service.run_batch(db, batch_id)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return BatchSchema(**res)

@router.post("/{batch_id}/pause")
def pause_batch(batch_id: str, db: Session = Depends(get_db)):
    res = batch_service.pause_batch(db, batch_id)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@router.post("/{batch_id}/resume", response_model=BatchSchema)
def resume_batch(batch_id: str, db: Session = Depends(get_db)):
    res = batch_service.resume_batch(db, batch_id)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return BatchSchema(**res)
