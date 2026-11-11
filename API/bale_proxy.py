import asyncio
import os
import requests
from fastapi import APIRouter, HTTPException, Request, Response

router = APIRouter(prefix="/api/bale", tags=["Bale Web Sender Proxy"])
_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]

def _send(method, url, body, headers):
    return requests.request(method, url, data=body or None, headers=headers,
                            timeout=(10, 1800), allow_redirects=False)

async def _proxy(request: Request, path: str = ""):
    base = os.getenv("BALE_WEB_SENDER_URL", "http://bale_sender:2587").rstrip("/")
    key = os.getenv("BALE_WEB_SENDER_API_KEY", "").strip()
    if not key:
        raise HTTPException(503, "سرویس ارسال وبی بله پیکربندی نشده است.")
    url = base + "/api/bale" + (("/" + path) if path else "")
    if request.url.query:
        url += "?" + request.url.query
    headers = {"X-Bale-Sender-Key": key, "Accept": request.headers.get("accept", "application/json")}
    if request.headers.get("content-type"):
        headers["Content-Type"] = request.headers["content-type"]
    try:
        upstream = await asyncio.to_thread(_send, request.method, url, await request.body(), headers)
    except requests.RequestException as exc:
        raise HTTPException(502, f"ارتباط با سرویس مستقل ارسال بله برقرار نشد: {exc}") from exc
    response_headers = {k: upstream.headers[k] for k in ("content-type", "content-disposition", "cache-control") if k in upstream.headers}
    return Response(content=upstream.content, status_code=upstream.status_code, headers=response_headers)

@router.api_route("", methods=_METHODS)
async def proxy_root(request: Request):
    return await _proxy(request)

@router.api_route("/{path:path}", methods=_METHODS)
async def proxy_path(path: str, request: Request):
    return await _proxy(request, path)
