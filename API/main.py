from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from API.registration_admin import router as registration_router

from API.bale_api import router as bale_router
from API.eitaa_api import router as eitaa_router
from API.auth import router as auth_router
from API.admin import router as admin_router
from fastapi.middleware.cors import CORSMiddleware




app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://95.38.187.123:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===============================
# CORS
# ===============================

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://95.38.187.123:3002"
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# ===============================
# Routers
# ===============================

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(bale_router)
app.include_router(eitaa_router)
app.include_router(registration_router)
# ===============================
# Root
# ===============================

@app.get("/")
def root():

    return {
        "status": "API is running"
    }
