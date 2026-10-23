"""Static frontend server that refuses unauthenticated dashboard requests."""
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from API.auth import get_user_from_session

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "Frontend"
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)


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
            # Fail closed if session validation cannot reach the database.
            return RedirectResponse("/login/index.html", status_code=302)
        if not user:
            return RedirectResponse("/login/index.html", status_code=302)

    response = await call_next(request)
    if path == "/dashboard" or path.startswith("/dashboard/"):
        response.headers["Cache-Control"] = "no-store"
        response.headers["Pragma"] = "no-cache"
    return response


app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
