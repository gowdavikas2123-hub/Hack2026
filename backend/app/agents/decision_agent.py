import json
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.database_models import CustomerRequest, PartCatalogue, DecisionRecord, HumanReviewRecord, StockSnapshot
from app.models.schemas import ExtractedSpecifications
from app.services.compatibility_service import CompatibilityService
from app.services.stock_service import StockService
from app.core.logging_config import logger

class DecisionAgent:
    """Intelligent decision engine enforcing deterministic selection strategies and human escalation boundaries."""

    def __init__(self, stock_service: Optional[StockService] = None):
        self.stock_service = stock_service or StockService()

    def evaluate_request(
        self,
        db: Session,
        request: CustomerRequest,
        specs: ExtractedSpecifications,
        catalogue_parts: List[Dict[str, Any]],
        budget_exceeded: bool = False
    ) -> Tuple[str, Optional[str], str, Dict[str, Any]]:
        """
        Evaluates customer request against catalogue parts according to strict business rules.
        Returns:
            outcome: "DISPATCH" or "HUMAN_REVIEW"
            selected_part_id: str or None
            reason: str
            audit_meta: Dict containing candidate evaluations and checks
        """
        # 1. Budget limit check
        if budget_exceeded:
            reason = "Automatic operations halted: configured budget limit exceeded before request resolution."
            self._record_human_escalation(
                db, request, reason,
                recommended_action="Supervisor authorization required to allocate additional budget."
            )
            return "HUMAN_REVIEW", None, reason, {"escalation_reason": reason}

        # 2. Check completeness of extracted specifications
        if specs.missing_fields or specs.ambiguous_fields:
            missing_desc = ", ".join(specs.missing_fields + specs.ambiguous_fields)
            reason = f"Required customer specifications incomplete or ambiguous ({missing_desc}) even after evaluation."
            self._record_human_escalation(
                db, request, reason,
                missing_info=missing_desc,
                recommended_action="Contact customer manually to confirm missing technical specifications."
            )
            return "HUMAN_REVIEW", None, reason, {"missing_fields": specs.missing_fields, "ambiguous_fields": specs.ambiguous_fields}

        # 3. Test compatibility across all catalogue parts
        candidate_evaluations = []
        technically_compatible_parts = []

        for part in catalogue_parts:
            # Query active ledger stock
            db_part = db.query(PartCatalogue).filter(PartCatalogue.id == part["id"]).first()
            ledger_stock = db_part.current_stock if db_part else 0

            # Evaluate preliminary compatibility
            evaluation = CompatibilityService.check_overall_compatibility(
                specs=specs,
                part=part,
                current_ledger_stock=ledger_stock,
                verified_stock=None
            )
            candidate_evaluations.append(evaluation)

            if evaluation["is_technically_compatible"]:
                technically_compatible_parts.append((part, evaluation))

        # 4. Check if ANY technically compatible part exists
        if not technically_compatible_parts:
            reason = f"No technically compatible part exists in the catalogue for {specs.voltage.value}V, {specs.connector.value}, min {specs.minimum_wattage.value}W."
            self._record_human_escalation(
                db, request, reason,
                failed_checks="Zero parts in the catalogue match required voltage, connector, and minimum wattage.",
                recommended_action="Source custom or external part outside standard 12-part workshop catalogue."
            )
            return "HUMAN_REVIEW", None, reason, {"candidates": candidate_evaluations}

        # 5. Check stock & verification for technically compatible parts
        eligible_candidates = []

        for part, prelim_eval in technically_compatible_parts:
            # Fetch snapshot freshness
            snap = db.query(StockSnapshot).filter(StockSnapshot.part_id == part["id"]).order_by(StockSnapshot.id.desc()).first()
            freshness = snap.freshness if snap else "RECENT"

            # Execute authoritative warehouse verification if AGED
            is_avail, effective_stock, verif_rec = self.stock_service.verify_stock_if_needed(
                db=db,
                part_id=part["id"],
                request_id=request.id
            )

            # Re-check stock eligibility with authoritative stock
            stock_match, stock_reason = CompatibilityService.check_stock_eligibility(
                current_ledger_stock=effective_stock,
                verified_stock=effective_stock
            )

            prelim_eval["verified_stock"] = effective_stock
            prelim_eval["freshness"] = freshness
            prelim_eval["stock_match"] = stock_match
            prelim_eval["stock_reason"] = stock_reason

            if stock_match:
                eligible_candidates.append({
                    "part": part,
                    "evaluation": prelim_eval,
                    "wattage_excess": prelim_eval["wattage_excess"],
                    "is_recent": (freshness == "RECENT")
                })

        # 6. Check if any compatible part has verified stock
        if not eligible_candidates:
            reason = (
                f"Technically compatible parts exist ({', '.join(p['id'] for p, _ in technically_compatible_parts)}), "
                f"but none currently have confirmed warehouse stock."
            )
            self._record_human_escalation(
                db, request, reason,
                stock_issues="Compatible parts are out of physical warehouse stock or failed inventory verification.",
                recommended_action="Place warehouse replenishment order or review alternative stock bins."
            )
            return "HUMAN_REVIEW", None, reason, {"candidates": candidate_evaluations}

        # 7. Apply deterministic selection strategy:
        # Rule 1: Least unnecessary wattage excess
        # Rule 2: Prefer candidates whose stock evidence is reliable (RECENT or verified)
        # Rule 3: Stable part ID as final tie-breaker
        eligible_candidates.sort(
            key=lambda c: (
                c["wattage_excess"],
                0 if c["is_recent"] else 1,
                c["part"]["id"]
            )
        )

        chosen = eligible_candidates[0]
        chosen_part = chosen["part"]
        chosen_eval = chosen["evaluation"]

        selection_reason = (
            f"Selected {chosen_part['id']} ({chosen_part['name']}): "
            f"Exact voltage match ({chosen_part['voltage']}V), "
            f"compatible connector ({chosen_part['connector']}), "
            f"meets minimum wattage ({chosen_part['wattage']}W >= {specs.minimum_wattage.value}W, excess: {chosen['wattage_excess']}W), "
            f"and warehouse stock confirmed available."
        )

        # Record decision record
        dec_rec = DecisionRecord(
            request_id=request.id,
            decision="DISPATCH",
            selected_part_id=chosen_part["id"],
            reasoning=selection_reason,
            voltage_match=chosen_eval["voltage_match"],
            connector_match=chosen_eval["connector_match"],
            wattage_match=chosen_eval["wattage_match"],
            stock_confirmed=chosen_eval["stock_match"],
            candidate_parts_json=json.dumps([c["part"]["id"] for c in eligible_candidates])
        )
        db.add(dec_rec)
        db.commit()

        return "DISPATCH", chosen_part["id"], selection_reason, {"candidates": candidate_evaluations, "selected": chosen}

    def _record_human_escalation(
        self,
        db: Session,
        request: CustomerRequest,
        reason: str,
        missing_info: Optional[str] = None,
        failed_checks: Optional[str] = None,
        stock_issues: Optional[str] = None,
        tool_failures: Optional[str] = None,
        recommended_action: str = "Refer to workshop technician."
    ):
        esc_record = HumanReviewRecord(
            request_id=request.id,
            reason=reason,
            missing_info=missing_info,
            failed_checks=failed_checks,
            stock_issues=stock_issues,
            tool_failures=tool_failures,
            recommended_action=recommended_action,
            status="PENDING_HUMAN_ACTION"
        )
        db.add(esc_record)

        dec_record = DecisionRecord(
            request_id=request.id,
            decision="HUMAN_REVIEW",
            selected_part_id=None,
            reasoning=reason,
            voltage_match=False,
            connector_match=False,
            wattage_match=False,
            stock_confirmed=False
        )
        db.add(dec_record)
        db.commit()
