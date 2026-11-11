"""Authenticated Span API adapter for three isolated GoOmni provider devices."""
import base64
import json
import logging
import mimetypes
import os
import re
import threading
import time
import uuid
from datetime import datetime
from pathlib import Path

import requests
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill

router = APIRouter(prefix="/api/span", tags=["Span API"])
GOOMNI_URL = os.getenv("GOOMNI_URL", "http://eita-rubika-bale:3000").rstrip("/")
GOOMNI_AUTH = os.getenv("GOOMNI_BASIC_AUTH", "")
STATE = Path(os.getenv("SPAN_STATE_DIR", "/app/data/span-api"))
MEDIA, REPORTS, JOBS_DIR = STATE / "media", STATE / "reports", STATE / "jobs"
for folder in (STATE, MEDIA, REPORTS, JOBS_DIR):
    folder.mkdir(parents=True, exist_ok=True)

DEVICES = {
    "bale": os.getenv("SPAN_BALE_DEVICE_ID", "sepehr-span-bale"),
    "eitaa": os.getenv("SPAN_EITAA_DEVICE_ID", "sepehr-span-eitaa"),
    "rubika": os.getenv("SPAN_RUBIKA_DEVICE_ID", "sepehr-span-rubika"),
}
MAX_EXCEL = 10 * 1024 * 1024
MAX_IMAGE = 20 * 1024 * 1024
MAX_VIDEO = 20 * 1024 * 1024
MAX_FILE = 20 * 1024 * 1024
MAX_RECIPIENTS = 5000
JOBS: dict = {}
LOCK = threading.RLock()
LOG = logging.getLogger(__name__)


class GatewayOperationError(Exception):
    def __init__(self, message, result):
        super().__init__(message)
        self.result = result


def provider(value):
    key = str(value or "").lower()
    if key not in DEVICES:
        raise HTTPException(404, "پیام‌رسان Span API معتبر نیست")
    return key
    
def normalize_login_phone(p, value):
    raw = str(value or "").strip()
    digits = []
    for char in raw:
        if "0" <= char <= "9":
            digits.append(char)
        elif "۰" <= char <= "۹":
            digits.append(str(ord(char) - ord("۰")))
        elif "٠" <= char <= "٩":
            digits.append(str(ord(char) - ord("٠")))
        elif char in "+-()" or char.isspace():
            continue
        else:
            raise HTTPException(422, "شماره تلفن فقط باید شامل رقم و جداکننده‌های معمول باشد")
    phone = "".join(digits)
    if phone.startswith("00"):
        phone = phone[2:]
    if p == "bale":
        # Accept common Iranian input forms and send the canonical international
        # number expected by GoOmni's Bale auth adapter.
        if len(phone) == 11 and phone.startswith("09"):
            phone = "98" + phone[1:]
        elif len(phone) == 10 and phone.startswith("9"):
            phone = "98" + phone
        elif len(phone) == 13 and phone.startswith("980"):
            # Users sometimes enter the national trunk zero after +98.
            phone = "98" + phone[3:]
        if not (8 <= len(phone) <= 15) or phone.startswith("0"):
            raise HTTPException(422, "برای ورود بله شماره را به فرمت بین‌المللی وارد کنید؛ نمونه: 98912xxxxxxx")
    elif p == "eitaa":
        if len(phone) == 11 and phone.startswith("09"):
            phone = "98" + phone[1:]
        elif len(phone) == 10 and phone.startswith("9"):
            phone = "98" + phone
        if not (7 <= len(phone) <= 15) or phone.startswith("0"):
            raise HTTPException(422, "برای ورود ایتا شماره را بین‌المللی وارد کنید؛ نمونه: 98912xxxxxxx")
    elif not (8 <= len(phone) <= 16):
        raise HTTPException(422, "شماره تلفن معتبر نیست")
    return phone



def _device(p):
    # A device alias is immutable to one messenger account lifetime. After
    # logout, the saved alias is rotated and a fresh GoOmni device is provisioned.
    saved = _read_account(p)
    return str(saved.get("device_id") or DEVICES[p])


def _account_path(p):
    return STATE / (p + "-account.json")


def _read_account(p):
    try:
        return json.loads(_account_path(p).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def _write_json(path, data):
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    try:
        tmp.chmod(0o600)
    except OSError:
        pass
    tmp.replace(path)


def _write_account(p, data):
    _write_json(_account_path(p), data)


def _headers(p, instance_id=None, idempotency_key=None):
    if not GOOMNI_AUTH or ":" not in GOOMNI_AUTH:
        raise HTTPException(503, "GOOMNI_BASIC_AUTH روی سرور تنظیم نشده است")
    headers = {
        "Authorization": "Basic " + base64.b64encode(GOOMNI_AUTH.encode()).decode(),
        "Accept": "application/json",
    }
    if instance_id:
        headers.update({"X-Device-Id": _device(p), "X-Device-Instance": str(instance_id)})
    if idempotency_key:
        headers["Idempotency-Key"] = str(idempotency_key)
    return headers


def _request(p, method, path, *, instance_id=None, idempotency_key=None, expected=(200,), **kwargs):
    try:
        response = requests.request(
            method, GOOMNI_URL + path,
            headers={**_headers(p, instance_id, idempotency_key), **kwargs.pop("headers", {})},
            timeout=(10, 90), **kwargs
        )
        try:
            payload = response.json()
        except ValueError:
            payload = {"message": response.text[:500]}
    except requests.RequestException as exc:
        LOG.warning("GoOmni transport failure (%s)", type(exc).__name__)
        raise HTTPException(503, "ارتباط با GoOmni برقرار نشد؛ نتیجه عملیات احتمالا نیازمند بررسی است")
    result = payload.get("results", payload.get("Results", payload)) if isinstance(payload, dict) else payload
    if response.status_code not in expected:
        code = payload.get("code") if isinstance(payload, dict) else None
        message = payload.get("message") or payload.get("detail") or code or "خطای GoOmni"
        # Keep diagnostics useful without logging phone numbers, OTPs, tokens,
        # request bodies, or authorization headers.
        LOG.warning(
            "GoOmni rejected request provider=%s method=%s path=%s status=%s code=%s",
            p, method.upper(), path, response.status_code, str(code or "UNKNOWN")[:80],
        )
        if isinstance(result, dict) and result.get("send_id"):
            raise GatewayOperationError(str(message), result)
        raise HTTPException(response.status_code, str(message)[:500])
    return result


def _device_items(payload):
    """Normalize GoOmni's list envelope across supported response shapes."""
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ("results", "devices", "items"):
            value = payload.get(key)
            if isinstance(value, list):
                return value
    return []


def _new_device_alias(p):
    # Never reuse an alias whose previous account lifetime was deleted.
    return f"sepehr-span-{p}-{uuid.uuid4().hex[:16]}"


def _ensure_device(p):
    alias = _device(p)
    devices = _request(p, "GET", "/devices")
    items = _device_items(devices)
    found = next((x for x in items if isinstance(x, dict)
                  and str(x.get("id") or x.get("device_id")) == alias), None)
    if found:
        actual = str(found.get("provider") or "").lower()
        if actual and actual != p:
            raise HTTPException(409, "این شناسه دستگاه در GoOmni متعلق به پیام‌رسان دیگری است")
        return found
    return _request(
        p, "POST", "/devices",
        json={"device_id": alias, "provider": p},
        idempotency_key="sepehr-span-provision-" + alias,
        expected=(200, 201),
    )


def _instance(p):
    saved = _read_account(p)
    alias = _device(p)
    saved_instance = str(saved.get("instance_id") or "")

    # A locally cached instance_id is not proof that the remote device still
    # exists. Logout/deletion may have happened outside this panel. Reconcile
    # against GoOmni's device list before using the cached reference.
    if saved_instance and saved.get("device_id") == alias:
        devices = _request(p, "GET", "/devices")
        found = next((x for x in _device_items(devices)
                      if isinstance(x, dict)
                      and str(x.get("id") or x.get("device_id")) == alias), None)
        if found:
            actual = str(found.get("provider") or "").lower()
            if actual and actual != p:
                raise HTTPException(409, "این شناسه دستگاه در GoOmni متعلق به پیام‌رسان دیگری است")
            remote_instance = str(found.get("instance_id") or found.get("instanceId") or "")
            if not remote_instance or remote_instance == saved_instance:
                return saved_instance
            LOG.info("GoOmni instance changed for provider=%s; rotating stale local device reference", p)
        else:
            LOG.info("GoOmni device missing for provider=%s; provisioning a fresh device", p)

        # Do not retry a prior operation against a replacement account. Rotate
        # the alias and provision a new, independent device lifetime.
        saved = {"provider": p, "device_id": _new_device_alias(p)}
        _write_account(p, saved)

    device_data = _ensure_device(p)
    value = device_data.get("instance_id") or device_data.get("instanceId")
    if not value:
        raise HTTPException(503, "GoOmni شناسه instance دستگاه را برنگرداند")
    saved.update({"provider": p, "device_id": _device(p), "instance_id": str(value)})
    _write_account(p, saved)
    return str(value)


def _status(p):
    instance_id = _instance(p)
    result = _request(p, "GET", f"/devices/{_device(p)}/status", instance_id=instance_id)
    state = str(result.get("auth") or "").lower()
    saved = _read_account(p)
    return {
        "provider": p,
        "device_id": _device(p),
        "exists": state in {"authenticated", "authorized", "ready"},
        "state": state or "unknown",
        "phone": saved.get("phone", ""),
        "challenge": result.get("challenge"),
    }


@router.get("/{provider_name}/account")
def account_status(provider_name: str):
    return _status(provider(provider_name))


@router.post("/{provider_name}/account/logout")
def logout_account(provider_name: str):
    """Retire this account's GoOmni device so a later login gets a new identity."""
    p = provider(provider_name)
    with LOCK:
        saved = _read_account(p)
        old_device_id = str(saved.get("device_id") or DEVICES[p])
        instance_id = str(saved.get("instance_id") or "")
        if not instance_id and (saved.get("phone") or saved.get("account_id")):
            # Recover the immutable guard from GoOmni before retiring a legacy
            # local mapping that predates persisted instance_id.
            instance_id = _instance(p)
        remote_logout_warning = None

        # Stop local broadcasts first. GoOmni's DELETE endpoint also cancels
        # queued operations/schedules and marks in-flight sends as unknown.
        for job_file in JOBS_DIR.glob("*.json"):
            try:
                job = _get_job(job_file.stem)
            except Exception:
                continue
            if (job.get("provider") == p
                    and (not instance_id or job.get("instance_id") == instance_id)
                    and job.get("status") in {"queued", "running"}):
                job["status"] = "cancelled"
                job["phase"] = "لغو شد؛ حساب پیام‌رسان خارج شد"
                job["finished_at"] = datetime.now().isoformat(timespec="seconds")
                _save_job(job)

        # Revoke the provider session where possible. Even when the provider
        # cannot confirm revocation, retire the local device identity below;
        # never reuse a device that may still be bound to the previous account.
        if instance_id and (saved.get("phone") or saved.get("account_id")):
            try:
                _request(
                    p, "POST", f"/devices/{old_device_id}/logout",
                    instance_id=instance_id, expected=(200, 202, 204),
                )
            except HTTPException as exc:
                remote_logout_warning = str(exc.detail)[:300]

        if instance_id:
            try:
                _request(
                    p, "DELETE", f"/devices/{old_device_id}",
                    instance_id=instance_id, expected=(200, 204),
                )
            except HTTPException as exc:
                if exc.status_code != 404:
                    raise

        # The next _instance() call provisions this new alias with a unique
        # idempotency key. Other messenger account files remain untouched.
        new_device_id = f"sepehr-span-{p}-{uuid.uuid4().hex[:16]}"
        _write_account(p, {"provider": p, "device_id": new_device_id})

    response = {
        "success": True,
        "provider": p,
        "retired_device_id": old_device_id,
        "next_device_id": new_device_id,
        "message": "از حساب این پیام‌رسان خارج شدید؛ ورود بعدی با دستگاه جدید انجام می‌شود",
    }
    if remote_logout_warning:
        response["warning"] = (
            "GoOmni دستگاه قبلی را بازنشسته کرد، اما تأیید خروج از سمت پیام‌رسان دریافت نشد؛ "
            "وضعیت نشست قبلی باید جداگانه بررسی شود."
        )
    return response


@router.post("/{provider_name}/auth/send-code")
def send_code(provider_name: str, payload: dict):
    p = provider(provider_name)
    phone = normalize_login_phone(p, payload.get("phone"))
    instance_id = _instance(p)
    result = _request(
        p, "POST", f"/devices/{_device(p)}/login",
        instance_id=instance_id, json={"phone": phone}
    )
    saved = _read_account(p)
    saved.update({
        "provider": p, "device_id": _device(p), "instance_id": instance_id,
        "phone": phone, "challenge_id": result.get("challenge_id") or result.get("id"),
    })
    _write_account(p, saved)
    return {
        "success": True, "phone": phone, "challenge_id": saved.get("challenge_id"),
        "delivery": result.get("delivery"), "next_delivery": result.get("next_delivery"),
        "message": result.get("message") or "درخواست کد ورود ثبت شد",
    }


@router.post("/{provider_name}/auth/login")
def login(provider_name: str, payload: dict):
    p = provider(provider_name)
    saved = _read_account(p)
    challenge_id = str(payload.get("challenge_id") or saved.get("challenge_id") or "")
    code = str(payload.get("code") or "").strip()
    if not challenge_id or not code:
        raise HTTPException(422, "کد ورود یا شناسه چالش معتبر نیست")
    result = _request(
        p, "POST", f"/devices/{_device(p)}/login/code",
        instance_id=_instance(p), json={"challenge_id": challenge_id, "code": code}
    )
    state = str(result.get("state") or "").lower()
    if result.get("requires_password") or state == "awaiting_password":
        return {"success": False, "requires_password": True, "challenge_id": challenge_id}
    status = _request(p, "GET", f"/devices/{_device(p)}/status", instance_id=_instance(p))
    saved.pop("challenge_id", None)
    saved["account_id"] = status.get("account_id")
    _write_account(p, saved)
    return {"success": True, "phone": saved.get("phone", ""), "state": status.get("auth") or state or "authenticated"}


@router.post("/{provider_name}/auth/login-password")
def login_password(provider_name: str, payload: dict):
    p = provider(provider_name)
    saved = _read_account(p)
    challenge_id = str(payload.get("challenge_id") or saved.get("challenge_id") or "")
    password = str(payload.get("password") or "")
    if not challenge_id or not password:
        raise HTTPException(422, "شناسه چالش و رمز دومرحله‌ای الزامی است")
    result = _request(
        p, "POST", f"/devices/{_device(p)}/login/password",
        instance_id=_instance(p), json={"challenge_id": challenge_id, "password": password}
    )
    status = _request(p, "GET", f"/devices/{_device(p)}/status", instance_id=_instance(p))
    saved.pop("challenge_id", None)
    saved["account_id"] = status.get("account_id")
    _write_account(p, saved)
    return {"success": True, "phone": saved.get("phone", ""), "state": status.get("auth") or result.get("state") or "authenticated"}


async def _save_upload(upload, path, limit, label):
    size = 0
    with path.open("wb") as output:
        while True:
            chunk = await upload.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > limit:
                output.close()
                path.unlink(missing_ok=True)
                raise HTTPException(413, f"حجم {label} بیش از حد مجاز است")
            output.write(chunk)
    if not size:
        path.unlink(missing_ok=True)
        raise HTTPException(400, f"فایل {label} خالی است")
    return path


def _recipients(path, p):
    workbook = load_workbook(path, read_only=True, data_only=True)
    try:
        sheet = workbook.active
        headers = [str(c.value or "").strip().lower() for c in sheet[1]]
        peer_headers = {"peer_id", "user_id", "guid", "شناسه", "شناسه کاربری", "شناسه مخاطب"}
        phone_headers = {"phone", "mobile", "phone_number", "mobile_number", "شماره", "شماره موبایل", "شماره‌موبایل", "شماره همراه", "شماره‌همراه", "تلفن"}
        name_headers = {"name", "نام", "نام مخاطب"}
        type_headers = {"peer_type", "type", "نوع", "نوع مخاطب"}
        peer_col = next((i + 1 for i, x in enumerate(headers) if x in peer_headers), None)
        phone_col = next((i + 1 for i, x in enumerate(headers) if x in phone_headers), None)
        name_col = next((i + 1 for i, x in enumerate(headers) if x in name_headers), None)
        type_col = next((i + 1 for i, x in enumerate(headers) if x in type_headers), None)
        has_header = any(x in (peer_headers | phone_headers | name_headers | type_headers) for x in headers)
        if p == "bale" and phone_col is None and peer_col is None:
            raise ValueError("برای ارسال بله با شماره تلفن، فایل Excel باید ستون phone یا «شماره موبایل» داشته باشد؛ ستون peer_id فقط برای شناسه مخاطب است")
        if p != "bale" and peer_col is None:
            raise ValueError("فایل Excel باید ستون peer_id برای شناسه مخاطب داشته باشد")
        targets, seen = [], set()
        for row in sheet.iter_rows(min_row=2 if has_header else 1, values_only=True):
            name = str(row[name_col - 1] or "").strip() if name_col and len(row) >= name_col else ""
            if p == "bale" and phone_col is not None:
                raw_phone = row[phone_col - 1] if len(row) >= phone_col else None
                if raw_phone is None or str(raw_phone).strip() == "":
                    continue
                if isinstance(raw_phone, float) and raw_phone.is_integer():
                    raw_phone = int(raw_phone)
                try:
                    phone = normalize_login_phone("bale", raw_phone)
                except HTTPException as exc:
                    raise ValueError("شماره موبایل نامعتبر در فایل Excel: " + str(exc.detail))
                key = ("phone", phone)
                if key not in seen:
                    seen.add(key)
                    targets.append({"phone": phone, "name": name or phone})
            else:
                raw = row[peer_col - 1] if peer_col and len(row) >= peer_col else None
                peer_id = str(raw or "").strip()
                if not peer_id or len(peer_id) > 256:
                    continue
                peer_type = str(row[type_col - 1] if type_col and len(row) >= type_col else "user").strip().lower()
                if peer_type not in {"user", "group", "channel"}:
                    continue
                if p == "rubika":
                    if peer_type != "user":
                        raise ValueError("در نسخه فعلی Span API، ارسال روبیکا فقط به مخاطب user پشتیبانی می‌شود")
                    if not re.fullmatch(r"u0[A-Za-z0-9]{1,126}", peer_id):
                        raise ValueError("شناسه مخاطب روبیکا باید GUID معتبر با پیشوند u0 باشد؛ شماره تلفن یا username قابل ارسال نیست")
                elif p == "bale":
                    if peer_type not in {"user", "group", "channel"} or not re.fullmatch(r"[1-9][0-9]{0,9}", peer_id) or int(peer_id) > 4294967295:
                        raise ValueError("شناسه مخاطب بله باید عدد مثبت uint32 باشد؛ یا برای ارسال مستقیم از ستون phone استفاده کنید")
                elif p == "eitaa":
                    valid_eitaa = re.fullmatch(r"[1-9][0-9]{0,18}", peer_id)
                    valid_eitaa_group = peer_type == "group" and re.fullmatch(r"channel_[1-9][0-9]{0,18}", peer_id)
                    if not (valid_eitaa or valid_eitaa_group):
                        raise ValueError("شناسه مخاطب ایتا باید عدد مثبت باشد؛ گروه‌های سوپرگروه با channel_ و سپس عدد ثبت می‌شوند")
                if peer_type == "user" and peer_id.startswith("channel_"):
                    raise ValueError("شناسه channel_ نباید با نوع user ارسال شود")
                key = (peer_type, peer_id)
                if key not in seen:
                    seen.add(key)
                    targets.append({"peer": {"type": peer_type, "id": peer_id}, "name": name or peer_id})
            if len(targets) > MAX_RECIPIENTS:
                raise ValueError(f"حداکثر {MAX_RECIPIENTS} مخاطب در هر ارسال مجاز است")
        return targets
    finally:
        workbook.close()


def _job_path(job_id):
    return JOBS_DIR / (job_id + ".json")


def _save_job(job):
    _write_json(_job_path(job["job_id"]), job)


def _get_job(job_id):
    with LOCK:
        if job_id in JOBS:
            return JOBS[job_id]
        try:
            job = json.loads(_job_path(job_id).read_text(encoding="utf-8"))
            # Never resume a broadcast automatically after a process restart:
            # the last recipient may have been accepted while its response was lost.
            if job.get("status") in {"queued", "running"}:
                job["status"] = "interrupted"
                job["phase"] = "فرایند متوقف شد؛ نتیجه مخاطب جاری را قبل از هر ارسال مجدد بررسی کنید"
                job["interrupted_at"] = datetime.now().isoformat(timespec="seconds")
                _save_job(job)
            JOBS[job_id] = job
            return job
        except (OSError, ValueError):
            return None


def _send_one(p, instance_id, target, message, media_path, media_type, key):
    recipient = {"phone": target["phone"]} if target.get("phone") else {"peer": target["peer"]}
    if media_path:
        mime = mimetypes.guess_type(media_path.name)[0] or "application/octet-stream"
        with media_path.open("rb") as stream:
            form_data = {**recipient, "caption": message}
            if "peer" in form_data:
                form_data["peer"] = json.dumps(form_data["peer"], ensure_ascii=False)
            result = _request(
                p, "POST", "/send/" + media_type, instance_id=instance_id,
                idempotency_key=key, expected=(200, 202),
                data=form_data,
                files={media_type: (media_path.name, stream, mime)},
            )
    else:
        result = _request(
            p, "POST", "/send/message", instance_id=instance_id,
            idempotency_key=key, expected=(200, 202),
            json={**recipient, "message": message},
        )
    send_id = result.get("send_id")
    state = str(result.get("state") or "").lower()
    if state in {"queued", "sending"} and send_id:
        deadline = time.monotonic() + 90
        while time.monotonic() < deadline:
            time.sleep(2)
            operation = _request(p, "GET", "/send/operations/" + str(send_id), instance_id=instance_id)
            state = str(operation.get("state") or "").lower()
            if state not in {"queued", "sending"}:
                result = operation
                break
    if state == "succeeded" or result.get("message_id"):
        return {"status": "success", "send_id": send_id, "message_id": result.get("message_id"), "detail": "Gateway عملیات را موفق اعلام کرد"}
    if state == "unknown":
        return {"status": "unknown", "send_id": send_id, "detail": "نتیجه ارسال نامشخص است؛ ارسال خودکار تکرار نشد"}
    return {"status": "error", "send_id": send_id, "detail": str(result.get("error_message") or result.get("message") or state or "نتیجه ارسال تأیید نشد")[:500]}


def _report(job):
    path = REPORTS / ("span_" + job["job_id"] + ".xlsx")
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "نتایج"
    sheet.append(["ردیف", "پیام‌رسان", "شماره تلفن / شناسه مخاطب", "نوع مخاطب", "نام", "وضعیت", "شناسه عملیات", "توضیحات"])
    for cell in sheet[1]:
        cell.fill = PatternFill("solid", fgColor="1F4E79")
        cell.font = Font(color="FFFFFF", bold=True)
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    for index, row in enumerate(job["results"], 1):
        sheet.append([index, job["provider"], row.get("phone") or row.get("peer_id") or "", row["peer_type"], row["name"], row["status"], row.get("send_id") or "", row.get("detail") or ""])
    for col, width in {"A": 8, "B": 14, "C": 34, "D": 14, "E": 24, "F": 18, "G": 38, "H": 60}.items():
        sheet.column_dimensions[col].width = width
    sheet.freeze_panes = "A2"
    sheet.auto_filter.ref = sheet.dimensions
    summary = workbook.create_sheet("خلاصه")
    summary.append(["شاخص", "مقدار"])
    for label, key in [("کل", "total"), ("موفق", "success"), ("ناموفق", "failed"), ("نامشخص", "unknown")]:
        summary.append([label, job[key]])
    workbook.save(path)
    return str(path)


def _run_job(job_id, targets, message, media_path, media_type, delay):
    job = _get_job(job_id)
    # A queued worker can start after logout has already cancelled its job.
    if job.get("status") == "cancelled":
        if media_path:
            media_path.unlink(missing_ok=True)
        return
    job["status"], job["phase"] = "running", "در حال ارسال"
    _save_job(job)
    results = []
    for index, target in enumerate(targets, 1):
        # Logout may cancel this worker while it is waiting between recipients.
        if job.get("status") == "cancelled":
            break
        peer = target.get("peer") or {}
        row = {"peer_id": peer.get("id", ""), "phone": target.get("phone", ""),
               "peer_type": peer.get("type", "user") if peer else "user",
               "name": target["name"], "status": "error"}
        try:
            row.update(_send_one(job["provider"], job["instance_id"], target, message, media_path, media_type,
                                 f"sepehr-span-{job_id}-{index}"))
        except GatewayOperationError as exc:
            row.update({"status": "unknown" if str(exc.result.get("state")) == "unknown" else "error",
                        "send_id": exc.result.get("send_id"), "detail": str(exc)[:500]})
        except HTTPException as exc:
            row.update({"status": "unknown" if exc.status_code == 503 else "error", "detail": str(exc.detail)[:500]})
        except Exception as exc:
            LOG.exception("Span send failed")
            row.update({"status": "unknown", "detail": type(exc).__name__})
        results.append(row)
        job["results"] = results
        job["processed"] = index
        job["success"] = sum(x["status"] == "success" for x in results)
        job["failed"] = sum(x["status"] == "error" for x in results)
        job["unknown"] = sum(x["status"] == "unknown" for x in results)
        job["progress"] = int(index * 100 / max(1, len(targets)))
        job["phase"] = "در حال پردازش مخاطبان" if index < len(targets) else "در حال ساخت گزارش"
        _save_job(job)
        if index < len(targets) and delay:
            time.sleep(delay)
    try:
        job["report_path"] = _report(job)
    except Exception:
        LOG.exception("Span report creation failed")
        job["report_path"] = None
    if job.get("status") == "cancelled":
        job["phase"] = "لغو شد؛ ارسال‌های باقی‌مانده اجرا نشدند"
        job["finished_at"] = job.get("finished_at") or datetime.now().isoformat(timespec="seconds")
    else:
        job.update({"status": "completed", "progress": 100, "phase": "پایان یافت",
                    "finished_at": datetime.now().isoformat(timespec="seconds")})
    _save_job(job)
    if media_path:
        media_path.unlink(missing_ok=True)


@router.post("/{provider_name}/send")
async def start_send(provider_name: str, excel: UploadFile = File(...), message: str = Form(""),
                     media: UploadFile | None = File(None), media_type: str = Form("text"),
                     delay_seconds: int = Form(0, ge=0, le=30)):
    p = provider(provider_name)
    instance_id = _instance(p)
    if not _status(p)["exists"]:
        raise HTTPException(401, "ابتدا حساب این پیام‌رسان را در Span API متصل کنید")
    if not excel.filename or Path(excel.filename).suffix.lower() not in {".xlsx", ".xlsm"}:
        raise HTTPException(400, "فایل مخاطبان باید xlsx یا xlsm باشد")
    if media_type not in {"text", "image", "video", "file"}:
        raise HTTPException(422, "نوع رسانه نامعتبر است")
    if media_type == "text" and not message.strip():
        raise HTTPException(400, "متن پیام الزامی است")
    if media_type != "text" and (not media or not media.filename):
        raise HTTPException(400, "برای نوع پیام انتخاب‌شده فایل لازم است")
    job_id = str(uuid.uuid4())
    excel_path = MEDIA / (job_id + "_contacts.xlsx")
    media_path = None
    try:
        await _save_upload(excel, excel_path, MAX_EXCEL, "Excel")
        try:
            targets = _recipients(excel_path, p)
        except ValueError as exc:
            raise HTTPException(400, str(exc))
        if not targets:
            raise HTTPException(400, "هیچ مخاطب معتبری با ستون peer_id در فایل پیدا نشد")
        if media_type != "text":
            suffix = Path(media.filename).suffix.lower()
            allowed = {
                "image": {".jpg", ".jpeg", ".png", ".webp"},
                "video": {".mp4", ".mov", ".m4v"},
                "file": {".pdf", ".doc", ".docx", ".zip"},
            }[media_type]
            if suffix not in allowed:
                raise HTTPException(400, "پسوند فایل با نوع رسانه مطابقت ندارد")
            limit = MAX_IMAGE if media_type == "image" else MAX_VIDEO if media_type == "video" else MAX_FILE
            media_path = await _save_upload(media, MEDIA / (job_id + "_media" + suffix), limit, "رسانه")
        job = {
            "job_id": job_id, "provider": p, "instance_id": instance_id,
            "status": "queued", "phase": "در صف انتظار", "total": len(targets),
            "processed": 0, "success": 0, "failed": 0, "unknown": 0,
            "progress": 0, "results": [], "created_at": datetime.now().isoformat(timespec="seconds"),
        }
        JOBS[job_id] = job
        _save_job(job)
        threading.Thread(target=_run_job, args=(job_id, targets, message, media_path, media_type, delay_seconds), daemon=True).start()
        return {"success": True, "job_id": job_id, "total": len(targets)}
    except Exception:
        excel_path.unlink(missing_ok=True)
        if media_path:
            media_path.unlink(missing_ok=True)
        raise
    finally:
        excel_path.unlink(missing_ok=True)


@router.get("/{provider_name}/send/status/{job_id}")
def send_status(provider_name: str, job_id: str):
    p = provider(provider_name)
    job = _get_job(job_id)
    if not job or job.get("provider") != p:
        raise HTTPException(404, "شناسه ارسال پیدا نشد")
    return {key: value for key, value in job.items() if key not in {"report_path", "instance_id"}}


@router.get("/{provider_name}/send/export/{job_id}")
def export_report(provider_name: str, job_id: str):
    p = provider(provider_name)
    job = _get_job(job_id)
    if not job or job.get("provider") != p or not job.get("report_path"):
        raise HTTPException(404, "گزارش هنوز آماده نیست")
    path = Path(job["report_path"])
    if not path.is_file() or path.parent != REPORTS:
        raise HTTPException(404, "گزارش پیدا نشد")
    return FileResponse(path, filename=path.name,
                        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
