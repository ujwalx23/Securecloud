import time
from collections import defaultdict
from typing import Dict, List
from fastapi import HTTPException, status, Request

class LoginRateLimiter:
    """
    Brute-force protection engine tracking failed login attempts per client IP and email.
    Temporarily locks out attackers who exceed the attempt threshold.
    """
    def __init__(self, max_attempts: int = 5, window_seconds: int = 60, lockout_seconds: int = 60):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.lockout_seconds = lockout_seconds
        self._failures: Dict[str, List[float]] = defaultdict(list)
        self._lockouts: Dict[str, float] = {}

    def get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        if request.client:
            return request.client.host
        return "unknown"

    def _make_key(self, ip: str, email: str) -> str:
        return f"{ip}:{email.strip().lower()}"

    def check(self, request: Request, email: str = ""):
        ip = self.get_client_ip(request)
        key = self._make_key(ip, email)
        now = time.time()

        # Check if currently locked out
        if key in self._lockouts:
            remaining = int(self._lockouts[key] - now)
            if remaining > 0:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Too many failed login attempts. Security lockout active. Try again in {remaining} seconds."
                )
            else:
                del self._lockouts[key]

        # Filter out attempts older than window
        self._failures[key] = [t for t in self._failures[key] if now - t < self.window_seconds]

        # Check if threshold reached
        if len(self._failures[key]) >= self.max_attempts:
            self._lockouts[key] = now + self.lockout_seconds
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed login attempts. Account temporarily locked for {self.lockout_seconds} seconds to prevent brute-force."
            )

    def record_failure(self, request: Request, email: str = ""):
        ip = self.get_client_ip(request)
        key = self._make_key(ip, email)
        now = time.time()
        self._failures[key].append(now)

        if len(self._failures[key]) >= self.max_attempts:
            self._lockouts[key] = now + self.lockout_seconds

    def record_success(self, request: Request, email: str = ""):
        ip = self.get_client_ip(request)
        key = self._make_key(ip, email)
        self._failures.pop(key, None)
        self._lockouts.pop(key, None)

login_rate_limiter = LoginRateLimiter(max_attempts=5, window_seconds=60, lockout_seconds=60)
