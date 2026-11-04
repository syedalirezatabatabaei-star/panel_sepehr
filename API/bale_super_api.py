"""Dedicated API for the Sepehr panel's Bale Super bulk-messaging button.

This router is the only panel feature that calls the separate BaleLink gateway.
The legacy /api/bale routes intentionally remain unchanged.
"""
import os
import threading
import time
import uuid

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from API.bale_api import create_report, normalize_phone, read_excel_contacts
from API.bale_super_connection import check_bale_super_connection
from API.bale_gateway import (
    gateway_account,
    gateway_enabled,
    gateway_reset,
    gateway_send,
    gateway_start_login,
    gateway_verify_login,
)

router = APIRouter(prefix="/api/bale-super", tags=["Bale Super"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "data", "bale-super-uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

_jobs = {}
_jobs_lock = threading.RLock()


def _require_gateway():
    if not gateway_enabled():
        raise HTTPException(
            status_code=503,
            detail="اتصال سرویس Bale Super تنظیم نشده است؛ تنظیمات Gateway را بررسی کنید.",
        )


class LoginRequest(BaseModel):
    phone: str


class VerifyRequest(BaseModel):
    otp: str


@router.get("/connection")
def connection_status():
    """Return a safe diagnostic of the dedicated Bale Super API connection."""
    return check_bale_super_connection()


@router.get("/account")
def account():
    _require_gateway()
    try:
        return gateway_account()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"خطا در بررسی حساب Bale Super: {exc}") from exc


@router.post("/login")
def login(body: LoginRequest):
    _require_gateway()
    try:
        gateway_start_login(body.phone.strip())
        return {"success": True, "message": "کد تایید ارسال شد."}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"ارسال کد ورود ناموفق بود: {exc}") from exc


@router.post("/verify")
def verify(body: VerifyRequest):
    _require_gateway()
    try:
        result = gateway_verify_login(body.otp.strip())
        return {"success": True, "message": "ورود به حساب بله با موفقیت انجام شد.", "data": result}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"تایید کد ورود ناموفق بود: {exc}") from exc


@router.post("/account/reset")
@router.post("/reset")
def reset_account():
    _require_gateway()
    try:
        gateway_reset()
        return {"success": True, "message": "نشست Bale Super حذف شد."}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"خروج از حساب ناموفق بود: {exc}") from exc


def _send_worker(job_id, contacts, message, message_type, media_path, delay_seconds):
    with _jobs_lock:
        job = _jobs[job_id]
        job["status"] = "running"

    try:
        total = len(contacts)
        send_attempts = 0
        for index, contact in enumerate(contacts, start=1):
            phone = normalize_phone(contact.get("phone"))
            name = str(contact.get("name") or phone).strip()
            result = {
                "phone": phone,
                "name": name,
                "contact_status": "direct",
                "contact_add_status": "not_required",
                "contact_add_detail": "ارسال مستقیم از طریق Bale Super؛ افزودن مخاطب لازم نیست.",
                "ui_notification": "",
                "message_status": "failed",
                "status": "failed",
                "success": False,
                "error": None,
            }
            try:
                # Pace only consecutive message-send API requests. Excel parsing,
                # contact handling, and status polling are intentionally unaffected.
                if send_attempts > 0 and delay_seconds > 0:
                    time.sleep(delay_seconds)
                send_attempts += 1
                gateway_send(phone, message, message_type, media_path)
                result.update({
                    "message_status": "sent",
                    "status": "success",
                    "success": True,
                })
            except Exception as exc:
                result["error"] = str(exc)

            with _jobs_lock:
                job = _jobs[job_id]
                job["results"].append(result)
                job["processed"] = index
                job["current"] = phone
                if result["success"]:
                    job["successful"] += 1
                else:
                    job["failed"] += 1
                job["progress"] = int(index * 100 / total)

        with _jobs_lock:
            job = _jobs[job_id]
            job["current"] = None
            job["progress"] = 100
            job["status"] = "completed"
            try:
                job["report_file"] = create_report(job["results"], job_id=job_id)
            except Exception as exc:
                job["report_error"] = str(exc)
                job["report_file"] = None
    except Exception as exc:
        with _jobs_lock:
            job = _jobs.get(job_id)
            if job:
                job["status"] = "failed"
                job["error"] = str(exc)
                job["current"] = None
    finally:
        if media_path and os.path.isfile(media_path):
            try:
                os.remove(media_path)
            except OSError:
                pass


@router.post("/send")
async def send_messages(
    file: UploadFile = File(...),
    message: str = Form(""),
    message_type: str = Form("text"),
    delay_seconds: int = Form(0),
    media: UploadFile | None = File(None),
):
    _require_gateway()

    if message_type not in {"text", "image", "video"}:
        raise HTTPException(status_code=400, detail="نوع محتوا نامعتبر است.")
    if not 0 <= delay_seconds <= 30:
        raise HTTPException(status_code=400, detail="فاصله ارسال باید بین ۰ تا ۳۰ ثانیه باشد.")
    if message_type == "text" and not message.strip():
        raise HTTPException(status_code=400, detail="متن پیام وارد نشده است.")
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xlsm")):
        raise HTTPException(status_code=400, detail="فقط فایل Excel با فرمت xlsx یا xlsm مجاز است.")

    excel_bytes = await file.read()
    if not excel_bytes:
        raise HTTPException(status_code=400, detail="فایل Excel خالی است.")
    try:
        excel_data = read_excel_contacts(excel_bytes)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"خطا در خواندن فایل Excel: {exc}") from exc

    media_path = None
    if message_type in {"image", "video"}:
        if media is None or not media.filename:
            raise HTTPException(status_code=400, detail="فایل رسانه انتخاب نشده است.")
        extension = os.path.splitext(media.filename)[1].lower()
        allowed = (
            {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
            if message_type == "image"
            else {".mp4", ".webm", ".mov", ".mkv", ".avi", ".m4v"}
        )
        if extension not in allowed:
            raise HTTPException(status_code=400, detail="فرمت فایل رسانه با نوع انتخاب‌شده سازگار نیست.")
        media_bytes = await media.read()
        if not media_bytes:
            raise HTTPException(status_code=400, detail="فایل رسانه خالی است.")
        if len(media_bytes) > 50 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="حجم فایل رسانه نباید بیشتر از ۵۰ مگابایت باشد.")
        media_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4().hex}{extension}")
        with open(media_path, "wb") as output:
            output.write(media_bytes)

    job_id = str(uuid.uuid4())
    contacts = excel_data["contacts"]
    with _jobs_lock:
        _jobs[job_id] = {
            "job_id": job_id,
            "status": "starting",
            "total": len(contacts),
            "processed": 0,
            "successful": 0,
            "failed": 0,
            "progress": 0,
            "current": None,
            "results": [],
            "error": None,
            "report_file": None,
        }

    thread = threading.Thread(
        target=_send_worker,
        args=(job_id, contacts, message, message_type, media_path, delay_seconds),
        daemon=True,
        name=f"bale-super-{job_id[:8]}",
    )
    thread.start()

    return {
        "success": True,
        "job_id": job_id,
        "total": len(contacts),
        "message": "ارسال از طریق Bale Super شروع شد.",
        "excel": {
            "sheet_names": excel_data["sheet_names"],
            "active_sheet": excel_data["active_sheet"],
            "headers": excel_data["headers"],
            "rows_count": excel_data["rows_count"],
            "contacts_count": len(contacts),
            "preview": contacts[:10],
        },
    }


@router.get("/send/status/{job_id}")
def send_status(job_id: str):
    with _jobs_lock:
        job = _jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="عملیات ارسال پیدا نشد.")
        return {
            "success": True,
            "job_id": job["job_id"],
            "status": job["status"],
            "total": job["total"],
            "processed": job["processed"],
            "successful": job["successful"],
            "failed": job["failed"],
            "progress": job["progress"],
            "current": job["current"],
            "results": list(job["results"]),
            "error": job.get("error"),
            "report_file": job.get("report_file"),
            "has_report": bool(job.get("report_file")),
        }


@router.get("/send/export/{job_id}")
def send_export(job_id: str):
    with _jobs_lock:
        job = _jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="عملیات ارسال پیدا نشد.")
        report_file = job.get("report_file")
    if not report_file or not os.path.isfile(report_file):
        raise HTTPException(status_code=404, detail="گزارش اکسل هنوز آماده نیست یا پیدا نشد.")
    return FileResponse(
        path=report_file,
        filename=os.path.basename(report_file),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
