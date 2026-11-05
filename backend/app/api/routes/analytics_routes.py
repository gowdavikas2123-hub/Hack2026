import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pydantic import BaseModel
from app.core.database import get_db
from app.models.database_models import ToolCallLog, EvidenceRecord, DecisionRecord, Batch, CustomerRequest, PartCatalogue
from app.models.schemas import ToolCallLogSchema, EvidenceItemSchema, DecisionRecordSchema, SpendingSummarySchema
from app.services.budget_service import BudgetService

router = APIRouter(tags=["Analytics & Audit"])

@router.get("/api/batches/{batch_id}/audit")
def get_batch_audit_trail(batch_id: str, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    requests = db.query(CustomerRequest).filter(CustomerRequest.batch_id == batch_id).all()
    audit_data = []

    for r in requests:
        evidences = db.query(EvidenceRecord).filter(EvidenceRecord.request_id == r.id).all()
        decisions = db.query(DecisionRecord).filter(DecisionRecord.request_id == r.id).all()
        audit_data.append({
            "request_id": r.id,
            "customer_name": r.customer_name,
            "original_message": r.original_message,
            "status": r.status,
            "final_outcome": r.final_outcome,
            "selected_part_id": r.selected_part_id,
            "outcome_reason": r.outcome_reason,
            "extracted_specs": {
                "voltage": r.extracted_voltage,
                "connector": r.extracted_connector,
                "wattage": r.extracted_min_wattage
            },
            "evidence_count": len(evidences),
            "evidence_items": [
                {
                    "source_type": e.source_type,
                    "evidence_text": e.evidence_text,
                    "interpretation": e.interpretation,
                    "created_at": e.created_at
                }
                for e in evidences
            ],
            "decisions": [
                {
                    "decision": d.decision,
                    "reasoning": d.reasoning,
                    "voltage_match": d.voltage_match,
                    "connector_match": d.connector_match,
                    "wattage_match": d.wattage_match,
                    "stock_confirmed": d.stock_confirmed
                }
                for d in decisions
            ]
        })

    return {
        "batch_id": batch.id,
        "status": batch.status,
        "total_requests": batch.total_requests,
        "processed_requests": batch.processed_requests,
        "audit_trail": audit_data
    }

@router.get("/api/batches/{batch_id}/evidence", response_model=List[EvidenceItemSchema])
def get_batch_evidence(batch_id: str, db: Session = Depends(get_db)):
    evidences = db.query(EvidenceRecord).join(CustomerRequest).filter(
        CustomerRequest.batch_id == batch_id
    ).order_by(EvidenceRecord.created_at.desc()).all()
    return evidences

@router.get("/api/batches/{batch_id}/spending", response_model=SpendingSummarySchema)
def get_batch_spending(batch_id: str, db: Session = Depends(get_db)):
    summary = BudgetService.get_spending_summary(db, batch_id)
    if "error" in summary:
        raise HTTPException(status_code=404, detail=summary["error"])
    return SpendingSummarySchema(**summary)

@router.get("/api/batches/{batch_id}/tool-logs", response_model=List[ToolCallLogSchema])
def get_tool_call_logs(batch_id: str, db: Session = Depends(get_db)):
    logs = db.query(ToolCallLog).filter(ToolCallLog.batch_id == batch_id).order_by(ToolCallLog.created_at.desc()).all()
    return logs

# Chatbot assistant request schema
class ChatMessageInput(BaseModel):
    message: str
    batch_id: str = "BATCH-001"

@router.post("/api/chat")
def chatbot_assistant(payload: ChatMessageInput, db: Session = Depends(get_db)):
    """
    Interactive workshop assistant chatbot:
    Can answer questions regarding batch status, stock discrepancy, part specs, or request reasoning.
    """
    msg = payload.message.lower().strip()
    batch_id = payload.batch_id

    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    parts = db.query(PartCatalogue).all()
    requests = db.query(CustomerRequest).filter(CustomerRequest.batch_id == batch_id).all()

    # Intelligent intent routing:
    # 1. Customer request / Part search intent
    if any(keyword in msg for keyword in ["need", "looking for", "find part", "power supply", "adapter", "volt", "watt", "connector", "usb-c", "barrel"]):
        from app.agents.specification_agent import SpecificationAgent
        from app.services.compatibility_service import CompatibilityService
        from app.services.stock_service import StockService

        spec_agent = SpecificationAgent()
        stock_service = StockService()

        specs, _ = spec_agent.extract_specifications(payload.message)

        # Check catalogue compatibility
        matched_candidates = []
        for p in parts:
            eval_res = CompatibilityService.check_overall_compatibility(
                specs=specs,
                part={
                    "id": p.id,
                    "name": p.name,
                    "voltage": p.voltage,
                    "connector": p.connector,
                    "wattage": p.wattage,
                    "compatibility_notes": p.compatibility_notes
                },
                current_ledger_stock=p.current_stock
            )
            if eval_res["is_technically_compatible"]:
                matched_candidates.append((p, eval_res))

        if matched_candidates:
            # Sort by wattage excess
            matched_candidates.sort(key=lambda item: item[1]["wattage_excess"])
            best_part, best_eval = matched_candidates[0]

            v_val = f"{specs.voltage.value}V" if specs.voltage.value else "specified voltage"
            c_val = specs.connector.value or "specified connector"
            w_val = f"≥{specs.minimum_wattage.value}W" if specs.minimum_wattage.value else "specified wattage"

            reply = (
                f"🎯 **Parts Search Matched {len(matched_candidates)} Candidate(s) for:** `{v_val}, {c_val}, {w_val}`\n\n"
                f"✅ **Recommended Part:** `{best_part.id}` - **{best_part.name}**\n"
                f"- **Specifications:** {best_part.voltage}V | {best_part.connector} | {best_part.wattage}W\n"
                f"- **Active Ledger Stock:** {best_part.current_stock} unit(s) available\n"
                f"- **Matching Rule:** Exact voltage match, compatible connector, satisfies minimum wattage (excess: {best_eval['wattage_excess']}W).\n"
                f"- **Recommendation:** Eligible for immediate dispatch via the Parts Desk console!"
            )
        elif specs.missing_fields:
            reply = (
                f"⚠️ **Incomplete Customer Specifications:**\n"
                f"I detected requirements from your query, but missing essential fields: `{', '.join(specs.missing_fields)}`.\n"
                f"Please specify the voltage (e.g. 12V), connector type (e.g. USB-C), and minimum wattage (e.g. 20W) so I can verify catalogue compatibility."
            )
        else:
            reply = (
                f"❌ **No Compatible Part Found in Catalogue:**\n"
                f"Searched all 12 catalogue parts for: "
                f"Voltage: `{specs.voltage.value}V`, Connector: `{specs.connector.value}`, Wattage: `≥{specs.minimum_wattage.value}W`.\n"
                f"None of our standard workshop parts meet all three electrical and physical interface criteria. "
                f"Recommended Action: Refer to workshop technician to order custom external parts."
            )

    elif "discrepanc" in msg or "aged" in msg:
        reply = (
            "🔍 **Aged Stock Discrepancy Report:**\n"
            "Under challenge rules, two aged parts have stock discrepancies:\n"
            "1. **PART-105 (AeroDrive Phantom 12)**: Aged snapshot advertised 1 unit, but physical warehouse has **0 units** (Overstated).\n"
            "2. **PART-108 (SparkMaster Hidden 24)**: Aged snapshot reported 0 units, but authoritative warehouse verification discovered **1 unit** (Understated - stock retrieved!)."
        )
    elif "status" in msg or "progress" in msg or "batch" in msg:
        b_status = batch.status if batch else "NOT_FOUND"
        proc = batch.processed_requests if batch else 0
        disp = batch.dispatched_requests if batch else 0
        rev = batch.human_review_requests if batch else 0
        spend = round(batch.total_spending, 4) if batch else 0.0
        reply = (
            f"📊 **Current Batch Status:** `{b_status}`\n"
            f"- Processed: **{proc}/6** requests\n"
            f"- Dispatched: **{disp}**\n"
            f"- Human Escalations: **{rev}**\n"
            f"- Cumulative Spending: **${spend}** (Budget Limit: ${batch.budget_limit if batch else 5.0})"
        )
    elif "voltage" in msg or "rule 1" in msg:
        reply = (
            "⚡ **Rule 1: Voltage Compatibility:**\n"
            "Voltage must match the part specification exactly. Different voltage ratings are never interchangeable. "
            "If voltage is ambiguous or missing, we trigger scripted customer clarification; if still unresolved, we escalate to human review."
        )
    elif "wattage" in msg or "rule 3" in msg:
        reply = (
            "💡 **Rule 3: Wattage Compatibility:**\n"
            "Customer requests require minimum 10W or 20W. A part with higher wattage is acceptable (`part_wattage >= requested_minimum_wattage`). "
            "For example, a 20W or 30W part can safely satisfy a 10W request!"
        )
    elif "part" in msg:
        reply = (
            f"📦 **Parts Inventory:** We have {len(parts)} fictional parts catalogued across 5V, 12V, 15V, 18V, 24V, and 48V. "
            "Each part has verified wattage ratings and connector specifications."
        )
    elif "help" in msg or "who are you" in msg:
        reply = (
            "🤖 **Workshop Parts Desk AI Assistant:**\n"
            "I assist workshop engineers in inspecting catalogue parts, monitoring AI agent decisions, "
            "tracking inventory discrepancies, and reviewing audit trails across the 6 customer requests."
        )
    else:
        reply = (
            f"I analyzed your workshop query: '{payload.message}'. "
            f"The active batch `{batch_id}` currently has {len(requests)} requests loaded and {len(parts)} parts in catalogue. "
            "You can start batch processing, review stock discrepancies, or inspect audit evidence in the dashboard."
        )

    return {
        "reply": reply,
        "batch_id": batch_id,
        "timestamp": datetime.datetime.utcnow().isoformat()
    }
