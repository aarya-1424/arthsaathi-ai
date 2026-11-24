import uuid
from datetime import date, datetime, timedelta, timezone

import httpx
import pytest
from fastapi.testclient import TestClient

from app import db as db_module
from app.auth import CurrentUser, get_current_user
from app.config import Settings
from app.db import Database
from app.main import app
from app.money.repo import MoneyRepo, get_money_repo
from app.schemas.money import today_in_india

USER = CurrentUser(id="11111111-1111-1111-1111-111111111111", email="r@example.com", token="tok")


class FakeRepo:
    """In-memory stand-in for the database."""

    def __init__(self):
        self.entries: dict[str, dict] = {}
        self.budget_rows: dict[str, list[dict]] = {}
        self.calls: list[str] = []

    def list_entries(self, start, end, kind=None, *, columns=None, limit=1000):
        rows = [e for e in self.entries.values()
                if start.isoformat() <= e["occurred_on"] < end.isoformat() and (kind is None or e["kind"] == kind)]
        rows.sort(key=lambda e: (e["occurred_on"], e["created_at"]), reverse=True)
        return rows[:limit]

    def create(self, row):
        self.calls.append("create")
        assert "user_id" not in row  # the database fills this from the login token
        new = {**row, "id": str(uuid.uuid4()), "created_at": datetime.now(timezone.utc).isoformat()}
        self.entries[new["id"]] = new
        return new

    def replace(self, entry_id, row):
        self.calls.append("replace")
        if entry_id not in self.entries:
            return None
        self.entries[entry_id].update(row)
        return self.entries[entry_id]

    def delete(self, entry_id):
        self.calls.append("delete")
        return self.entries.pop(entry_id, None) is not None

    def budgets(self, month_start):
        return list(self.budget_rows.get(month_start.isoformat(), []))

    def set_budgets(self, month_start, limits):
        self.calls.append("set_budgets")
        self.budget_rows[month_start.isoformat()] = list(limits)
        return list(limits)


@pytest.fixture
def repo():
    fake = FakeRepo()
    app.dependency_overrides[get_current_user] = lambda: USER
    app.dependency_overrides[get_money_repo] = lambda: fake
    yield fake
    app.dependency_overrides.clear()


client = TestClient(app)


def entry(**over):
    base = {"kind": "expense", "amount": 450, "occurred_on": "2026-11-10", "category": "food", "description": "  Lunch  "}
    return {**base, **over}


# ---------- adding and listing ----------

def test_add_and_list_entries(repo):
    r = client.post("/api/transactions", json=entry())
    assert r.status_code == 201
    body = r.json()
    assert body["amount"] == 450 and body["description"] == "Lunch"  # spaces trimmed
    client.post("/api/transactions", json=entry(kind="income", amount=28000, category="salary", occurred_on="2026-11-01"))
    client.post("/api/transactions", json=entry(occurred_on="2026-10-31"))  # other month

    listing = client.get("/api/transactions", params={"month": "2026-11"}).json()
    assert listing["month"] == "2026-11"
    assert [e["occurred_on"] for e in listing["entries"]] == ["2026-11-10", "2026-11-01"]  # newest first
    assert listing["truncated"] is False

    only_income = client.get("/api/transactions", params={"month": "2026-11", "kind": "income"}).json()
    assert [e["category"] for e in only_income["entries"]] == ["salary"]


def test_empty_description_becomes_null(repo):
    assert client.post("/api/transactions", json=entry(description="   ")).json()["description"] is None


def test_today_is_allowed(repo):
    assert client.post("/api/transactions", json=entry(occurred_on=today_in_india().isoformat())).status_code == 201


@pytest.mark.parametrize("change,field", [
    ({"amount": 0}, "amount"),
    ({"amount": -10}, "amount"),
    ({"amount": 100_000_001}, "amount"),
    ({"amount": "450"}, "amount"),
    ({"amount": 45.5}, "amount"),
    ({"kind": "gift"}, "kind"),
    ({"category": "salary"}, "category"),                      # income category on an expense
    ({"kind": "income", "category": "food"}, "category"),     # expense category on income
    ({"category": "bitcoin"}, "category"),
    ({"occurred_on": "1999-12-31"}, "occurred_on"),
    ({"occurred_on": (today_in_india() + timedelta(days=5)).isoformat()}, "occurred_on"),
    ({"occurred_on": "2026-13-01"}, "occurred_on"),
    ({"description": "x" * 121}, "description"),
    ({"notes": "x" * 501}, "notes"),
    ({"user_id": "22222222-2222-2222-2222-222222222222"}, "user_id"),
])
def test_bad_entries_are_rejected_with_the_right_field(repo, change, field):
    r = client.post("/api/transactions", json=entry(**change))
    assert r.status_code == 422
    assert field in r.json()["fields"]
    assert repo.calls == []


@pytest.mark.parametrize("month", ["2026-13", "2026-1", "26-11", "1999-11", "2026-11-01", "abc", ""])
def test_bad_month_is_rejected(repo, month):
    assert client.get("/api/transactions", params={"month": month}).status_code == 422


def test_month_is_required(repo):
    assert client.get("/api/transactions").status_code == 422


# ---------- changing and deleting ----------

def test_change_entry(repo):
    created = client.post("/api/transactions", json=entry()).json()
    r = client.put(f"/api/transactions/{created['id']}", json=entry(amount=600, category="groceries"))
    assert r.status_code == 200
    assert (r.json()["amount"], r.json()["category"]) == (600, "groceries")


def test_change_missing_entry_is_404(repo):
    r = client.put(f"/api/transactions/{uuid.uuid4()}", json=entry())
    assert r.status_code == 404


def test_delete_entry(repo):
    created = client.post("/api/transactions", json=entry()).json()
    assert client.delete(f"/api/transactions/{created['id']}").status_code == 204
    assert client.delete(f"/api/transactions/{created['id']}").status_code == 404


def test_bad_entry_id_is_rejected_before_the_database(repo):
    assert client.delete("/api/transactions/not-a-uuid").status_code == 422
    assert client.put("/api/transactions/1;drop table", json=entry()).status_code in (404, 422)
    assert "delete" not in repo.calls and "replace" not in repo.calls


# ---------- budgets ----------

def test_set_and_get_budget(repo):
    r = client.put("/api/budgets", params={"month": "2026-11"},
                   json={"limits": [{"category": "rent", "amount": 8000}, {"category": "food", "amount": 5000}]})
    assert r.status_code == 200
    assert [b["category"] for b in r.json()["limits"]] == ["food", "rent"]
    got = client.get("/api/budgets", params={"month": "2026-11"}).json()
    assert got == {"month": "2026-11", "limits": [{"category": "rent", "amount": 8000}, {"category": "food", "amount": 5000}]}
    assert client.get("/api/budgets", params={"month": "2026-12"}).json()["limits"] == []


def test_empty_budget_clears_the_month(repo):
    assert client.put("/api/budgets", params={"month": "2026-11"}, json={"limits": []}).status_code == 200


@pytest.mark.parametrize("limits", [
    [{"category": "food", "amount": 5000}, {"category": "food", "amount": 6000}],  # duplicate
    [{"category": "salary", "amount": 5000}],   # not a spending category
    [{"category": "food", "amount": 0}],
    [{"category": "food", "amount": -1}],
])
def test_bad_budgets_are_rejected(repo, limits):
    r = client.put("/api/budgets", params={"month": "2026-11"}, json={"limits": limits})
    assert r.status_code == 422
    assert "set_budgets" not in repo.calls


# ---------- summary ----------

def test_summary_uses_this_month_budgets_and_last_month(repo):
    for e in [
        entry(kind="income", amount=28000, category="salary", occurred_on="2026-11-01"),
        entry(amount=8000, category="rent", occurred_on="2026-11-02"),
        entry(amount=4500, category="food", occurred_on="2026-11-15"),
        entry(amount=10000, category="rent", occurred_on="2026-10-02"),  # last month
    ]:
        client.post("/api/transactions", json=e)
    client.put("/api/budgets", params={"month": "2026-11"}, json={"limits": [{"category": "food", "amount": 5000}]})

    s = client.get("/api/money/summary", params={"month": "2026-11"}).json()
    assert (s["total_income"], s["total_expenses"], s["remaining"]) == (28000, 12500, 15500)
    assert s["savings_rate_percent"] == 55.4
    assert s["categories"][0] == {"category": "rent", "spent": 8000, "share_percent": 64.0}
    assert s["budgets"] == [{"category": "food", "limit": 5000, "spent": 4500, "remaining": 500, "used_percent": 90.0, "status": "near"}]
    assert s["comparison"] == {"previous_income": 0, "previous_expenses": 10000, "expense_change": 2500}


def test_summary_for_an_empty_month(repo):
    s = client.get("/api/money/summary", params={"month": "2026-11"}).json()
    assert (s["total_income"], s["total_expenses"], s["entry_count"], s["comparison"]) == (0, 0, 0, None)


def test_money_needs_login():
    app.dependency_overrides.clear()
    assert client.get("/api/transactions", params={"month": "2026-11"}).status_code == 401
    assert client.post("/api/transactions", json=entry()).status_code == 401
    assert client.get("/api/money/summary", params={"month": "2026-11"}).status_code == 401


# ---------- the real repo builds the right database requests ----------

def test_repo_sends_correct_month_filter_and_order(monkeypatch):
    seen = {}

    def fake_request(method, url, **kw):
        seen.update(method=method, url=url, params=kw["params"], prefer=kw["headers"].get("Prefer"))
        return httpx.Response(200, json=[])

    monkeypatch.setattr(db_module.httpx, "request", fake_request)
    repo = MoneyRepo(Database(Settings(supabase_url="https://x.supabase.co", supabase_publishable_key="p"), USER))
    repo.list_entries(date(2026, 11, 1), date(2026, 12, 1), "expense")
    assert seen["url"].endswith("/rest/v1/transactions")
    assert ("and", "(occurred_on.gte.2026-11-01,occurred_on.lt.2026-12-01)") in seen["params"]
    assert ("kind", "eq.expense") in seen["params"]
    assert ("order", "occurred_on.desc,created_at.desc") in seen["params"]

    repo.set_budgets(date(2026, 11, 1), [{"category": "food", "amount": 5000}])
    assert seen["url"].endswith("/rest/v1/rpc/set_month_budget")

    monkeypatch.setattr(db_module.httpx, "request", lambda *a, **k: httpx.Response(200, json=[]))
    assert repo.delete("abc") is False  # nothing deleted -> False -> API answers 404


# ---------- trend ----------

def test_trend_returns_each_month_oldest_first_with_zeros(repo):
    client.post("/api/transactions", json=entry(kind="income", amount=28000, category="salary", occurred_on="2026-11-01"))
    client.post("/api/transactions", json=entry(amount=8000, category="rent", occurred_on="2026-11-02"))
    client.post("/api/transactions", json=entry(amount=1200, occurred_on="2026-09-15"))
    client.post("/api/transactions", json=entry(amount=700, occurred_on="2026-05-31"))  # too old for 6 months

    r = client.get("/api/money/trend", params={"end": "2026-11", "months": 6})
    assert r.status_code == 200
    data = r.json()
    assert [m["month"] for m in data] == ["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"]
    assert data[-1] == {"month": "2026-11", "income": 28000, "expenses": 8000, "remaining": 20000}
    assert data[3]["expenses"] == 1200
    assert sum(m["expenses"] for m in data) == 9200  # May is not included


def test_trend_defaults_to_six_months(repo):
    assert len(client.get("/api/money/trend", params={"end": "2026-01"}).json()) == 6


@pytest.mark.parametrize("params", [{"end": "2026-11", "months": 0}, {"end": "2026-11", "months": 13}, {"end": "2026-13"}, {}])
def test_trend_rejects_bad_requests(repo, params):
    assert client.get("/api/money/trend", params=params).status_code == 422
