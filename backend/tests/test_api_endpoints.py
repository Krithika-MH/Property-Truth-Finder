import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_full_api_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Health
        res_health = await ac.get("/api/health")
        assert res_health.status_code == 200
        assert res_health.json()["status"] == "healthy"

        # 2. Samples
        res_samples = await ac.get("/api/samples")
        assert res_samples.status_code == 200
        samples = res_samples.json()
        assert len(samples) >= 3

        # 3. Create Investigation (Mock)
        res_inv = await ac.post("/api/investigations", json={
            "listing_url": "https://www.magicbricks.com/propertyDetails/2-BHK-1150-Sq-ft-Multistorey-Apartment-FOR-Sale-Whitefield-in-Bangalore&id=4d4235333633393139"
        })
        assert res_inv.status_code == 200
        inv_data = res_inv.json()
        assert "id" in inv_data
        assert inv_data["mode"] in ("MOCK", "LIVE")

        inv_id = inv_data["id"]

        # 4. Get Investigation
        res_get = await ac.get(f"/api/investigations/{inv_id}")
        assert res_get.status_code == 200

        # 5. Cancel Investigation
        res_cancel = await ac.post(f"/api/investigations/{inv_id}/cancel")
        assert res_cancel.status_code == 200
        assert res_cancel.json()["status"] == "CANCELLED"

        # 6. Replay Demo Endpoint
        res_replay = await ac.get("/api/demo/replay")
        assert res_replay.status_code == 200
        replay_data = res_replay.json()
        assert "id" in replay_data
        assert replay_data["mode"] == "REPLAY"

        # 7. Frontend SPA fallback routes
        res_root = await ac.get("/")
        assert res_root.status_code == 200
        assert "text/html" in res_root.headers.get("content-type", "")

        res_spa = await ac.get("/how-it-works")
        assert res_spa.status_code == 200
        assert "text/html" in res_spa.headers.get("content-type", "")
