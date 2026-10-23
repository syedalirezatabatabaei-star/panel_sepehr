import logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from API.registration_admin import router as registration_router
from API.bale_api import router as bale_router
from API.eitaa_api import router as eitaa_router
from API.auth import router as auth_router, get_user_from_session
from API.admin import router as admin_router
from API.permissions import has_permission
from API.permissions_admin import router as permissions_admin_router
from API.chat_proxy import router as chat_proxy_router

logger = logging.getLogger(__name__)
app = FastAPI()

frontend_origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://95.38.187.123:3002",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
)

_PUBLIC_AUTH_PATHS = {
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/verify-otp",
    "/api/auth/resend-otp",
}


@app.middleware("http")
async def require_authenticated_api_requests(request: Request, call_next):
    path = request.url.path
    if (
        not path.startswith("/api/")
        or request.method == "OPTIONS"
        or path in _PUBLIC_AUTH_PATHS
        or path.endswith("/health")
    ):
        return await call_next(request)

    try:
        user = get_user_from_session(request)
    except Exception:
        logger.exception("Unable to validate API session")
        return JSONResponse(
            status_code=503,
            content={"detail": "سرویس احراز هویت موقتاً در دسترس نیست"},
            headers={"Cache-Control": "no-store"},
        )

    if not user:
        return JSONResponse(
            status_code=401,
            content={"detail": "برای دسترسی ابتدا وارد حساب کاربری شوید"},
            headers={"Cache-Control": "no-store"},
        )

    request.state.user = user
    path_lower = path.lower()
    required_permission = None
    permission_action = "use"

    # Personal broadcast permissions are checked on the server.
    if request.method == "POST" and path_lower == "/api/bale/send":
        required_permission = "bale.personal_message"
    elif request.method == "POST" and path_lower == "/api/eitaa/send":
        required_permission = "eitaa.personal_message"
    # Chat service and n8n webhook calls must pass through this authenticated
    # gateway so users cannot bypass chat read/write permissions via port 3000/3001.
    elif path_lower.startswith("/api/chat/bale/") or path_lower == "/api/chat/bale":
        required_permission = "bale.chats"
        permission_action = "read" if request.method in {"GET", "HEAD"} else "write"
    elif path_lower.startswith("/api/chat/eitaa/") or path_lower == "/api/chat/eitaa":
        required_permission = "eitaa.chats"
        permission_action = "read" if request.method in {"GET", "HEAD"} else "write"
    # Granular access for the admin UI. Unknown admin endpoints remain admin-only.
    elif path_lower.startswith("/api/admin/registration-requests"):
        required_permission = "registration_requests"
        permission_action = "read" if request.method in {"GET", "HEAD"} else "write"
    elif path_lower.startswith("/api/admin/users"):
        required_permission = "users"
        permission_action = "read" if request.method in {"GET", "HEAD"} else "write"
    elif path_lower.startswith("/api/admin/"):
        if int(user.get("access_level") or 0) != 3:
            return JSONResponse(
                status_code=403,
                content={"detail": {"message": "این عملیات فقط برای مدیران مجاز است."}},
                headers={"Cache-Control": "no-store"},
            )

    if required_permission:
        try:
            if not has_permission(
                int(user["id"]),
                required_permission,
                action=permission_action,
            ):
                return JSONResponse(
                    status_code=403,
                    content={"detail": {"message": "شما اجازه دسترسی به این قابلیت را ندارید."}},
                    headers={"Cache-Control": "no-store"},
                )
        except Exception:
            logger.exception("Permission check failed for %s", path)
            return JSONResponse(
                status_code=503,
                content={"detail": "بررسی مجوز موقتاً در دسترس نیست"},
                headers={"Cache-Control": "no-store"},
            )

    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    return response


app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(permissions_admin_router)
app.include_router(bale_router)
app.include_router(eitaa_router)
app.include_router(registration_router)
app.include_router(chat_proxy_router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def root():
    return {"status": "API is running"}
