import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.database_models import PartCatalogue, CustomerRequest, StockSnapshot, Batch, PersistentRequest
from app.fixtures.demo_scenario import DEMO_PARTS, DEMO_REQUESTS

TEST_DB_URL = "sqlite:///:memory:"

@pytest.fixture(scope="function")
def test_db():
    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()

    # Seed initial test batch, parts, and requests
    batch = Batch(
        id="TEST-BATCH-001",
        status="PENDING",
        total_requests=6,
        budget_limit=5.0,
        tool_units_budget=14,
        tool_units_spent=0,
        total_actions_count=0,
        max_actions_limit=60
    )
    db.add(batch)

    for p in DEMO_PARTS:
        part = PartCatalogue(
            id=p["id"],
            name=p["name"],
            voltage=p["voltage"],
            connector=p["connector"],
            wattage=p["wattage"],
            technical_description=p["technical_description"],
            compatibility_notes=p.get("compatibility_notes"),
            current_stock=p["snapshot_quantity"]
        )
        db.add(part)
        db.flush()

        snap = StockSnapshot(
            part_id=p["id"],
            snapshot_quantity=p["snapshot_quantity"],
            freshness=p["snapshot_freshness"]
        )
        db.add(snap)

    for r in DEMO_REQUESTS:
        req = CustomerRequest(
            id=r["id"],
            batch_id="TEST-BATCH-001",
            customer_name=r["customer_name"],
            original_message=r["original_message"],
            status="PENDING"
        )
        db.add(req)

        pers = PersistentRequest(
            id=r["id"],
            batch_id="TEST-BATCH-001",
            customer_name=r["customer_name"],
            original_message=r["original_message"],
            status="PENDING"
        )
        db.add(pers)

    db.commit()

    yield db

    db.close()
    Base.metadata.drop_all(bind=engine)
