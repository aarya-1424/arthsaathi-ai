import httpx
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app import db as db_module
from app.auth import CurrentUser, get_current_user
from app.config import Settings
from app.db import Database, get_db
from app.main import app

USER = CurrentUser(id="11111111-1111-1111-1111-111111111111", email="rahul@example.com", token="user-token")

VALID = {
    "display_name": "  Rahul  ",
    "occupation": "salaried",
    "age_range": "25_34",
    "state": "Maharashtra",
    "monthly_income": 28000,
    "income_source": "salary",
    "monthly_expenses": 20000,
    "monthly_savings": 3000,
    "monthly_emi": 0,
    "dependents": 2,
    "emergency_fund": None,
    "goals": ["emergency_fund", "save_money", "save_money"],
    "other_goal": "ignored because 'other' not ticked",
    "knowledge_level": "beginner",
}


class FakeDb:
    """Stands in for the real database in tests."""

    def __init__(self):
        self.profiles = {USER.id: {"display_name": None}}
        self.fin: dict[str, dict] = {}
        self.calls: list[tuple] = []

    def select_one(self, table, columns, **filters):
        key = filters.get("id") or filters.get("user_id")
        return (self.profiles if table == "profiles" else self.fin).get(key)

    def upsert(self, table, row, on_conflict, columns):
        self.calls.append(("upsert", table, dict(row)))
        stored = {k: v for k, v in row.items() if k != "user_id"}
        self.fin[row["user_id"]] = stored
        return stored

    def update(self, table, values, **filters):
        self.calls.append(("update", table, values, filters))
        self.profiles[filters["id"]].update(values)


@pytest.fixture
def fake():
    fake = FakeDb()
    app.dependency_overrides[get_current_user] = lambda: USER
    app.dependency_overrides[get_db] = lambda: fake
    yield fake
    app.dependency_overrides.clear()


client = TestClient(app)


def test_new_user_has_no_profile_yet(fake):
    r = client.get("/api/profile")
    assert r.status_code == 200
    assert r.json() == {"display_name": None, "financial": None, "onboarding_complete": False}


def test_save_profile_then_load_it(fake):
    r = client.put("/api/profile", json=VALID)
    assert r.status_code == 200
    body = r.json()
    assert body["onboarding_complete"] is True
    assert body["display_name"] == "Rahul"  # spaces trimmed
    assert body["financial"]["goals"] == ["emergency_fund", "save_money"]  # repeat removed
    assert body["financial"]["other_goal"] is None  # dropped because "other" not ticked

    again = client.get("/api/profile").json()
    assert again["onboarding_complete"] is True
    assert again["display_name"] == "Rahul"
    assert again["financial"]["monthly_income"] == 28000


def test_owner_comes_from_login_not_from_browser(fake):
    client.put("/api/profile", json=VALID)
    upsert = next(c for c in fake.calls if c[0] == "upsert")
    assert upsert[2]["user_id"] == USER.id


def test_browser_cannot_choose_user_id(fake):
    r = client.put("/api/profile", json={**VALID, "user_id": "22222222-2222-2222-2222-222222222222"})
    assert r.status_code == 422
    assert fake.calls == []


def test_other_goal_kept_when_other_ticked(fake):
    r = client.put("/api/profile", json={**VALID, "goals": ["other"], "other_goal": "  Wedding  "})
    assert r.json()["financial"]["other_goal"] == "Wedding"


def test_optional_fields_can_be_left_out(fake):
    minimal = {"occupation": "student", "monthly_income": 3000, "monthly_expenses": 2500, "knowledge_level": "beginner"}
    r = client.put("/api/profile", json=minimal)
    assert r.status_code == 200
    assert r.json()["financial"]["state"] is None


@pytest.mark.parametrize(
    "change",
    [
        {"monthly_income": -1},
        {"monthly_income": 100_000_001},
        {"monthly_income": "28000"},  # text, not a number
        {"monthly_income": 28000.5},  # paise not allowed
        {"monthly_income": True},
        {"monthly_expenses": None},
        {"occupation": "astronaut"},
        {"knowledge_level": "expert"},
        {"age_range": "99"},
        {"state": "Atlantis"},
        {"goals": ["buy_bitcoin"]},
        {"dependents": 21},
        {"display_name": "x" * 81},
        {"other_goal": "x" * 101, "goals": ["other"]},
    ],
)
def test_bad_values_are_rejected(fake, change):
    r = client.put("/api/profile", json={**VALID, **change})
    assert r.status_code == 422
    assert fake.calls == []  # nothing reached the database


def test_invalid_reply_does_not_echo_user_input(fake):
    r = client.put("/api/profile", json={**VALID, "monthly_income": -999123})
    assert "999123" not in r.text
    assert r.json()["fields"] == ["monthly_income"]


def test_profile_needs_login():
    app.dependency_overrides.clear()
    assert client.get("/api/profile").status_code == 401
    assert client.put("/api/profile", json=VALID).status_code == 401


# --- The real Database class, with the network faked out ---

def make_db():
    return Database(Settings(supabase_url="https://x.supabase.co", supabase_publishable_key="pub"), USER)


def test_database_sends_user_token_not_a_master_key(monkeypatch):
    seen = {}

    def fake_request(method, url, **kw):
        seen.update(kw["headers"], url=url)
        return httpx.Response(200, json=[{"display_name": "A"}])

    monkeypatch.setattr(db_module.httpx, "request", fake_request)
    assert make_db().select_one("profiles", "display_name", id=USER.id) == {"display_name": "A"}
    assert seen["Authorization"] == "Bearer user-token"
    assert seen["apikey"] == "pub"
    assert seen["url"] == "https://x.supabase.co/rest/v1/profiles"


@pytest.mark.parametrize("status_code,expected", [(401, 401), (403, 401), (400, 422), (409, 422), (500, 503), (502, 503)])
def test_database_errors_become_friendly(monkeypatch, status_code, expected):
    monkeypatch.setattr(db_module.httpx, "request", lambda *a, **k: httpx.Response(status_code, json={"message": "secret detail"}))
    with pytest.raises(HTTPException) as info:
        make_db().select_one("profiles", "display_name", id=USER.id)
    assert info.value.status_code == expected
    assert "secret" not in info.value.detail


def test_database_timeout_becomes_friendly(monkeypatch):
    def boom(*a, **k):
        raise httpx.ConnectTimeout("slow")

    monkeypatch.setattr(db_module.httpx, "request", boom)
    with pytest.raises(HTTPException) as info:
        make_db().select_one("profiles", "display_name", id=USER.id)
    assert info.value.status_code == 503
