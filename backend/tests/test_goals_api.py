import uuid
from datetime import date, datetime, timedelta, timezone

import httpx
import pytest
from fastapi.testclient import TestClient

from app import db as db_module
from app.auth import CurrentUser, get_current_user
from app.config import Settings
from app.db import Database
from app.goals.repo import GoalsRepo, get_goals_repo
from app.main import app
from app.schemas.money import today_in_india

USER = CurrentUser(id="11111111-1111-1111-1111-111111111111", email="r@example.com", token="tok")
TODAY = date(2026, 11, 26)


class FakeRepo:
    """In-memory stand-in for the database."""

    def __init__(self):
        self.rows: dict[str, dict] = {}
        self.calls: list[str] = []
        self.clock = datetime(2026, 11, 1, tzinfo=timezone.utc)

    def list(self):
        return list(self.rows.values())

    def create(self, row):
        self.calls.append("create")
        assert "user_id" not in row  # the database fills this from the login token
        self.clock += timedelta(minutes=1)
        new = {**row, "id": str(uuid.uuid4()), "created_at": self.clock.isoformat()}
        self.rows[new["id"]] = new
        return new

    def replace(self, goal_id, row):
        self.calls.append("replace")
        if goal_id not in self.rows:
            return None
        self.rows[goal_id].update(row)
        return self.rows[goal_id]

    def delete(self, goal_id):
        self.calls.append("delete")
        return self.rows.pop(goal_id, None) is not None


@pytest.fixture
def repo():
    fake = FakeRepo()
    app.dependency_overrides[get_current_user] = lambda: USER
    app.dependency_overrides[get_goals_repo] = lambda: fake
    app.dependency_overrides[today_in_india] = lambda: TODAY
    yield fake
    app.dependency_overrides.clear()


client = TestClient(app)


def goal(**over):
    return {"name": "  Laptop  ", "target_amount": 60000, "saved_amount": 15000, **over}


def test_create_goal_returns_it_with_calculated_progress(repo):
    r = client.post("/api/goals", json=goal(target_date="2027-03-31", monthly_contribution=5000))
    assert r.status_code == 201
    g = r.json()
    assert g["name"] == "Laptop"  # spaces trimmed
    assert (g["remaining"], g["progress_percent"], g["completed"]) == (45000, 25.0, False)
    assert (g["months_left"], g["suggested_monthly"]) == (4, 11250)
    assert (g["months_needed"], g["estimated_completion"], g["on_track"]) == (9, "2027-08", False)
    assert g["priority"] == "medium"


def test_minimal_goal_needs_only_a_name_and_target(repo):
    r = client.post("/api/goals", json={"name": "Emergency fund", "target_amount": 50000})
    assert r.status_code == 201
    g = r.json()
    assert (g["saved_amount"], g["remaining"], g["progress_percent"]) == (0, 50000, 0.0)
    assert (g["target_date"], g["suggested_monthly"], g["estimated_completion"], g["on_track"]) == (None, None, None, None)


def test_list_puts_important_unfinished_goals_first_and_reached_goals_last(repo):
    client.post("/api/goals", json=goal(name="Low one", priority="low"))
    client.post("/api/goals", json=goal(name="Done", priority="high", saved_amount=60000))
    client.post("/api/goals", json=goal(name="Top", priority="high"))
    client.post("/api/goals", json=goal(name="Middle"))
    names = [g["name"] for g in client.get("/api/goals").json()]
    assert names == ["Top", "Middle", "Low one", "Done"]


def test_change_goal_recalculates(repo):
    created = client.post("/api/goals", json=goal()).json()
    r = client.put(f"/api/goals/{created['id']}", json=goal(saved_amount=30000))
    assert r.status_code == 200
    assert (r.json()["remaining"], r.json()["progress_percent"]) == (30000, 50.0)


def test_reaching_the_target_marks_the_goal_complete(repo):
    created = client.post("/api/goals", json=goal(target_date="2026-01-01")).json()
    assert created["overdue"] is True
    done = client.put(f"/api/goals/{created['id']}", json=goal(saved_amount=60000, target_date="2026-01-01")).json()
    assert (done["completed"], done["overdue"], done["remaining"]) == (True, False, 0)


def test_zero_monthly_amount_is_treated_as_not_set(repo):
    g = client.post("/api/goals", json=goal(monthly_contribution=0)).json()
    assert (g["monthly_contribution"], g["estimated_completion"]) == (None, None)


def test_missing_goal_is_404(repo):
    assert client.put(f"/api/goals/{uuid.uuid4()}", json=goal()).status_code == 404
    assert client.delete(f"/api/goals/{uuid.uuid4()}").status_code == 404


def test_delete_goal(repo):
    created = client.post("/api/goals", json=goal()).json()
    assert client.delete(f"/api/goals/{created['id']}").status_code == 204
    assert client.get("/api/goals").json() == []


@pytest.mark.parametrize("change,field", [
    ({"name": "   "}, "name"),
    ({"name": "x" * 81}, "name"),
    ({"target_amount": 0}, "target_amount"),
    ({"target_amount": -100}, "target_amount"),
    ({"target_amount": 10_000_000_001}, "target_amount"),
    ({"target_amount": "60000"}, "target_amount"),
    ({"target_amount": 600.5}, "target_amount"),
    ({"saved_amount": -1}, "saved_amount"),
    ({"saved_amount": True}, "saved_amount"),
    ({"monthly_contribution": -5}, "monthly_contribution"),
    ({"monthly_contribution": 100_000_001}, "monthly_contribution"),
    ({"priority": "urgent"}, "priority"),
    ({"target_date": "1999-12-31"}, "target_date"),
    ({"target_date": "2101-01-01"}, "target_date"),
    ({"target_date": "not-a-date"}, "target_date"),
    ({"notes": "x" * 501}, "notes"),
    ({"user_id": "22222222-2222-2222-2222-222222222222"}, "user_id"),
    ({"completed": True}, "completed"),  # calculated values can't be sent in
])
def test_bad_goals_are_rejected_with_the_right_field(repo, change, field):
    r = client.post("/api/goals", json=goal(**change))
    assert r.status_code == 422
    assert field in r.json()["fields"]
    assert repo.calls == []


def test_bad_goal_id_is_rejected_before_the_database(repo):
    assert client.delete("/api/goals/not-a-uuid").status_code == 422
    assert repo.calls == []


def test_goals_need_login():
    app.dependency_overrides.clear()
    assert client.get("/api/goals").status_code == 401
    assert client.post("/api/goals", json=goal()).status_code == 401


def test_real_repo_builds_the_right_database_requests(monkeypatch):
    seen = []

    def fake_request(method, url, **kw):
        seen.append((method, url, kw.get("params"), kw.get("json")))
        return httpx.Response(200, json=[])

    monkeypatch.setattr(db_module.httpx, "request", fake_request)
    repo = GoalsRepo(Database(Settings(supabase_url="https://x.supabase.co", supabase_publishable_key="p"), USER))
    assert repo.list() == []
    method, url, params, _ = seen[0]
    assert (method, url) == ("GET", "https://x.supabase.co/rest/v1/goals")
    assert ("order", "created_at.asc") in params
    assert not any(k == "user_id" for k, _ in params)  # the database's own rules pick the user's rows

    assert repo.replace("abc", {"name": "x"}) is None  # nothing changed -> API answers 404
    assert ("id", "eq.abc") in seen[1][2]
    assert repo.delete("abc") is False
