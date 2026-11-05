from typing import Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.database_models import PartCatalogue, StockSnapshot, StockVerification
from app.integrations.verification_adapter import get_verification_adapter, BaseStockVerificationAdapter
from app.core.logging_config import logger

class StockService:
    """Service governing stock inspection snapshots, authoritative warehouse verifications, and ledger updates."""

    def __init__(self, verification_adapter: Optional[BaseStockVerificationAdapter] = None):
        self.verification_adapter = verification_adapter or get_verification_adapter()

    def get_part_stock_info(self, db: Session, part_id: str) -> Dict[str, Any]:
        """Retrieves active ledger stock, latest snapshot, and latest verification."""
        part = db.query(PartCatalogue).filter(PartCatalogue.id == part_id).first()
        if not part:
            return {"error": f"Part {part_id} not found"}

        latest_snap = db.query(StockSnapshot).filter(StockSnapshot.part_id == part_id).order_by(StockSnapshot.id.desc()).first()
        latest_verif = db.query(StockVerification).filter(StockVerification.part_id == part_id).order_by(StockVerification.id.desc()).first()

        return {
            "part_id": part.id,
            "name": part.name,
            "current_stock": part.current_stock,
            "snapshot_quantity": latest_snap.snapshot_quantity if latest_snap else 0,
            "snapshot_freshness": latest_snap.freshness if latest_snap else "UNKNOWN",
            "verified_quantity": latest_verif.verified_warehouse_quantity if latest_verif else None,
            "has_discrepancy": latest_verif.discrepancy_detected if latest_verif else False,
            "discrepancy_type": latest_verif.discrepancy_type if latest_verif else None
        }

    def verify_stock_if_needed(
        self,
        db: Session,
        part_id: str,
        request_id: Optional[str] = None
    ) -> Tuple[bool, int, Optional[StockVerification]]:
        """
        Rule 4 & 5: Stock Handling Strategy
        - RECENT snapshot: trusted initially, no warehouse call needed unless required.
        - AGED snapshot: MUST verify using authoritative warehouse tool before dispatch,
          even if snapshot shows 0 stock.
        Returns: (is_available, verified_or_ledger_stock, verification_record)
        """
        part = db.query(PartCatalogue).filter(PartCatalogue.id == part_id).first()
        if not part:
            return False, 0, None

        latest_snap = db.query(StockSnapshot).filter(StockSnapshot.part_id == part_id).order_by(StockSnapshot.id.desc()).first()
        freshness = latest_snap.freshness if latest_snap else "RECENT"
        snap_qty = latest_snap.snapshot_quantity if latest_snap else part.current_stock

        # If freshness is RECENT, rely on the ledger
        if freshness == "RECENT":
            return (part.current_stock > 0), part.current_stock, None

        # If freshness is AGED, MUST query authoritative warehouse inventory tool
        logger.info(f"Part {part_id} has AGED snapshot. Querying authoritative warehouse inventory tool...")
        result = self.verification_adapter.verify_part_stock(
            part_id=part_id,
            snapshot_quantity=snap_qty,
            snapshot_age=freshness
        )

        if not result.success:
            logger.error(f"Stock verification tool failed for part {part_id}: {result.error}")
            verif_record = StockVerification(
                request_id=request_id,
                part_id=part_id,
                tool_call_id=result.call_id,
                snapshot_quantity=snap_qty,
                snapshot_age=freshness,
                verified_warehouse_quantity=0,
                discrepancy_detected=False,
                status="FAILED",
                error_message=result.error
            )
            db.add(verif_record)
            db.commit()
            return False, 0, verif_record

        data = result.data
        verified_qty = data["warehouse_quantity"]

        # Note: Do not overwrite the original snapshot; record verification separately!
        verif_record = StockVerification(
            request_id=request_id,
            part_id=part_id,
            tool_call_id=result.call_id,
            snapshot_quantity=snap_qty,
            snapshot_age=freshness,
            verified_warehouse_quantity=verified_qty,
            discrepancy_detected=data["discrepancy_detected"],
            discrepancy_type=data.get("discrepancy_type"),
            status="SUCCESS"
        )
        db.add(verif_record)

        # Update local ledger to reflect true warehouse stock
        part.current_stock = verified_qty
        db.commit()

        return (verified_qty > 0), verified_qty, verif_record

    def deduct_stock_on_dispatch(self, db: Session, part_id: str) -> bool:
        """
        Rule 6: Stock quantity
        Each part carries 1 unit of stock when available.
        A successful dispatch consumes that unit.
        Updates ledger immediately.
        """
        part = db.query(PartCatalogue).filter(PartCatalogue.id == part_id).with_for_update().first()
        if not part or part.current_stock < 1:
            return False

        part.current_stock -= 1
        db.commit()
        logger.info(f"Part {part_id} stock deducted. New ledger stock: {part.current_stock}")
        return True
