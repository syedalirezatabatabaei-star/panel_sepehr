"""Small HTTP client for the isolated BaleLink gateway.

This module deliberately does not replace the legacy Playwright sender yet.
It provides the stable, authenticated gateway operations needed by the next
bulk-sender integration step while keeping the current panel API unchanged.
"""
import os
from typing import Any

import requests


class BaleSuperError(RuntimeError):
    """Raised when the BaleLink gateway rejects or cannot process a request."""


class BaleSuperClient:
    def __init__(self) -> None:
        self.base_url = os.getenv("BALELINK_BASE_URL", "http://bale_super:8787").rstrip("/")
        self.api_key = os.getenv("BALELINK_API_KEY", "").strip()
        self.session_name = os.getenv("BALELINK_SESSION", "sepehr").strip() or "sepehr"
        self.timeout = float(os.getenv("BALELINK_TIMEOUT", "30"))

    @property
    def configured(self) -> bool:
        return bool(self.base_url and self.api_key)

    def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        if not self.configured:
            raise BaleSuperError("تنظیمات اتصال BaleLink کامل نیست.")
        headers = dict(kwargs.pop("headers", {}) or {})
        headers["X-Api-Key"] = self.api_key
        response = requests.request(
            method,
            f"{self.base_url}{path}",
            headers=headers,
            timeout=self.timeout,
            **kwargs,
        )
        try:
            payload = response.json()
        except ValueError:
            payload = {"message": response.text[:500]}
        if not response.ok:
            error = payload.get("error", {}) if isinstance(payload, dict) else {}
            message = error.get("message") or payload.get("detail") or payload.get("message") or response.reason
            code = error.get("code")
            raise BaleSuperError(f"{code + ': ' if code else ''}{message}")
        return payload

    def health(self) -> dict:
        response = requests.get(f"{self.base_url}/health", timeout=min(self.timeout, 5))
        response.raise_for_status()
        return response.json()

    def get_sessions(self) -> dict:
        return self._request("GET", "/sessions")

    def create_session(self) -> dict:
        return self._request("POST", "/sessions", json={"name": self.session_name})

    def request_login_code(self, phone: str) -> dict:
        return self._request(
            "POST",
            f"/sessions/{self.session_name}/login/code",
            json={"phone": phone},
        )

    def verify_login_code(self, code: str, password: str | None = None) -> dict:
        body = {"code": code}
        if password:
            body["password"] = password
        return self._request(
            "POST",
            f"/sessions/{self.session_name}/login/verify",
            json=body,
        )

    def send_text(self, phone: str, message: str) -> dict:
        return self._request(
            "POST",
            f"/sessions/{self.session_name}/messages",
            json={"to": phone, "text": message},
        )


bale_super_client = BaleSuperClient()
