# Workshop Parts Desk – Agentic AI Assisted Parts Management System

A production-grade Agentic AI application designed for the Workshop Parts Desk hackathon challenge. The system reads natural-language customer requests, leverages inspection, scripted clarification, and authoritative warehouse inventory verification tools, enforces deterministic electrical compatibility rules, and either executes transactional part dispatch or escalates safely to human review.

---

## Key Business Rules & Deterministic Logic

1. **Rule 1: Voltage Compatibility:** Strict exact match required (`requested_voltage == part_voltage`). Different voltage ratings are never interchangeable. Ambiguous/missing voltage triggers clarification or human escalation.
2. **Rule 2: Connector Compatibility:** Extracted from natural language prose. Supported interfaces include USB-C, 5.5mm Barrel, Screw-Terminal, Micro-USB, DIN-4, and Banana-Plug.
3. **Rule 3: Wattage Compatibility:** Every request requires minimum 10W or 20W. Part wattage must satisfy `part_wattage >= requested_minimum_wattage`. For example, a 20W part satisfies a 10W request; a 10W part cannot satisfy a 20W request.
4. **Rule 4 & 5: Stock Inspection & Authoritative Warehouse Verification:**
   - **RECENT snapshots:** Trusted initially; local ledger is updated on dispatch.
   - **AGED snapshots:** Must query authoritative warehouse inventory tool before dispatch, even if snapshot reports 0 stock.
   - **Aged Snapshot Discrepancies Handled:**
     - **PART-105 (Overstated):** Aged snapshot claims 1 unit, but warehouse has 0 &rarr; dispatch disallowed!
     - **PART-108 (Understated):** Aged snapshot claims 0 units, but warehouse has 1 unit &rarr; verified available and eligible for dispatch!
5. **Rule 6: Stock Quantity:** Each part carries 1 unit of stock when available. Dispatch atomically consumes that unit. Prevents double-dispatching the same unit across requests.
6. **Rule 7: Scripted Clarification:** Intermediate operation that queries customer scripted responses, updates message, and triggers re-extraction and re-evaluation. Max 1 attempt to avoid loops.
7. **Rule 8: Human Review:** Refer requests to a human when specifications cannot be established, no compatible part exists, stock verification fails, or budget limits are reached. Every escalation includes detailed reasoning and recommended actions.
8. **Revalidation Safety:** The Human Review manual override endpoint strictly revalidates all hard technical and stock requirements before authorizing dispatch.

---

## System Architecture

```
workshop-parts-desk/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app & routes initialization
│   │   ├── api/routes/              # REST API controllers
│   │   ├── agents/                  # SpecificationAgent, DecisionAgent, RequestAgent
│   │   ├── services/                # Compatibility, Stock, Clarification, Dispatch, Budget, Evidence
│   │   ├── integrations/            # Inspection, Clarification, Verification, Dispatch adapters
│   │   ├── models/                  # SQLAlchemy 12-table schema & Pydantic models
│   │   ├── core/                    # Config, Database, Logging
│   │   ├── fixtures/                # 6 Requests, 12 Parts demo scenario
│   │   └── tests/                   # 29 Automated unit, integration, and API tests
│   ├── requirements.txt
│   └── .env
└── frontend/
    ├── src/
    │   ├── components/              # UI Cockpit, SummaryCards, Requests, Catalogue, Monitor, Chatbot
    │   ├── services/api.ts          # Backend REST integration
    │   ├── types/index.ts           # TypeScript type definitions
    │   └── App.tsx                  # Main dashboard layout
    ├── package.json
    └── tailwind.config.js
```

---

## Quick Start Instructions

### 1. Backend Setup

```powershell
cd "C:\Users\mahesh s\.gemini\antigravity\scratch\workshop-parts-desk\backend"

# Activate Python Virtual Environment
.\venv\Scripts\Activate.ps1

# Run the test suite (all 29 tests execute in ~2 seconds)
pytest -v

# Start FastAPI backend server (Port 8000)
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

*FastAPI Interactive Swagger Documentation:* `http://127.0.0.1:8000/docs`

### 2. Frontend Setup

In a separate terminal:

```powershell
cd "C:\Users\mahesh s\.gemini\antigravity\scratch\workshop-parts-desk\frontend"

# Start the Vite React development server
npm run dev
```

*Open Dashboard in Browser:* `http://localhost:5173`

---

## Testing & Validation Summary

All 18 mandated challenge tests plus REST endpoint and chatbot validations pass with 100% success rate:

- **TEST 1:** 10W request matched with 20W part &rarr; ACCEPT
- **TEST 2:** 20W request matched with 10W part &rarr; REJECT
- **TEST 3:** Voltage mismatch &rarr; REJECT
- **TEST 4:** Incompatible connector &rarr; REJECT
- **TEST 5:** Recent stock snapshot trusted
- **TEST 6:** Aged snapshot overstated (1 vs 0) detected, dispatch disallowed
- **TEST 7:** Aged snapshot understated (0 vs 1) discovered, dispatch enabled
- **TEST 8 & 9:** Scripted clarification resolves ambiguous voltage & re-extracts specs
- **TEST 10:** Unresolved clarification leads safely to HUMAN_REVIEW
- **TEST 11:** Single stock part prevents double-dispatch
- **TEST 12:** Dispatch tool failure avoids incorrect inventory deduction
- **TEST 13:** Stock verification failure prevents dispatch of uncertain aged stock
- **TEST 14:** No compatible part leads to HUMAN_REVIEW
- **TEST 15:** Spending limit stops unsafe operations and escalates to HUMAN_REVIEW
- **TEST 16:** All 6 requests processed to terminal outcomes (DISPATCH or HUMAN_REVIEW)
- **TEST 17:** Idempotency key prevents duplicate dispatch
- **TEST 18:** Reset demo scenario restores initial 12 parts & 6 requests
- **TESTS 19-29:** REST endpoints, safety revalidation blocking mismatch, cancellation resolution, and Copilot Chatbot.
