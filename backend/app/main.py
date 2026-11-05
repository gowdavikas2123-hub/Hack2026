from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.models.database_models import PersistentRequest
from app.api.routes import (
    batch_routes, request_routes, catalogue_routes,
    dispatch_routes, review_routes, analytics_routes
)
from app.services.batch_service import BatchService
from app.fixtures.demo_scenario import DEMO_PARTS, DEMO_REQUESTS

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description="Agentic AI Assisted Parts Management System for Workshop Operations",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API route modules
app.include_router(catalogue_routes.router)
app.include_router(batch_routes.router)
app.include_router(request_routes.router)
app.include_router(dispatch_routes.router)
app.include_router(review_routes.router)
app.include_router(analytics_routes.router)

@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        from app.models.database_models import PartCatalogue
        count = db.query(PartCatalogue).count()
        if count == 0:
            batch_service = BatchService()
            batch_service.reset_demo_scenario(db)
    finally:
        db.close()

@app.get("/api/health", tags=["System"])
def health_check():
    return {
        "status": "HEALTHY",
        "app_name": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "llm_mode": settings.LLM_MODE,
        "tool_mode": settings.TOOL_MODE,
        "database": "sqlite_connected"
    }

@app.get("/api/scenario", tags=["Scenario"])
def get_scenario_metadata():
    return {
        "challenge_name": "Workshop Parts Desk Challenge",
        "requests_count": len(DEMO_REQUESTS),
        "parts_count": len(DEMO_PARTS),
        "aged_discrepancies": [
            {
                "part_id": "PART-105",
                "type": "OVERSTATED",
                "snapshot_qty": 1,
                "warehouse_qty": 0,
                "description": "Aged snapshot claims 1 unit available, but physical warehouse has 0 units."
            },
            {
                "part_id": "PART-108",
                "type": "UNDERSTATED",
                "snapshot_qty": 0,
                "warehouse_qty": 1,
                "description": "Aged snapshot claims 0 units, but physical warehouse has 1 unit available."
            }
        ],
        "voltage_rule": "Strict equality (exact match required)",
        "wattage_rule": "part_wattage >= requested_minimum_wattage",
        "budget_limit": settings.TOTAL_BUDGET_LIMIT
    }

@app.post("/api/scenario/reset", tags=["Scenario"])
def reset_scenario():
    db = SessionLocal()
    try:
        batch_service = BatchService()
        result = batch_service.reset_demo_scenario(db)
        return result
    finally:
        db.close()

# Mount frontend production build as static files so entire app is unified under ONE URL
import os
from fastapi.staticfiles import StaticFiles

frontend_dist = os.path.abspath(
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend", "dist")
)
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")

