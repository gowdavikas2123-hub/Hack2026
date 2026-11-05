from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.models.database_models import EvidenceRecord, CustomerRequest, DecisionRecord

class EvidenceService:
    """Service tracking verifiable evidence trails linking customer requests, catalogue specs, and decisions."""

    @staticmethod
    def record_evidence(
        db: Session,
        request_id: str,
        source_type: str,
        evidence_text: str,
        interpretation: Optional[str] = None,
        source_reference: Optional[str] = None
    ) -> EvidenceRecord:
        record = EvidenceRecord(
            request_id=request_id,
            source_type=source_type,
            source_reference=source_reference,
            evidence_text=evidence_text,
            interpretation=interpretation
        )
        db.add(record)
        db.commit()
        return record

    @staticmethod
    def get_audit_trail_for_request(db: Session, request_id: str) -> Dict[str, Any]:
        req = db.query(CustomerRequest).filter(CustomerRequest.id == request_id).first()
        if not req:
            return {"error": f"Request {request_id} not found"}

        evidence_items = db.query(EvidenceRecord).filter(EvidenceRecord.request_id == request_id).all()
        decisions = db.query(DecisionRecord).filter(DecisionRecord.request_id == request_id).all()

        return {
            "request_id": req.id,
            "original_message": req.original_message,
            "updated_message": req.updated_message,
            "extracted_specs": {
                "voltage": {"value": req.extracted_voltage, "evidence": req.voltage_evidence, "status": req.voltage_status},
                "connector": {"value": req.extracted_connector, "evidence": req.connector_evidence, "status": req.connector_status},
                "minimum_wattage": {"value": req.extracted_min_wattage, "evidence": req.wattage_evidence, "status": req.wattage_status}
            },
            "status": req.status,
            "final_outcome": req.final_outcome,
            "outcome_reason": req.outcome_reason,
            "selected_part_id": req.selected_part_id,
            "evidence": [
                {
                    "id": e.id,
                    "source_type": e.source_type,
                    "source_reference": e.source_reference,
                    "evidence_text": e.evidence_text,
                    "interpretation": e.interpretation,
                    "created_at": e.created_at.isoformat() if e.created_at else None
                }
                for e in evidence_items
            ],
            "decisions": [
                {
                    "decision": d.decision,
                    "reasoning": d.reasoning,
                    "selected_part_id": d.selected_part_id,
                    "voltage_match": d.voltage_match,
                    "connector_match": d.connector_match,
                    "wattage_match": d.wattage_match,
                    "stock_confirmed": d.stock_confirmed,
                    "created_at": d.created_at.isoformat() if d.created_at else None
                }
                for d in decisions
            ]
        }
