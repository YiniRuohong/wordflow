import time
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app


def test_full_flow_e2e():
    client = TestClient(app)

    # Health
    r = client.get("/health")
    assert r.status_code == 200

    # Ensure active wordbook exists (startup should create one)
    r = client.get("/api/v1/wordbooks/active")
    if r.status_code == 404:
        # Create and activate
        r2 = client.post("/api/v1/wordbooks/", json={
            "name": "E2E",
            "description": "E2E test wordbook",
            "language": "fr",
        })
        assert r2.status_code == 200
        wid = r2.json()["id"]
        r3 = client.post(f"/api/v1/wordbooks/{wid}/activate")
        assert r3.status_code == 200
    else:
        assert r.status_code == 200

    # Upload sample CSV
    sample_path = Path(__file__).resolve().parents[2] / "sample_10_words.csv"
    assert sample_path.exists(), f"Sample file missing: {sample_path}"
    with sample_path.open("rb") as f:
        r = client.post(
            "/api/v1/words/bulk",
            files={"file": ("sample_10_words.csv", f, "text/csv")},
        )
    assert r.status_code == 200, r.text
    data = r.json()
    assert "import_id" in data
    import_id = data["import_id"]

    # Poll progress
    deadline = time.time() + 20
    status = None
    progress = None
    while time.time() < deadline:
        pr = client.get(f"/api/v1/imports/{import_id}")
        assert pr.status_code == 200
        progress = pr.json()
        status = progress["status"]
        if status in ("completed", "failed"):
            break
        time.sleep(0.5)

    assert status == "completed", f"Import not completed: {progress}"
    # E2E focus: import pipeline completes without failures
    assert progress["failed"] == 0

    # Search (FTS with prefix)
    r = client.get("/api/v1/words/search", params={"q": "bon"})
    assert r.status_code == 200
    results = r.json()
    assert results["total"] >= 2

    # Suggestions
    r = client.get("/api/v1/words/suggest", params={"q": "bon"})
    assert r.status_code == 200
    sugg = r.json()
    assert isinstance(sugg, list)
    assert any(s.startswith("bon") for s in sugg)

    # Study queue
    r = client.get("/api/v1/study/next", params={"limit": 5})
    assert r.status_code == 200
    queue = r.json()
    assert isinstance(queue["cards"], list)
    assert len(queue["cards"]) > 0

    # Review one card
    card_id = queue["cards"][0]["card_id"]
    r = client.post("/api/v1/review", json={"card_id": card_id, "grade": 2})
    assert r.status_code == 200
    review_result = r.json()
    assert review_result["success"] is True

    # Stats & Forecast
    r = client.get("/api/v1/study/stats")
    assert r.status_code == 200
    r = client.get("/api/v1/study/progress", params={"days": 3})
    assert r.status_code == 200
    r = client.get("/api/v1/study/due-forecast", params={"days": 3})
    assert r.status_code == 200
