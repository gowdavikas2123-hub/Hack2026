import re
import json
import time
from typing import Dict, Any, Tuple
from app.models.schemas import ExtractedSpecifications, VoltageSpec, ConnectorSpec, WattageSpec
from app.core.config import settings
from app.core.logging_config import logger

class SpecificationAgent:
    """Agent responsible for understanding customer requests and extracting technical specifications."""

    def __init__(self):
        self.mode = settings.LLM_MODE
        self.model = settings.OPENAI_MODEL

    def extract_specifications(self, text: str) -> Tuple[ExtractedSpecifications, Dict[str, Any]]:
        """
        Extracts voltage, connector, minimum wattage, and detects missing/ambiguous fields.
        Returns (ExtractedSpecifications, token_usage_info).
        """
        if self.mode == "live" and settings.OPENAI_API_KEY:
            try:
                return self._extract_with_openai(text)
            except Exception as e:
                logger.warning(f"OpenAI extraction failed ({e}), falling back to deterministic extraction.")
                return self._extract_deterministic(text, fallback_note=str(e))
        else:
            return self._extract_deterministic(text)

    def _extract_deterministic(self, text: str, fallback_note: str = None) -> Tuple[ExtractedSpecifications, Dict[str, Any]]:
        """High-precision deterministic rule-based extractor with exact evidence tracking."""
        lower_text = text.lower()
        missing_fields = []
        ambiguous_fields = []

        # Check if customer clarification was appended (takes authoritative precedence)
        clarification_volt_match = None
        clarification_conn_match = None
        if "customer clarification" in lower_text:
            clarif_section = lower_text.split("customer clarification")[-1]
            clarif_v = re.search(r'(?:strictly\s+requires|voltage\s+is|is|takes|requires)\s*(\d+(?:\.\d+)?)\s*(?:v\b|volts?\b|-volt)', clarif_section)
            if not clarif_v:
                clarif_v = re.search(r'(\d+(?:\.\d+)?)\s*(?:v\b|volts?\b|-volt)', clarif_section)
            if clarif_v:
                clarification_volt_match = float(clarif_v.group(1))

            if "usb-c" in clarif_section or "type-c" in clarif_section or "oval usb" in clarif_section:
                clarification_conn_match = "USB-C"
            elif "5.5mm" in clarif_section or "barrel" in clarif_section:
                clarification_conn_match = "Barrel-5.5mm"
            elif "screw" in clarif_section or "terminal" in clarif_section:
                clarification_conn_match = "Screw-Terminal"

        # --- 1. Voltage extraction ---
        voltage_spec = VoltageSpec()
        if clarification_volt_match is not None:
            voltage_spec.value = clarification_volt_match
            voltage_spec.status = "known"
            voltage_spec.evidence = f"Clarified by customer: {clarification_volt_match}V"
        else:
            # Check for ambiguity like "5V or 12V" or "forgot whether"
            ambig_volt_match = re.search(r'(\d+)\s*(?:v|volts?)\s*or\s*(\d+)\s*(?:v|volts?)', lower_text)
            if ambig_volt_match or "forgot whether" in lower_text or ("either" in lower_text and "volt" in lower_text):
                voltage_spec.status = "ambiguous"
                ambiguous_fields.append("voltage")
                voltage_spec.evidence = ambig_volt_match.group(0) if ambig_volt_match else "Ambiguous voltage mentioned"
            else:
                volt_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:v\b|volts?\b|-volt)', lower_text)
                if volt_match:
                    voltage_spec.value = float(volt_match.group(1))
                    voltage_spec.status = "known"
                    voltage_spec.evidence = volt_match.group(0)
                else:
                    voltage_spec.status = "missing"
                    missing_fields.append("voltage")

        # --- 2. Connector extraction ---
        connector_spec = ConnectorSpec()
        if clarification_conn_match is not None:
            connector_spec.value = clarification_conn_match
            connector_spec.status = "known"
            connector_spec.evidence = f"Clarified by customer: {clarification_conn_match}"
        elif "not sure which connector" in lower_text or "unknown connector" in lower_text or "what connector" in lower_text:
            connector_spec.status = "missing"
            missing_fields.append("connector")
            connector_spec.evidence = "Customer indicated unknown connector"
        elif "usb-c" in lower_text or "type-c" in lower_text or "oval usb" in lower_text:
            connector_spec.value = "USB-C"
            connector_spec.status = "known"
            connector_spec.evidence = "USB-C connector"
        elif "5.5mm" in lower_text or "barrel" in lower_text:
            connector_spec.value = "Barrel-5.5mm"
            connector_spec.status = "known"
            connector_spec.evidence = "5.5mm barrel plug"
        elif "screw" in lower_text or "terminal" in lower_text:
            connector_spec.value = "Screw-Terminal"
            connector_spec.status = "known"
            connector_spec.evidence = "Screw terminal"
        elif "micro-usb" in lower_text or "micro usb" in lower_text:
            connector_spec.value = "Micro-USB"
            connector_spec.status = "known"
            connector_spec.evidence = "Micro-USB"
        elif "din" in lower_text:
            connector_spec.value = "DIN-4"
            connector_spec.status = "known"
            connector_spec.evidence = "DIN connector"
        elif "banana" in lower_text:
            connector_spec.value = "Banana-Plug"
            connector_spec.status = "known"
            connector_spec.evidence = "Banana plug"
        else:
            connector_spec.status = "missing"
            missing_fields.append("connector")

        # --- 3. Minimum wattage extraction ---
        wattage_spec = WattageSpec()
        watt_match = re.search(r'(?:at\s+least|minimum|min|rated\s+for\s+at\s+least|handle\s+at\s+least)?\s*(\d+(?:\.\d+)?)\s*(?:w\b|watts?\b)', lower_text)
        if watt_match:
            wattage_spec.value = float(watt_match.group(1))
            wattage_spec.status = "known"
            wattage_spec.evidence = watt_match.group(0)
        else:
            wattage_spec.status = "missing"
            missing_fields.append("minimum_wattage")

        specs = ExtractedSpecifications(
            voltage=voltage_spec,
            connector=connector_spec,
            minimum_wattage=wattage_spec,
            missing_fields=missing_fields,
            ambiguous_fields=ambiguous_fields,
            raw_interpretation=fallback_note or "Deterministic extraction completed."
        )

        # Token usage simulation for mock mode (approx 85 prompt tokens, 45 completion tokens)
        token_usage = {
            "prompt_tokens": len(text.split()) + 45,
            "completion_tokens": 35,
            "total_tokens": len(text.split()) + 80,
            "is_mock": True
        }

        return specs, token_usage

    def _extract_with_openai(self, text: str) -> Tuple[ExtractedSpecifications, Dict[str, Any]]:
        from openai import OpenAI
        client = OpenAI(
            api_key=settings.OPENAI_API_KEY,
            timeout=settings.LLM_TIMEOUT_SECONDS,
            max_retries=settings.LLM_MAX_RETRIES
        )

        system_prompt = (
            "You are an expert workshop parts engineer. Extract technical specifications strictly from the customer message.\n"
            "Respond in JSON matching the schema with voltage (value, unit, status, evidence), connector (value, status, evidence), "
            "minimum_wattage (value, unit, status, evidence), missing_fields, ambiguous_fields.\n"
            "Never invent values not supported by the customer message."
        )

        response = client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text}
            ],
            response_format={"type": "json_object"}
        )

        content = response.choices[0].message.content
        data = json.loads(content)
        specs = ExtractedSpecifications(**data)

        usage = response.usage
        token_usage = {
            "prompt_tokens": usage.prompt_tokens if usage else 100,
            "completion_tokens": usage.completion_tokens if usage else 50,
            "total_tokens": usage.total_tokens if usage else 150,
            "is_mock": False
        }

        return specs, token_usage
