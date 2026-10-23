"""Authenticated reverse proxy for the Bale/Eitaa chat services and webhooks."""
import logging
import os

import requests
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
from starlette.concurrency import run_in_threadpool

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Chat gateway"])

BALE_CHAT_SERVICE_URL = os.getenv("BALE_CHAT_SERVICE_URL", "http://95.38.187.123:3000").rstrip("/")
EITAA_CHAT_SERVICE_URL = os.getenv("EITAA_CHAT_SERVICE_URL", "http://95.38.187.123:3001").rstrip("/")
BALE_SEND_WEBHOOK_URL = os.getenv(
    "BALE_SEND_WEBHOOK_URL",
    "https://n8n.sepehrsalamati.ir/webhook/seandms",
)
BALE_CREATE_CHAT_WEBHOOK_URL = os.getenv(
    "BALE_CREATE_CHAT_WEBHOOK_URL",
    "https://n8n.sepehrsalamati.ir/webhook/plasuser",
)
EITAA_SEND_WEBHOOK_URL = os.getenv(
    "EITAA_SEND_WEBHOOK_URL",
    "https://n8n.sepehrsalamati.ir/webhook/",
)
EITAA_CREATE_CHAT_WEBHOOK_URL = os.getenv(
    "EITAA_CREATE_CHAT_WEBHOOK_URL",
    "https://n8n.sepehrsalamati.ir/webhook/",
)

_ALLOWED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]


def _forward_headers(request: Request):
    headers = {}
    for name in ("accept", "content-type", "user-agent", "x-requested-with"):
        value = request.headers.get(name)
        if value:
            headers[name] = value

    # Preserve service-specific cookies if present, but never disclose the
    # panel's authentication cookie to another service.
    cookie_header = request.headers.get("cookie", "")
    safe_cookies = []
    for part in cookie_header.split(";"):
        part = part.strip()
        if not part:
            continue
        cookie_name = part.split("=", 1)[0].strip().lower()
        if cookie_name != "session_token":
            safe_cookies.append(part)
    if safe_cookies:
        headers["cookie"] = "; ".join(safe_cookies)
    return headers


async def _proxy(request: Request, upstream_url: str, service_name: str):
    query = request.url.query
    target = upstream_url + (("?" + query) if query else "")
    body = await request.body()
    try:
        # requests is blocking; run it in a worker thread so one slow chat
        # service does not block FastAPI's event loop for every other request.
        upstream = await run_in_threadpool(
            requests.request,
            method=request.method,
            url=target,
            headers=_forward_headers(request),
            data=body if body else None,
            timeout=(5, 60),
            allow_redirects=False,
        )
    except requests.RequestException as exc:
        # Do not log query strings, request bodies, cookies, or webhook secrets.
        logger.warning(
            "Chat proxy upstream unavailable: service=%s method=%s path=%s error=%s",
            service_name,
            request.method,
            request.url.path,
            type(exc).__name__,
        )
        raise HTTPException(
            status_code=502,
            detail=f"سرویس {service_name} در دسترس نیست؛ اتصال و نشانی سرویس را بررسی کنید",
        ) from exc

    headers = {}
    for name in ("content-type", "content-disposition", "cache-control", "location", "set-cookie"):
        value = upstream.headers.get(name)
        if value:
            headers[name] = value
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=headers,
    )


@router.api_route("/api/chat/bale/webhook/send", methods=_ALLOWED_METHODS)
async def bale_send_webhook(request: Request):
    return await _proxy(request, BALE_SEND_WEBHOOK_URL, "وب‌هوک ارسال بله")


@router.api_route("/api/chat/bale/webhook/create", methods=_ALLOWED_METHODS)
async def bale_create_chat_webhook(request: Request):
    return await _proxy(request, BALE_CREATE_CHAT_WEBHOOK_URL, "وب‌هوک ایجاد گفتگوی بله")


@router.api_route("/api/chat/eitaa/webhook/send", methods=_ALLOWED_METHODS)
async def eitaa_send_webhook(request: Request):
    return await _proxy(request, EITAA_SEND_WEBHOOK_URL, "وب‌هوک ارسال ایتا")


@router.api_route("/api/chat/eitaa/webhook/create", methods=_ALLOWED_METHODS)
async def eitaa_create_chat_webhook(request: Request):
    return await _proxy(request, EITAA_CREATE_CHAT_WEBHOOK_URL, "وب‌هوک ایجاد گفتگوی ایتا")


@router.api_route("/api/chat/bale/{path:path}", methods=_ALLOWED_METHODS)
async def bale_chat_proxy(path: str, request: Request):
    target = BALE_CHAT_SERVICE_URL + ("/" + path.lstrip("/") if path else "")
    return await _proxy(request, target, "چت بله")


@router.api_route("/api/chat/eitaa/{path:path}", methods=_ALLOWED_METHODS)
async def eitaa_chat_proxy(path: str, request: Request):
    target = EITAA_CHAT_SERVICE_URL + ("/" + path.lstrip("/") if path else "")
    return await _proxy(request, target, "چت ایتا")
