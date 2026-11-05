# Workshop Parts Desk – Backend Service

FastAPI-powered Agentic AI Controller for autonomous workshop parts inspection, stock verification, customer clarification, deterministic compatibility matching, transactional simulated dispatch, human escalation, and cumulative spending management.

## Architecture

- **Web Framework:** FastAPI (RESTful API, OpenAPI documentation at `/docs`)
- **Database:** SQLite with SQLAlchemy ORM (12 relational tables)
- **Agentic Modules:**
  - `SpecificationAgent`: Pydantic structured output extraction with regex/prose entity recognition & OpenAI fallback
  - `DecisionAgent`: Deterministic compatibility evaluation enforcing strict voltage matching, connector matching, and wattage inequality (`part_wattage >= requested_minimum_wattage`)
  - `RequestAgent`: Request lifecycle coordination across Steps 1-10
  - `BatchService`: Multi-request batch orchestration & demo scenario reset
  - `StockService`: RECENT snapshot vs AGED warehouse verification with discrepancy detection
  - `ClarificationService`: Scripted customer clarification loop
  - `DispatchService`: Transactional local dispatch with idempotency protection and atomic stock updates
  - `BudgetService`: Cumulative prompt/completion token tracking & spending calculations
  - `EvidenceService`: Audit trail linking raw customer messages to extracted specs and decision rationale

## Setup & Running

1. **Activate Virtual Environment:**
   ```powershell
   venv\Scripts\Activate.ps1
   ```

2. **Install Dependencies:**
   ```powershell
   pip install -r requirements.txt
   ```

3. **Configure Environment:**
   Review `.env` file (defaults to `LLM_MODE=mock` for deterministic offline testing).

4. **Run Server:**
   ```powershell
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

5. **Run Automated Test Suite:**
   ```powershell
   pytest -v
   ```
