"""Private BaleLink gateway client used by the Sepehr panel."""
import base64
import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def gateway_enabled():
    return bool(os.getenv("BALELINK_GATEWAY_URL", "").strip()
                and os.getenv("BALELINK_API_KEY", "").strip())


def _base_url():
    return os.getenv("BALELINK_GATEWAY_URL", "http://bale_super:8787").rstrip("/")


def _session_name():
    return os.getenv("BALELINK_SESSION", "sepehr").strip() or "sepehr"


def gateway_request(method, path, payload=None, timeout=45):
    headers = {"X-Api-Key": os.environ["BALELINK_API_KEY"], "Accept": "application/json"}
    body = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = Request(_base_url() + path, data=body, headers=headers, method=method.upper())
    try:
        with urlopen(request, timeout=timeout) as response:
            raw = response.read()
    except HTTPError as exc:
        raw = exc.read()
        try:
            detail = json.loads(raw.decode("utf-8"))
        except Exception:
            detail = raw.decode("utf-8", errors="replace")
        if isinstance(detail, dict):
            detail = detail.get("detail") or detail.get("error") or detail
        raise RuntimeError(f"BaleLink HTTP {exc.code}: {detail}") from exc
    except (URLError, TimeoutError) as exc:
        raise RuntimeError(f"ارتباط با سرویس BaleLink برقرار نشد: {exc}") from exc
    if not raw:
        return {}
    try:
        return json.loads(raw.decode("utf-8"))
    except Exception:
        return {"raw": raw.decode("utf-8", errors="replace")}


def ensure_gateway_session():
    name = _session_name()
    try:
        gateway_request("POST", "/sessions", {"name": name, "ignore_groups": True})
    except RuntimeError as exc:
        message = str(exc).lower()
        if "409" not in message and "already" not in message and "exists" not in message:
            raise
    return name


def gateway_account():
    name = _session_name()
    try:
        account = gateway_request("GET", f"/sessions/{name}/me")
    except RuntimeError as exc:
        message = str(exc).lower()
        if "404" in message or "not found" in message or "401" in message:
            return {"exists": False}
        raise
    phone = account.get("phone") if isinstance(account, dict) else None
    if not phone and isinstance(account, dict) and isinstance(account.get("me"), dict):
        phone = account["me"].get("phone")
    return {"exists": bool(account), "phone": phone}


def gateway_start_login(phone):
    name = ensure_gateway_session()
    return gateway_request("POST", f"/sessions/{name}/login/code", {"phone": phone})


def gateway_verify_login(code):
    return gateway_request("POST", f"/sessions/{_session_name()}/login/verify", {"code": code})


def gateway_reset():
    try:
        gateway_request("DELETE", f"/sessions/{_session_name()}")
    except RuntimeError as exc:
        message = str(exc).lower()
        if "404" not in message and "not found" not in message:
            raise
    return {"success": True}


def gateway_send(phone, message, message_type="text", media_path=None):
    name = _session_name()
    if message_type == "text":
        return gateway_request("POST", f"/sessions/{name}/messages",
                               {"to": phone, "text": message}, timeout=60)
    if not media_path or not os.path.isfile(media_path):
        raise RuntimeError("فایل رسانه برای ارسال پیدا نشد.")
    with open(media_path, "rb") as media_file:
        encoded = base64.b64encode(media_file.read()).decode("ascii")
    endpoint = "images" if message_type == "image" else "videos"
    return gateway_request("POST", f"/sessions/{name}/{endpoint}", {
        "to": phone, "data": encoded, "caption": message,
        "file_name": os.path.basename(media_path),
    }, timeout=120)
