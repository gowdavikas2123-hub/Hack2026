from typing import Dict, Any, List, Optional, Tuple
from app.models.schemas import ExtractedSpecifications

class CompatibilityService:
    """Deterministic compatibility rules engine adhering strictly to workshop business rules."""

    @staticmethod
    def check_voltage_compatibility(requested_voltage: Optional[float], part_voltage: float) -> Tuple[bool, str]:
        """
        Rule 1: Voltage compatibility
        The requested voltage must match the part's voltage specification.
        Do not assume different voltage ratings are interchangeable.
        """
        if requested_voltage is None:
            return False, "Requested voltage is unknown or missing."
        
        # Float equality with small epsilon for precision tolerance
        if abs(requested_voltage - part_voltage) < 0.01:
            return True, f"Voltage matches exactly ({part_voltage}V)."
        else:
            return False, f"Voltage mismatch: requested {requested_voltage}V, part provides {part_voltage}V."

    @staticmethod
    def check_connector_compatibility(requested_connector: Optional[str], part_connector: str, part_notes: str = "") -> Tuple[bool, str]:
        """
        Rule 2: Connector compatibility
        The connector must be compatible with customer's requirement.
        Do not assume two connectors are compatible just because names look similar.
        Use explicit compatibility information.
        """
        if not requested_connector:
            return False, "Requested connector type is unknown or missing."

        req_clean = requested_connector.strip().lower()
        part_clean = part_connector.strip().lower()

        # Direct normalization matches
        if req_clean == part_clean:
            return True, f"Connector matches directly ({part_connector})."

        # Explicit known synonyms/standards
        if ("usb-c" in req_clean or "type-c" in req_clean) and ("usb-c" in part_clean or "type-c" in part_clean):
            return True, f"Connector compatible (USB Type-C: requested '{requested_connector}', part '{part_connector}')."

        if ("5.5mm" in req_clean or "barrel" in req_clean) and ("5.5mm" in part_clean or "barrel" in part_clean):
            return True, f"Connector compatible (5.5mm Barrel: requested '{requested_connector}', part '{part_connector}')."

        if ("screw" in req_clean or "terminal" in req_clean) and ("screw" in part_clean or "terminal" in part_clean):
            return True, f"Connector compatible (Screw-Terminal: requested '{requested_connector}', part '{part_connector}')."

        if "micro-usb" in req_clean and "micro-usb" in part_clean:
            return True, f"Connector compatible (Micro-USB: requested '{requested_connector}', part '{part_connector}')."

        if "din" in req_clean and "din" in part_clean:
            return True, f"Connector compatible (DIN standard: requested '{requested_connector}', part '{part_connector}')."

        if "banana" in req_clean and "banana" in part_clean:
            return True, f"Connector compatible (Banana plugs: requested '{requested_connector}', part '{part_connector}')."

        return False, f"Incompatible connector: requested '{requested_connector}', part has '{part_connector}'."

    @staticmethod
    def check_wattage_compatibility(requested_min_wattage: Optional[float], part_wattage: float) -> Tuple[bool, str]:
        """
        Rule 3: Wattage compatibility
        Every request requires either 10 W or 20 W minimum wattage.
        A part with a higher wattage rating is acceptable.
        Formula: part_wattage >= requested_minimum_wattage
        """
        if requested_min_wattage is None:
            return False, "Requested minimum wattage is unknown or missing."

        if part_wattage >= requested_min_wattage:
            return True, f"Wattage acceptable: part delivers {part_wattage}W >= requested minimum {requested_min_wattage}W."
        else:
            return False, f"Wattage insufficient: part delivers {part_wattage}W < requested minimum {requested_min_wattage}W."

    @staticmethod
    def check_stock_eligibility(current_ledger_stock: int, verified_stock: Optional[int] = None) -> Tuple[bool, str]:
        """
        Rules 4 & 5 & 6: Stock eligibility
        Stock must be confirmed available (> 0) in the ledger / authoritative warehouse.
        """
        effective_stock = verified_stock if verified_stock is not None else current_ledger_stock
        if effective_stock > 0:
            return True, f"Stock available ({effective_stock} unit(s) confirmed)."
        else:
            return False, "Stock unavailable (0 units available)."

    @classmethod
    def check_overall_compatibility(
        cls,
        specs: ExtractedSpecifications,
        part: Dict[str, Any],
        current_ledger_stock: int,
        verified_stock: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Evaluates overall technical and stock compatibility of a part against customer specifications.
        """
        v_match, v_reason = cls.check_voltage_compatibility(specs.voltage.value, part["voltage"])
        c_match, c_reason = cls.check_connector_compatibility(specs.connector.value, part["connector"], part.get("compatibility_notes", ""))
        w_match, w_reason = cls.check_wattage_compatibility(specs.minimum_wattage.value, part["wattage"])
        s_match, s_reason = cls.check_stock_eligibility(current_ledger_stock, verified_stock)

        is_technically_compatible = v_match and c_match and w_match
        is_fully_suitable = is_technically_compatible and s_match

        wattage_excess = (part["wattage"] - specs.minimum_wattage.value) if (specs.minimum_wattage.value and w_match) else 999.0

        return {
            "part_id": part["id"],
            "name": part["name"],
            "voltage_match": v_match,
            "voltage_reason": v_reason,
            "connector_match": c_match,
            "connector_reason": c_reason,
            "wattage_match": w_match,
            "wattage_reason": w_reason,
            "wattage_excess": wattage_excess,
            "stock_match": s_match,
            "stock_reason": s_reason,
            "is_technically_compatible": is_technically_compatible,
            "is_fully_suitable": is_fully_suitable
        }
