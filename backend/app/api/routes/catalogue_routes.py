from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.database_models import PartCatalogue, StockSnapshot, StockVerification
from app.models.schemas import PartCatalogueSchema

router = APIRouter(prefix="/api/catalogue", tags=["Catalogue"])

@router.get("", response_model=List[PartCatalogueSchema])
def get_all_parts(db: Session = Depends(get_db)):
    parts = db.query(PartCatalogue).order_by(PartCatalogue.id.asc()).all()
    result = []
    for p in parts:
        snap = db.query(StockSnapshot).filter(StockSnapshot.part_id == p.id).order_by(StockSnapshot.id.desc()).first()
        verif = db.query(StockVerification).filter(StockVerification.part_id == p.id).order_by(StockVerification.id.desc()).first()
        
        result.append(PartCatalogueSchema(
            id=p.id,
            name=p.name,
            voltage=p.voltage,
            connector=p.connector,
            wattage=p.wattage,
            technical_description=p.technical_description,
            compatibility_notes=p.compatibility_notes,
            snapshot_quantity=snap.snapshot_quantity if snap else 0,
            snapshot_freshness=snap.freshness if snap else "RECENT",
            verified_quantity=verif.verified_warehouse_quantity if verif else None,
            current_stock=p.current_stock,
            has_discrepancy=verif.discrepancy_detected if verif else False,
            discrepancy_type=verif.discrepancy_type if verif else None
        ))
    return result

@router.get("/{part_id}", response_model=PartCatalogueSchema)
def get_part_by_id(part_id: str, db: Session = Depends(get_db)):
    p = db.query(PartCatalogue).filter(PartCatalogue.id == part_id).first()
    if not p:
        raise HTTPException(status_code=404, detail=f"Part {part_id} not found.")

    snap = db.query(StockSnapshot).filter(StockSnapshot.part_id == p.id).order_by(StockSnapshot.id.desc()).first()
    verif = db.query(StockVerification).filter(StockVerification.part_id == p.id).order_by(StockVerification.id.desc()).first()

    return PartCatalogueSchema(
        id=p.id,
        name=p.name,
        voltage=p.voltage,
        connector=p.connector,
        wattage=p.wattage,
        technical_description=p.technical_description,
        compatibility_notes=p.compatibility_notes,
        snapshot_quantity=snap.snapshot_quantity if snap else 0,
        snapshot_freshness=snap.freshness if snap else "RECENT",
        verified_quantity=verif.verified_warehouse_quantity if verif else None,
        current_stock=p.current_stock,
        has_discrepancy=verif.discrepancy_detected if verif else False,
        discrepancy_type=verif.discrepancy_type if verif else None
    )
