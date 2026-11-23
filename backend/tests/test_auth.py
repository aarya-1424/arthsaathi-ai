import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient

from app import auth
from app.config import Settings, get_settings
from app.main import app

URL = "https://example-project.supabase.co"
ISSUER = f"{URL}/auth/v1"

_private = ec.generate_private_key(ec.SECP256R1())
_other_private = ec.generate_private_key(ec.SECP256R1())


def make_token(key=_private, **overrides):
    claims = {
        "sub": "11111111-1111-1111-1111-111111111111",
        "email": "rahul@example.com",
        "aud": "authenticated",
        "iss": ISSUER,
        "exp": int(time.time()) + 600,
    }
    claims.update(overrides)
    claims = {k: v for k, v in claims.items() if v is not None}
    return jwt.encode(claims, key, algorithm="ES256", headers={"kid": "test"})


@pytest.fixture(autouse=True)
def configured(monkeypatch):
    app.dependency_overrides[get_settings] = lambda: Settings(supabase_url=URL)
    monkeypatch.setattr(auth, "get_signing_key", lambda token, settings: _private.public_key())
    yield
    app.dependency_overrides.clear()


client = TestClient(app)


def call(token=None):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    return client.get("/api/me", headers=headers)


def test_valid_token_returns_user():
    r = call(make_token())
    assert r.status_code == 200
    assert r.json() == {"id": "11111111-1111-1111-1111-111111111111", "email": "rahul@example.com"}


def test_no_token_is_rejected():
    assert call().status_code == 401


def test_garbage_token_is_rejected():
    assert call("not-a-token").status_code == 401


def test_expired_token_is_rejected():
    assert call(make_token(exp=int(time.time()) - 10)).status_code == 401


def test_wrong_audience_is_rejected():
    assert call(make_token(aud="something-else")).status_code == 401


def test_wrong_issuer_is_rejected():
    assert call(make_token(iss="https://evil.example/auth/v1")).status_code == 401


def test_token_signed_with_other_key_is_rejected():
    assert call(make_token(key=_other_private)).status_code == 401


def test_missing_subject_is_rejected():
    assert call(make_token(sub=None)).status_code == 401


def test_unsigned_token_is_rejected():
    forged = jwt.encode({"sub": "x", "aud": "authenticated", "iss": ISSUER, "exp": int(time.time()) + 600}, None, algorithm="none")
    assert call(forged).status_code == 401


def test_401_message_leaks_nothing():
    assert call("bad").json() == {"detail": "Please sign in to continue."}


def test_not_configured_rejects_everyone(monkeypatch):
    app.dependency_overrides[get_settings] = lambda: Settings(supabase_url="")
    assert call(make_token()).status_code == 401
