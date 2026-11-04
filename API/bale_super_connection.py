"""Connectivity diagnostics for the dedicated Bale Super gateway.

This module checks the private Docker-network endpoint separately from the
bulk messaging routes. It never returns the configured API key.
"""
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from API.bale_gateway import gateway_account, gateway_enabled


def check_bale_super_connection(timeout=8):
    base_url = os.getenv("BALELINK_GATEWAY_URL", "http://bale_super:8787").strip().rstrip("/")
    if not gateway_enabled():
        return {
            "connected": False,
            "configured": False,
            "gateway_reachable": False,
            "authenticated": False,
            "message": "تنظیمات BALELINK_GATEWAY_URL یا BALELINK_API_KEY کامل نیست.",
        }

    request = Request(base_url + "/health", headers={"Accept": "application/json"})
    try:
        with urlopen(request, timeout=timeout) as response:
            health_status = response.status
            health_body = response.read(2048).decode("utf-8", errors="replace")
    except HTTPError as exc:
        return {
            "connected": False,
            "configured": True,
            "gateway_reachable": True,
            "authenticated": False,
            "message": f"Gateway پاسخ HTTP {exc.code} داد.",
        }
    except (URLError, TimeoutError, OSError) as exc:
        return {
            "connected": False,
            "configured": True,
            "gateway_reachable": False,
            "authenticated": False,
            "message": f"ارتباط شبکه‌ای با Gateway برقرار نشد: {exc}",
        }

    try:
        account = gateway_account()
    except Exception as exc:
        return {
            "connected": False,
            "configured": True,
            "gateway_reachable": True,
            "authenticated": False,
            "health_status": health_status,
            "health": health_body,
            "message": f"Gateway در دسترس است، اما احراز هویت API موفق نبود: {exc}",
        }

    return {
        "connected": True,
        "configured": True,
        "gateway_reachable": True,
        "authenticated": True,
        "health_status": health_status,
        "account_exists": bool(account.get("exists")),
        "account_phone": account.get("phone"),
        "message": "ارتباط پنل با Bale Super Gateway برقرار است.",
    }
