import pytest
from fastapi import HTTPException
from backend.rate_limiter import LoginRateLimiter

class DummyRequest:
    def __init__(self, ip: str = "127.0.0.1"):
        self.headers = {"x-forwarded-for": ip}
        self.client = None

def test_rate_limiter_blocks_after_max_attempts():
    limiter = LoginRateLimiter(max_attempts=3, window_seconds=10, lockout_seconds=10)
    req = DummyRequest("1.2.3.4")
    email = "target@example.com"

    # 1. First 2 failures - should allow checking
    limiter.check(req, email)
    limiter.record_failure(req, email)

    limiter.check(req, email)
    limiter.record_failure(req, email)

    # 2. 3rd failure hits threshold
    limiter.check(req, email)
    limiter.record_failure(req, email)

    # 3. Next check MUST raise HTTP 429
    with pytest.raises(HTTPException) as exc_info:
        limiter.check(req, email)
    assert exc_info.value.status_code == 429
    assert "Too many failed login attempts" in exc_info.value.detail

    # 4. Successful login clears counter
    limiter.record_success(req, email)
    # Now check should pass
    limiter.check(req, email)
