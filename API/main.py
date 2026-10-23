import logging

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

logger = logging.getLogger(__name__)

app = FastAPI()

# Keep the current frontend origin while allowing deployment-specific origins
# through FRONTEND_ORIGINS (comma-separated).
import os
frontend_origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://95.38.187.123:3002"
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# Only the endpoints required to establish an authenticated session are public.
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
        # Fail closed: a database/session validation failure must not grant access.
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

    # Enforce sensitive messaging actions on the server, not only in the UI.
    required_permission = None
    if request.method == "POST" and path == "/api/bale/send":
        required_permission = "bale.personal_message"
    elif request.method == "POST" and path == "/api/eitaa/send":
        required_permission = "eitaa.personal_message"

    if required_permission:
        try:
            if not has_permission(int(user["id"]), required_permission):
                return JSONResponse(
                    status_code=403,
                    content={"detail": {"message": "شما اجازه استفاده از این قابلیت را ندارید."}},
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


@app.get("/")
def root():
    return {"status": "API is running"}
