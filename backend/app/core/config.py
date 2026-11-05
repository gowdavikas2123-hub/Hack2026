import os
from typing import Optional
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    APP_NAME: str = os.getenv("APP_NAME", "Workshop Parts Desk")
    APP_ENV: str = os.getenv("APP_ENV", "development")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() in ("true", "1", "yes")
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")

    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./workshop.db")

    # LLM settings
    LLM_MODE: str = os.getenv("LLM_MODE", "mock").lower()  # "mock" or "live"
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    LLM_TIMEOUT_SECONDS: int = int(os.getenv("LLM_TIMEOUT_SECONDS", "30"))
    LLM_MAX_RETRIES: int = int(os.getenv("LLM_MAX_RETRIES", "3"))

    # Tool execution mode
    TOOL_MODE: str = os.getenv("TOOL_MODE", "mock").lower()  # "mock" or "live"

    # Spending and budget
    TOTAL_BUDGET_LIMIT: float = float(os.getenv("TOTAL_BUDGET_LIMIT", "5.00"))
    MAX_LLM_SPENDING: float = float(os.getenv("MAX_LLM_SPENDING", "3.00"))
    MAX_TOOL_SPENDING: float = float(os.getenv("MAX_TOOL_SPENDING", "2.00"))

    # Currency Conversion Rate: USD to Indian Rupees (INR - ₹)
    USD_TO_INR_RATE: float = float(os.getenv("USD_TO_INR_RATE", "87.00"))

    # Hackathon Platform Measures (Official Organizer Rules)
    # Total shared tool units across all requests = 14
    TOOL_UNIT_BUDGET: int = 14
    MAX_ACTIONS_PER_BATCH: int = 60

    # Platform tool unit consumption costs
    COST_INSPECT_UNITS: int = 1
    COST_CLARIFY_UNITS: int = 2
    COST_VERIFY_UNITS: int = 2
    COST_DECISION_UNITS: int = 0
    COST_INVALID_ACTION_UNITS: int = 1

    # Official pricing per million tokens (USD)
    # gpt-4o-mini: $0.15 per 1M input tokens, $0.60 per 1M output tokens
    # gpt-4o: $2.50 per 1M input tokens, $10.00 per 1M output tokens
    PRICE_INPUT_PER_1M: float = 0.15
    PRICE_OUTPUT_PER_1M: float = 0.60

    # Tool invocation cost (USD) - hackathon tools are free unless specified
    TOOL_INSPECTION_COST: float = 0.00
    TOOL_CLARIFICATION_COST: float = 0.00
    TOOL_VERIFICATION_COST: float = 0.00
    TOOL_DISPATCH_COST: float = 0.00

settings = Settings()
