"""Static frontend server with a same-origin proxy to the internal API."""
import logging
from pathlib import Path

import requests
from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse, JSONResponse, Response
from starlette.concurrency import run_in_threadpool
from starlette.staticfiles import StaticFiles

from API.auth import get_user_from_session

logger = logging.getLogger(__name__)

class HealthCheckAccessLogFilter(logging.Filter):
    """Keep routine local health probes out of access logs."""
    def filter(self, record):
        message = record.getMessage()
        return not any(
            f'"{method} /health HTTP/' in message
            for method in ("GET", "HEAD")
        )


logging.getLogger("uvicorn.access").addFilter(HealthCheckAccessLogFilter())

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "Frontend"
API_UPSTREAM = "http://127.0.0.1:8005"
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

_API_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]
_HOP_BY_HOP_HEADERS = {
    "host", "content-length", "connection", "keep-alive", "proxy-authenticate",
    "proxy-authorization", "te", "trailers", "transfer-encoding", "upgrade",
    "accept-encoding",
}
_RESPONSE_HEADERS = {
    "content-type", "content-disposition", "cache-control", "expires", "pragma",
    "retry-after", "location", "www-authenticate", "etag", "last-modified", "allow",
}


@app.middleware("http")
async def protect_dashboard_files(request: Request, call_next):
    path = request.url.path
    if path == "/health":
        return JSONResponse({"status": "ok"})
    if path == "/":
        return RedirectResponse("/login/index.html", status_code=302)

    if path == "/dashboard" or path.startswith("/dashboard/"):
        try:
            user = get_user_from_session(request, touch_activity=False)
        except Exception:
            # Fail closed when session validation cannot reach the database.
            return RedirectResponse("/login/index.html", status_code=302)
        if not user:
            return RedirectResponse("/login/index.html", status_code=302)

    response = await call_next(request)
    if path == "/dashboard" or path.startswith("/dashboard/"):
        response.headers["Cache-Control"] = "no-store"
        response.headers["Pragma"] = "no-cache"
    return response


@app.api_route("/api/{api_path:path}", methods=_API_METHODS)
async def proxy_api_request(api_path: str, request: Request):
    """Keep browser requests same-origin and forward them to the private API port."""
    target = f"{API_UPSTREAM}/api/{api_path}"
    if request.url.query:
        target += f"?{request.url.query}"

    forwarded_headers = {
        key: value for key, value in request.headers.items()
        if key.lower() not in _HOP_BY_HOP_HEADERS
    }
    client = request.client
    if client and client.host:
        # The frontend proxy is the only public-facing hop for same-origin API calls.
        forwarded_headers["X-Forwarded-For"] = client.host

    body = await request.body()
    try:
        upstream = await run_in_threadpool(
            requests.request,
            method=request.method,
            url=target,
            headers=forwarded_headers,
            data=body if body else None,
            timeout=(5, 120),
            allow_redirects=False,
        )
    except requests.RequestException as exc:
        logger.warning(
            "Internal API proxy failed: method=%s path=%s error=%s",
            request.method, request.url.path, type(exc).__name__,
        )
        return JSONResponse(
            status_code=502,
            content={"detail": "ارتباط با سرویس API داخلی برقرار نشد"},
            headers={"Cache-Control": "no-store"},
        )

    response_headers = {
        key: value for key, value in upstream.headers.items()
        if key.lower() in _RESPONSE_HEADERS
    }
    response = Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=response_headers,
    )
    # Preserve multiple Set-Cookie headers (notably login/session cookies).
    try:
        set_cookie_headers = upstream.raw.headers.getlist("Set-Cookie")
    except Exception:
        set_cookie = upstream.headers.get("Set-Cookie")
        set_cookie_headers = [set_cookie] if set_cookie else []
    for cookie in set_cookie_headers:
        response.raw_headers.append((b"set-cookie", cookie.encode("latin-1")))
    return response


app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
