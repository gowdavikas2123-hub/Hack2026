import asyncio
import httpx
from app.main import app
from app.core.database import SessionLocal
from app.services.batch_service import BatchService

async def main():
    print("Initializing database and demo scenario...", flush=True)
    db = SessionLocal()
    batch_service = BatchService()
    batch_service.reset_demo_scenario(db)
    db.close()
    print("Database scenario initialized.", flush=True)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        print("\n=== 1. Health Endpoint ===", flush=True)
        res = await client.get("/api/health")
        assert res.status_code == 200
        print("Health response:", res.json(), flush=True)

        print("\n=== 2. Scenario Metadata ===", flush=True)
        res = await client.get("/api/scenario")
        assert res.status_code == 200
        scenario = res.json()
        assert scenario["requests_count"] == 6
        assert scenario["parts_count"] == 12
        print(f"Scenario: {scenario['challenge_name']}, Requests: {scenario['requests_count']}, Parts: {scenario['parts_count']}", flush=True)
        print("Aged discrepancies:", scenario["aged_discrepancies"], flush=True)

        print("\n=== 3. Reset Demo Scenario ===", flush=True)
        res = await client.post("/api/scenario/reset")
        assert res.status_code == 200
        print("Reset result:", res.json(), flush=True)

        print("\n=== 4. Catalogue Endpoints ===", flush=True)
        res = await client.get("/api/catalogue")
        assert res.status_code == 200
        parts = res.json()
        assert len(parts) == 12
        print(f"Catalogue parts count: {len(parts)}", flush=True)

        res = await client.get("/api/catalogue/PART-101")
        assert res.status_code == 200
        print("Part 101:", res.json()["name"], f"({res.json()['voltage']}V, {res.json()['connector']}, {res.json()['wattage']}W)", flush=True)

        print("\n=== 5. Run Batch (Processes All 6 Customer Requests) ===", flush=True)
        res = await client.post("/api/batches/BATCH-001/run")
        assert res.status_code == 200
        batch_summary = res.json()
        print(f"Batch: {batch_summary['id']}, Status: {batch_summary['status']}, Processed: {batch_summary['processed_requests']}, Dispatched: {batch_summary['dispatched_requests']}, Escalated: {batch_summary['human_review_requests']}", flush=True)
        assert batch_summary["processed_requests"] == 6
        assert batch_summary["dispatched_requests"] + batch_summary["human_review_requests"] == 6

        print("\n=== 6. Requests Inspection ===", flush=True)
        res = await client.get("/api/batches/BATCH-001/requests")
        assert res.status_code == 200
        requests = res.json()
        assert len(requests) == 6
        for r in requests:
            print(f"[{r['id']}] Status: {r['status']} | Outcome: {r['final_outcome']} | Part: {r['selected_part_id']} | Reason: {r['outcome_reason'][:60]}...", flush=True)

        print("\n=== 7. Audit & Evidence Endpoints ===", flush=True)
        res = await client.get("/api/batches/BATCH-001/audit")
        assert res.status_code == 200
        audit = res.json()
        print(f"Audit requests recorded: {len(audit['audit_trail'])}", flush=True)

        res = await client.get("/api/batches/BATCH-001/evidence")
        assert res.status_code == 200
        evidence = res.json()
        print(f"Verifiable evidence records: {len(evidence)}", flush=True)
        assert len(evidence) > 0

        print("\n=== 8. Spending & Tool Tracking ===", flush=True)
        res = await client.get("/api/batches/BATCH-001/spending")
        assert res.status_code == 200
        spending = res.json()
        print(f"Total Known Spending: ${spending['total_known_spending']}, Remaining Budget: ${spending['remaining_budget']}", flush=True)

        res = await client.get("/api/batches/BATCH-001/tool-logs")
        assert res.status_code == 200
        tool_logs = res.json()
        print(f"Total tool execution logs: {len(tool_logs)}", flush=True)
        assert len(tool_logs) > 0

        print("\n=== 9. Dispatches Endpoint ===", flush=True)
        res = await client.get("/api/batches/BATCH-001/dispatches")
        assert res.status_code == 200
        dispatches = res.json()
        print(f"Dispatched orders count: {len(dispatches)}", flush=True)
        for d in dispatches:
            print(f"Dispatch Ref: {d['dispatch_reference']} | Part: {d['part_id']} | Simulated: {d['is_simulated']}", flush=True)

        print("\n=== 10. Human Review Revalidation Endpoint ===", flush=True)
        res = await client.get("/api/batches/BATCH-001/human-review")
        assert res.status_code == 200
        reviews = res.json()
        print(f"Human review cases count: {len(reviews)}", flush=True)
        assert len(reviews) > 0

        # Safety revalidation test: reject invalid part (mismatched voltage)
        invalid_resolve = await client.post(
            "/api/requests/REQ-004/resolve",
            json={"action": "DISPATCH", "part_id": "PART-104", "operator_name": "Supervisor", "notes": "Wrong voltage test"}
        )
        assert invalid_resolve.status_code == 400
        print("Safety Revalidation correctly blocked mismatch:", invalid_resolve.json()["detail"], flush=True)

        # Cancel resolution
        cancel_resolve = await client.post(
            "/api/requests/REQ-006/resolve",
            json={"action": "CANCEL", "operator_name": "Supervisor", "notes": "No 36V parts exist in workshop. Customer notified."}
        )
        assert cancel_resolve.status_code == 200
        print("Cancellation resolution result:", cancel_resolve.json(), flush=True)

        print("\n=== 11. Chatbot Assistant Endpoint ===", flush=True)
        chat_res = await client.post(
            "/api/chat",
            json={"message": "What are the aged stock discrepancies?", "batch_id": "BATCH-001"}
        )
        assert chat_res.status_code == 200
        print("Chatbot response:\n", chat_res.json()["reply"], flush=True)

        print("\n=== 12. Persistent Memory History & INR Cost ===", flush=True)
        hist_res = await client.get("/api/requests/history")
        assert hist_res.status_code == 200
        history = hist_res.json()
        print(f"Total remembered historical inquiries: {len(history)}", flush=True)
        assert len(history) >= 6
        for h in history[:3]:
            print(f"Remembered: [{h['id']}] {h['customer_name']} | Outcome: {h['final_outcome']} | Cost: ₹{h.get('cost_inr', 0.0)}", flush=True)

        print("\n=== 13. Platform Measures Verification ===", flush=True)
        assert batch_summary["tool_units_spent"] <= 14
        assert batch_summary["total_actions_count"] <= 60
        print(f"Verified: Tool units spent = {batch_summary['tool_units_spent']}/14, Total actions = {batch_summary['total_actions_count']}/60", flush=True)
        print(f"Verified: AI Cost in INR = ₹{batch_summary['total_spending_inr']}", flush=True)

        print("\n==========================================", flush=True)
        print("ALL REST ENDPOINTS VERIFIED SUCCESSFULLY!", flush=True)
        print("==========================================", flush=True)

if __name__ == "__main__":
    asyncio.run(main())
