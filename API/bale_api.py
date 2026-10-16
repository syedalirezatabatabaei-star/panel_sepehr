import io
import os
import random
import time
import threading
import uuid

from fastapi import (
    APIRouter,
    HTTPException,
    UploadFile,
    File,
    Form
)
from fastapi.responses import FileResponse

from pydantic import BaseModel

from openpyxl import load_workbook

from bale_backend import (
    bale_backend,
    run_bale
)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/api/bale",
    tags=["Bale"]
)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

UPLOAD_DIR = os.path.join(
    BASE_DIR,
    "data",
    "uploads"
)

os.makedirs(
    UPLOAD_DIR,
    exist_ok=True
)


# ============================================================
# EXCEL REPORT (خروجی اکسل نتایج ارسال)
# ============================================================

REPORT_DIR = "/root/bale_sender/reports"

os.makedirs(
    REPORT_DIR,
    exist_ok=True
)


def create_report(results, job_id=None):
    """
    ساخت فایل Excel از نتایج ارسال.
    سازگار با ساختار فعلی results در send_job_worker:
        phone, name, status, success, error
    و همچنین ساختار قدیمی:
        contact_status, message_status, message
    """
    from datetime import datetime
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill

    results = results or []
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    prefix = f"bale_report_{job_id}_" if job_id else "bale_report_"
    output_file = os.path.join(
        "/root/bale_sender/reports",
        f"{prefix}{stamp}.xlsx"
    )

    wb = Workbook()
    ws = wb.active
    ws.title = "جزئیات"

    headers = [
        "ردیف",
        "شماره",
        "نام",
        "وضعیت مخاطب",
        "وضعیت پیام",
        "توضیحات",
        "پیغام لحظه‌ای بله هنگام افزودن",
    ]
    ws.append(headers)

    header_fill = PatternFill("solid", fgColor="1F4E79")
    header_font = Font(color="FFFFFF", bold=True)
    for col in range(1, len(headers) + 1):
        cell = ws.cell(1, col)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(
            horizontal="center",
            vertical="center"
        )

    for i, row in enumerate(results, start=1):
        # نرمال‌سازی فیلدها (فرمت جدید + قدیمی)
        phone = row.get("phone") or row.get("number") or ""
        name = row.get("name") or ""

        if "contact_status" in row:
            contact_status = row.get("contact_status") or ""
        elif row.get("success"):
            contact_status = "success"
        elif row.get("error") and "پیدا نشد" in str(row.get("error")):
            contact_status = "not_registered"
        else:
            contact_status = "error" if not row.get("success") else "success"

        if "message_status" in row:
            message_status = row.get("message_status") or ""
        elif row.get("success") or str(row.get("status", "")).lower() in ("success", "sent"):
            message_status = "sent"
        else:
            message_status = "error"

        detail = (
            row.get("message")
            or row.get("error")
            or row.get("detail")
            or ""
        )

        ws.append([
            i,
            str(phone),
            str(name),
            str(contact_status),
            str(message_status),
            str(detail),
            str(row.get("ui_notification") or row.get("add_notification") or ""),
        ])

    for idx, width in enumerate([8, 16, 20, 18, 16, 40, 60], start=1):
        ws.column_dimensions[chr(64 + idx)].width = width

    # خلاصه
    summary = wb.create_sheet("خلاصه")
    total = len(results)
    contact_success = sum(
        1 for r in results
        if str(r.get("contact_status", "")).lower() == "success"
    )
    contact_not_added = sum(
        1 for r in results
        if str(r.get("contact_status", "")).lower() in (
            "not_added", "not_registered", "not-registered", "error",
            "add_confirmed_but_not_found"
        )
    )
    message_skipped = sum(
        1 for r in results
        if str(r.get("message_status", "")).lower() in ("skipped", "not_sent")
    )
    not_registered = sum(
        1 for r in results
        if str(r.get("contact_status", "")).lower() in (
            "not_registered", "not-registered", "not_added",
            "add_confirmed_but_not_found"
        )
        or (
            r.get("error")
            and "پیدا نشد" in str(r.get("error"))
        )
    )
    message_sent = sum(
        1 for r in results
        if str(r.get("message_status", "")).lower() in ("sent", "success")
        or (
            r.get("success") is True
            and str(r.get("status", "")).lower() in ("success", "sent")
        )
    )
    errors = sum(
        1 for r in results
        if (
            str(r.get("message_status", "")).lower() in ("error", "failed")
            or str(r.get("status", "")).lower() in ("failed", "error")
        )
    )

    summary.append(["عنوان", "مقدار"])
    summary["A1"].font = Font(bold=True)
    summary["B1"].font = Font(bold=True)
    summary.append(["کل مخاطبین", total])
    summary.append(["مخاطب موفق", contact_success])
    summary.append(["مخاطب افزوده/تأییدنشده", contact_not_added])
    summary.append(["ثبت‌نام‌نشده / پیدا نشد", not_registered])
    summary.append(["پیام ارسال‌شده", message_sent])
    summary.append(["پیام ارسال‌نشده / ردشده", message_skipped])
    summary.append(["خطا", errors])
    summary.append([
        "زمان ساخت گزارش",
        datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    ])
    if job_id:
        summary.append(["شناسه عملیات", job_id])

    summary.column_dimensions["A"].width = 32
    summary.column_dimensions["B"].width = 24

    wb.save(output_file)

    print("\n================================")
    print("FINAL REPORT")
    print("================================")
    print(f"Total: {total}")
    print(f"Contacts success-ish: {contact_success}")
    print(f"Not registered: {not_registered}")
    print(f"Messages sent: {message_sent}")
    print(f"Errors: {errors}")
    print(f"\nReport file:\n{output_file}")

    return output_file



# ============================================================
# LOGIN MODELS
# ============================================================

class BaleLoginRequest(BaseModel):
    phone: str


class BaleOtpRequest(BaseModel):
    otp: str
#===================================
#reset bale.acc.
#===================================
@router.post("/account/reset")
def reset_bale_account():

    try:

        run_bale(
            bale_backend.reset_bale_account
        )

        return {
            "success": True,
            "message": "حساب قبلی حذف شد."
        }


    except Exception as e:

        print(
            "[BALE RESET ERROR]",
            e
        )

        raise HTTPException(
            status_code=500,
            detail="خطا در حذف حساب."
        )
# ============================================================
# LOGIN
# ============================================================
@router.get("/account")
def bale_account():

    account = bale_backend.get_saved_account()

    if not account:

        return {
            "exists": False
        }


    return {
        "exists": True,
        "phone": account.get("phone")
    }
@router.post("/login")
def bale_login(
    data: BaleLoginRequest
):

    phone = data.phone.strip()

    if not phone:
        raise HTTPException(
            status_code=400,
            detail="شماره موبایل وارد نشده است."
        )

    print(
        f"[BALE API] Login request: {phone}"
    )

    try:

        run_bale(
            bale_backend.start_login,
            phone
        )

        return {
            "success": True,
            "message": "کد تایید ارسال شد."
        }

    except Exception as e:

        print(
            f"[BALE API] Login error: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail="خطا در ورود به بله."
        )

# ============================================================
# RESET BALE ACCOUNT
# ============================================================

@router.post("/reset")
def bale_reset():

    print(
        "[BALE API] Reset account request"
    )

    try:

        result = run_bale(
            bale_backend.reset_bale_account
        )

        return {
            "success": True,
            "message": "حساب بله پاک شد. لطفاً با شماره جدید وارد شوید."
        }


    except Exception as e:

        print(
            "[BALE API] Reset error:",
            e
        )

        raise HTTPException(
            status_code=500,
            detail="خطا در حذف حساب بله."
        )
# ============================================================
# VERIFY OTP
# ============================================================

@router.post("/verify")
def bale_verify(
    data: BaleOtpRequest
):

    otp = data.otp.strip()

    if not otp:
        raise HTTPException(
            status_code=400,
            detail="کد تایید وارد نشده است."
        )

    print(
        "[BALE API] OTP verification request"
    )

    try:

        authenticated = run_bale(
            bale_backend.verify_otp,
            otp
        )

        if not authenticated:

            raise HTTPException(
                status_code=401,
                detail="ورود به بله انجام نشد."
            )

        return {
            "success": True,
            "message": "ورود با موفقیت انجام شد."
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            f"[BALE API] OTP error: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail="خطا در تایید کد ورود."
        )


# ============================================================
# JOB STORAGE
# ============================================================

bale_jobs = {}

bale_jobs_lock = threading.Lock()


# ============================================================
# PHONE NORMALIZATION
# ============================================================

def normalize_phone(phone):

    if phone is None:
        return ""

    phone = str(phone).strip()

    phone = phone.replace(" ", "")
    phone = phone.replace("-", "")
    phone = phone.replace("(", "")
    phone = phone.replace(")", "")

    if phone.startswith("+98"):

        phone = "0" + phone[3:]

    elif phone.startswith("98"):

        phone = "0" + phone[2:]

    elif phone.startswith("9"):

        phone = "0" + phone

    return phone


# ============================================================
# READ EXCEL CONTACTS
# ============================================================

def read_excel_contacts(
    file_bytes
):

    print(
        "\n================================"
    )

    print(
        "[BALE API] READING EXCEL"
    )

    print(
        "================================"
    )

    print(
        f"[BALE API] Bytes received: "
        f"{len(file_bytes)}"
    )

    if not file_bytes:

        raise ValueError(
            "فایل Excel خالی است."
        )

    workbook = None

    try:

        workbook = load_workbook(
            filename=io.BytesIO(file_bytes),
            read_only=True,
            data_only=True
        )

        print(
            "[BALE API] Excel opened successfully."
        )

        sheet_names = workbook.sheetnames

        print(
            f"[BALE API] Sheet names: "
            f"{sheet_names}"
        )

        sheet = workbook.active

        print(
            f"[BALE API] Active sheet: "
            f"{sheet.title}"
        )

        rows = list(
            sheet.iter_rows(
                values_only=True
            )
        )

        print(
            f"[BALE API] Total rows read: "
            f"{len(rows)}"
        )

        if not rows:

            raise ValueError(
                "فایل Excel هیچ ردیفی ندارد."
            )

        # ====================================================
        # RAW PREVIEW
        # ====================================================

        print(
            "\n[BALE API] FIRST 5 RAW ROWS"
        )

        for index, row in enumerate(
            rows[:5],
            start=1
        ):

            print(
                f"ROW {index}: {row}"
            )

        # ====================================================
        # HEADERS
        # ====================================================

        headers = []

        for value in rows[0]:

            if value is None:

                headers.append("")

            else:

                header = str(
                    value
                ).strip().lower()

                header = (
                    header
                    .replace(" ", "")
                    .replace("_", "")
                )

                headers.append(
                    header
                )

        print(
            f"\n[BALE API] Headers: "
            f"{headers}"
        )

        # ====================================================
        # POSSIBLE PHONE HEADERS
        # ====================================================

        phone_names = {

            "phone",
            "mobile",
            "number",

            "شماره",
            "شمارهتلفن",
            "شمارهتماس",
            "شمارههمراه",
            "شماره‌همراه",
            "شماره موبایل",
            "شماره‌موبایل",
            "موبایل",
            "تلفن"
        }

        name_names = {

            "name",

            "نام",
            "ناممشتری",
            "نامونامخانوادگی",
            "نامونام‌خانوادگی",

            "customer",
            "customername"
        }

        phone_index = None
        name_index = None

        for index, header in enumerate(headers):

            if header in phone_names:
                phone_index = index

            if header in name_names:
                name_index = index

        print(
            f"[BALE API] Phone column index: "
            f"{phone_index}"
        )

        print(
            f"[BALE API] Name column index: "
            f"{name_index}"
        )

        # ====================================================
        # PHONE COLUMN REQUIRED
        # ====================================================

        if phone_index is None:

            print(
                "[BALE API] Phone column was NOT found."
            )

            print(
                "[BALE API] Available columns:"
            )

            for index, header in enumerate(headers):

                print(
                    f"    Column {index}: "
                    f"{repr(header)}"
                )

            raise ValueError(
                "ستون شماره موبایل در فایل Excel پیدا نشد."
            )

        # ====================================================
        # READ CONTACTS
        # ====================================================

        contacts = []

        for row_index, row in enumerate(
            rows[1:],
            start=2
        ):

            if not row:
                continue

            raw_phone = ""

            if phone_index < len(row):
                raw_phone = row[phone_index]

            print(
                f"[BALE API] "
                f"Row {row_index} "
                f"raw phone: "
                f"{repr(raw_phone)}"
            )

            phone = normalize_phone(
                raw_phone
            )

            if not phone:
                continue

            name = ""

            if (
                name_index is not None
                and name_index < len(row)
                and row[name_index] is not None
            ):

                name = str(
                    row[name_index]
                ).strip()

            contacts.append(
                {
                    "phone": phone,
                    "name": name
                }
            )

        print(
            f"\n[BALE API] Contacts found: "
            f"{len(contacts)}"
        )

        if contacts:

            print(
                "\n[BALE API] FIRST CONTACTS"
            )

            for index, contact in enumerate(
                contacts[:10],
                start=1
            ):

                print(
                    f"Contact {index}: "
                    f"phone="
                    f"{repr(contact['phone'])}, "
                    f"name="
                    f"{repr(contact['name'])}"
                )

        if not contacts:

            raise ValueError(
                "هیچ شماره‌ای در فایل Excel پیدا نشد."
            )

        return {
            "sheet_names": sheet_names,
            "active_sheet": sheet.title,
            "headers": headers,
            "rows_count": len(rows),
            "contacts": contacts
        }

    finally:

        if workbook is not None:

            workbook.close()

            print(
                "[BALE API] Excel workbook closed."
            )


# ============================================================
# SEND WORKER
# ============================================================

def send_job_worker(
    job_id,
    contacts,
    message,
    message_type="text",
    media_path=None
):

    print(
        f"[BALE JOB] Started: {job_id}"
    )

    total = len(contacts)

    # ========================================================
    # INITIAL JOB STATE
    # ========================================================

    with bale_jobs_lock:

        bale_jobs[job_id] = {

            "job_id": job_id,

            "status": "running",

            "total": total,

            "processed": 0,

            "successful": 0,

            "failed": 0,

            "progress": 0,

            "current": None,

            "results": [],

            "error": None
        }

    # ========================================================
    # PROCESS JOB
    # ========================================================

    def process_job():

        # ====================================================
        # STEP 1
        # OPEN BALE
        # ====================================================

        print(
            "\n================================"
        )

        print(
            "[BALE JOB] STEP 1 - OPEN BALE"
        )

        print(
            "================================"
        )

        bale_backend.open_bale()

        # ====================================================
        # STEP 2
        # CHECK AUTHENTICATION
        # ====================================================

        print(
            "\n================================"
        )

        print(
            "[BALE JOB] STEP 2 - CHECK AUTHENTICATION"
        )

        print(
            "================================"
        )

        authenticated = (
            bale_backend.is_authenticated()
        )

        print(
            f"[BALE JOB] Authenticated: "
            f"{authenticated}"
        )

        if not authenticated:

            raise RuntimeError(
                "حساب بله وارد نشده است."
            )

        # ====================================================
        # STEP 3
        # OPEN CONTACTS
        # ====================================================

        print(
            "\n================================"
        )

        print(
            "[BALE JOB] STEP 3 - OPEN CONTACTS"
        )

        print(
            "================================"
        )

        opened_contacts = (
            bale_backend.open_contacts()
        )

        print(
            f"[BALE JOB] Contacts opened: "
            f"{opened_contacts}"
        )

        if opened_contacts is False:

            raise RuntimeError(
                "امکان ورود به بخش مخاطبین بله وجود نداشت."
            )

        # STEP 4 - ADD CONTACTS
        # Only contacts with a fresh explicit add confirmation can be searched.
        print("\\n================================")
        print("[BALE JOB] STEP 4 - ADD CONTACTS")
        print("================================")
        print(f"[BALE JOB] Total contacts to add: {total}")

        add_results = {}
        for contact_index, contact in enumerate(contacts, start=1):
            phone = str(contact.get("phone", "")).strip()
            name = str(contact.get("name") or phone).strip()
            print(f"\\n[BALE JOB] ADD CONTACT {contact_index}/{total}: {phone} | {name}")
            try:
                # Pass the row number so the backend can capture the UI
                # immediately before and after clicking Add for contact 6.
                add_result = bale_backend.add_contact(phone, name, contact_index=contact_index)
                if not isinstance(add_result, dict):
                    add_result = {"success": add_result is True, "status": "success" if add_result is True else "unconfirmed", "message": "نتیجه افزودن مخاطب قابل‌تأیید نبود"}
            except Exception as add_error:
                print(f"[BALE JOB] ADD CONTACT ERROR {phone}: {add_error}")
                add_result = {"success": False, "status": "error", "message": str(add_error)}
            add_ok = add_result.get("success") is True and str(add_result.get("status", "")).lower() in ("success", "added", "confirmed")
            add_results[contact_index] = {
                "success": add_ok,
                "status": add_result.get("status") or ("success" if add_ok else "unconfirmed"),
                "message": add_result.get("message") or "",
                "ui_notification": add_result.get("ui_notification") or "",
            }
            # Results are keyed by contact index so duplicate phone numbers do not collide.
            print(f"[BALE JOB] ADD RESULT {phone}: {add_results[contact_index]}")
            # Save contact 6 screenshots in the job status so the UI can fetch them.
            if contact_index == 6:
                with bale_jobs_lock:
                    job = bale_jobs[job_id]
                    job["contact6_screenshot_before"] = add_result.get("screenshot_before_add")
                    job["contact6_screenshot_after"] = add_result.get("screenshot_after_add")
                    job["contact6_screenshot_error"] = (
                        None if add_result.get("screenshot_before_add") or add_result.get("screenshot_after_add")
                        else "Backend did not return contact 6 screenshots"
                    )

            if contact_index < total:
                time.sleep(random.uniform(1.0, 2.0))
        # ====================================================
        # STEP 5
        # SEND MESSAGES
        # ====================================================

        print(
            "\n================================"
        )

        print(
            "[BALE JOB] STEP 5 - SEND MESSAGES"
        )

        print(
            "================================"
        )

        for index, contact in enumerate(
            contacts,
            start=1
        ):

            phone = str(contact.get("phone", "")).strip()
            name = str(contact.get("name") or phone).strip()
            add_state = add_results.get(index, {"success": False, "status": "unconfirmed", "message": ""})
            result = {
                "phone": phone,
                "name": name,
                "contact_status": "success" if add_state.get("success") else "not_added",
                "contact_add_status": add_state.get("status", "unconfirmed"),
                "contact_add_detail": add_state.get("message", ""),
                "ui_notification": add_state.get("ui_notification", ""),
                "message_status": "skipped",
                "status": "skipped",
                "success": False,
                "error": None,
            }

            if not add_state.get("success"):
                result["error"] = "مخاطب اضافه/تأیید نشد؛ جست‌وجو و ارسال پیام انجام نشد. " + str(add_state.get("message") or add_state.get("status") or "")
                with bale_jobs_lock:
                    job = bale_jobs[job_id]
                    job["failed"] += 1
                    job["results"].append(result)
                    job["processed"] = index
                    job["current"] = phone
                    job["progress"] = int((index / total) * 100)
                print(f"[BALE JOB] SKIP SEARCH/SEND (add not confirmed): {phone}")
                continue

            try:

                # =================================================

                print(
                    "\n================================"
                )

                print(
                    "[BALE JOB] SEARCH CONTACT"
                )

                print(
                    "================================"
                )

                print(
                    f"[BALE JOB] "
                    f"Contact {index}/{total}"
                )
                print(
                    f"Contact name: {name}"
                )

                # Refresh before searching, only after confirmed add.
                try:
                    bale_backend.page.reload(wait_until="domcontentloaded", timeout=30000)
                    bale_backend.page.wait_for_timeout(1000)
                except Exception as refresh_error:
                    print("[BALE JOB] Refresh before search failed:", refresh_error)

                # Search by the label first; if Bale did not return it,
                # retry using the phone number, which is the stable identifier
                # from the uploaded contact list.
                found = bale_backend.search_contact(name)
                if not found and phone and phone != name:
                    print(f"[BALE JOB] Name search failed; retrying with phone: {phone}")
                    found = bale_backend.search_contact(phone)

                if not found:

                    result["contact_status"] = "add_confirmed_but_not_found"
                    result["error"] = "افزودن در رابط تأیید شد، اما مخاطب پس از جست‌وجو پیدا نشد؛ پیام ارسال نشد."
                    result["message_status"] = "not_sent"

                    with bale_jobs_lock:
                        job = bale_jobs[job_id]
                        job["failed"] += 1
                        job["results"].append(result)
                        job["processed"] = index
                        job["current"] = phone
                        job["progress"] = int((index / total) * 100)

                    continue

                print(
                    f"[BALE JOB] "
                    f"Contact found: {phone}"
                )

                # =================================================
                # OPEN CHAT
                # =================================================

                print(
                    "\n================================"
                )

                print(
                    "[BALE JOB] OPEN CONTACT CHAT"
                )

                print(
                    "================================"
                )

                # search_contact returns True only after selecting a result
                # and verifying that a chat is open. Do not click a second time.
                opened_chat = True

                if not opened_chat:

                    result["error"] = "امکان باز کردن چت وجود نداشت؛ پیام ارسال نشد."
                    result["message_status"] = "not_sent"

                    with bale_jobs_lock:
                        job = bale_jobs[job_id]
                        job["failed"] += 1
                        job["results"].append(result)
                        job["processed"] = index
                        job["current"] = phone
                        job["progress"] = int((index / total) * 100)

                    continue

                # =================================================
                # SEND MESSAGE
                # =================================================

                print(
                    "\n================================"
                )

                print(
                    "[BALE JOB] SEND MESSAGE"
                )

                print(
                    "================================"
                )

                # SEND MESSAGE / MEDIA
                if message_type == "text":
                    print("[BALE JOB] Sending TEXT message")
                    sent = bale_backend.send_message(message)

                elif message_type == "image":
                    print("[BALE JOB] Sending IMAGE")
                    sent = bale_backend.send_media(
                        media_path=media_path,
                        caption=message,
                        media_type="image"
                    )

                elif message_type == "video":
                    print("[BALE JOB] Sending VIDEO")
                    sent = bale_backend.send_media(
                        media_path=media_path,
                        caption=message,
                        media_type="video"
                    )

                else:
                    raise ValueError(f"نوع پیام نامعتبر است: {message_type}")               


                if not sent:

                    result["error"] = "ارسال پیام انجام نشد."
                    result["message_status"] = "failed"

                    with bale_jobs_lock:
                        job = bale_jobs[job_id]
                        job["failed"] += 1
                        job["results"].append(result)
                        job["processed"] = index
                        job["current"] = phone
                        job["progress"] = int((index / total) * 100)

                    continue

                # =================================================
                # SUCCESS
                # =================================================

                result["status"] = "success"
                result["message_status"] = "sent"
                result["success"] = True

                print(
                    f"[BALE JOB] SUCCESS → "
                    f"{phone}"
                )

                with bale_jobs_lock:

                    bale_jobs[
                        job_id
                    ]["successful"] += 1

            except Exception as e:

                print(
                    f"[BALE JOB] ERROR → "
                    f"{phone}: {e}"
                )

                result["error"] = str(e)
                result["status"] = "failed"
                result["message_status"] = "failed"

                with bale_jobs_lock:

                    bale_jobs[
                        job_id
                    ]["failed"] += 1

            finally:

                # =================================================
                # UPDATE PROGRESS
                # =================================================

                with bale_jobs_lock:

                    job = bale_jobs[
                        job_id
                    ]

                    job[
                        "results"
                    ].append(
                        result
                    )

                    job[
                        "processed"
                    ] = index

                    job[
                        "current"
                    ] = phone

                    job[
                        "progress"
                    ] = int(
                        (
                            index
                            / total
                        ) * 100
                    )

                # =================================================
                # DELAY
                # =================================================

                if index < total:

                    delay = random.uniform(
                        2.5,
                        5.0
                    )

                    print(
                        f"[BALE JOB] Sleeping "
                        f"{delay:.2f}s"
                    )

                    time.sleep(delay)

    # ========================================================
    # RUN PLAYWRIGHT JOB
    # ========================================================

    try:

        print(
            f"[BALE JOB] "
            f"Starting Playwright job: "
            f"{job_id}"
        )

        run_bale(
            process_job
        )

        with bale_jobs_lock:

            bale_jobs[
                job_id
            ]["current"] = None

            bale_jobs[
                job_id
            ]["processed"] = total

            bale_jobs[
                job_id
            ]["progress"] = 100

            bale_jobs[
                job_id
            ]["status"] = "completed"

            # ساخت خروجی اکسل گزارش
            try:
                report_path = create_report(
                    bale_jobs[job_id].get("results") or [],
                    job_id=job_id,
                )
                bale_jobs[job_id]["report_file"] = report_path
            except Exception as report_error:
                print(
                    "[BALE JOB] REPORT ERROR:",
                    report_error
                )
                bale_jobs[job_id]["report_file"] = None

        print(
            f"[BALE JOB] Completed: "
            f"{job_id}"
        )

    except Exception as e:

        print(
            f"[BALE JOB] "
            f"FATAL ERROR: {e}"
        )

        with bale_jobs_lock:

            if job_id in bale_jobs:

                bale_jobs[
                    job_id
                ]["status"] = "failed"

                bale_jobs[
                    job_id
                ]["error"] = str(e)


# ============================================================
# START SEND
# ============================================================

@router.post("/send")
async def bale_send_messages(
    file: UploadFile = File(...),
    message: str = Form(...),
    message_type: str = Form("text"),
    media: UploadFile | None = File(None)
):

    print(
        "\n================================"
    )

    print(
        "[BALE API] FILE UPLOAD"
    )

    message_type = message_type.strip().lower()

    if message_type not in {"text", "image", "video"}:
        raise HTTPException(
            status_code=400,
            detail="نوع پیام نامعتبر است."
        )

    print(f"[BALE API] Message type: {message_type}")

    print(
        "================================"
    )

    # ========================================================
    # VALIDATE MESSAGE
    # ========================================================
    
    message = (
        message.strip()
        if message
        else ""
    )



    if message_type == "text" and not message:

        raise HTTPException(
            status_code=400,
            detail="متن پیام وارد نشده است."
        )
    
    # ========================================================
    # VALIDATE FILE
    # ========================================================

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="فایل Excel انتخاب نشده است."
        )

    if not file.filename.lower().endswith(
        (
            ".xlsx",
            ".xlsm"
        )
    ):

        raise HTTPException(
            status_code=400,
            detail="فقط فایل Excel مجاز است."
        )

    print(
        f"[BALE API] Filename: "
        f"{file.filename}"
    )

    print(
        f"[BALE API] Content-Type: "
        f"{file.content_type}"
    )

    # ========================================================
    # MEDIA FILE
    # ========================================================

    media_path = None
    media_file_exists = False
    media_file_size = 0


    if message_type in {
        "image",
        "video"
    }:

        # ---------------------------------------------
        # Media is required
        # ---------------------------------------------

        if media is None:

            raise HTTPException(
                status_code=400,
                detail=(
                    "برای ارسال تصویر یا ویدیو، "
                    "فایل رسانه انتخاب نشده است."
                )
            )


        if not media.filename:

            raise HTTPException(
                status_code=400,
                detail="فایل رسانه نامعتبر است."
            )


        # ---------------------------------------------
        # Extension
        # ---------------------------------------------

        media_extension = os.path.splitext(
            media.filename
        )[1].lower()


        image_extensions = {
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
            ".gif",
            ".bmp"
        }


        video_extensions = {
            ".mp4",
            ".webm",
            ".mov",
            ".mkv",
            ".avi",
            ".m4v"
        }


        if (
            message_type == "image"
            and media_extension not in image_extensions
        ):

            raise HTTPException(
                status_code=400,
                detail="فرمت فایل تصویر مجاز نیست."
            )


        if (
            message_type == "video"
            and media_extension not in video_extensions
        ):

            raise HTTPException(
                status_code=400,
                detail="فرمت فایل ویدیو مجاز نیست."
            )


        # ---------------------------------------------
        # Read media
        # ---------------------------------------------

        try:

            media_bytes = await media.read()


            if not media_bytes:

                raise ValueError(
                    "فایل رسانه خالی است."
                )


        except Exception as e:

            print(
                "[BALE API] Media read error:",
                e
            )

            raise HTTPException(
                status_code=400,
                detail=(
                    f"خطا در دریافت فایل رسانه: {e}"
                )
            )


        # ---------------------------------------------
        # Save media
        # ---------------------------------------------

        try:

            media_saved_filename = (
                f"{uuid.uuid4()}"
                f"{media_extension}"
            )


            media_path = os.path.join(
                UPLOAD_DIR,
                media_saved_filename
            )


            with open(
                media_path,
                "wb"
            ) as output_file:

                output_file.write(
                    media_bytes
                )


            media_file_exists = os.path.exists(
                media_path
            )


            media_file_size = (
                os.path.getsize(
                    media_path
                )
                if media_file_exists
                else 0
            )


            print(
                "\n================================"
            )

            print(
                "[BALE API] MEDIA SAVED"
            )

            print(
                "================================"
            )

            print(
                f"Type: {message_type}"
            )

            print(
                f"Original name: "
                f"{media.filename}"
            )

            print(
                f"Path: "
                f"{media_path}"
            )

            print(
                f"Exists: "
                f"{media_file_exists}"
            )

            print(
                f"Size: "
                f"{media_file_size} bytes"
            )


        except Exception as e:

            print(
                "[BALE API] "
                f"Media save error: {e}"
            )

            raise HTTPException(
                status_code=500,
                detail=(
                    "خطا در ذخیره فایل رسانه "
                    "روی سرور."
                )
            )
    # ========================================================
    # READ UPLOADED FILE
    # ========================================================

    try:

        file_bytes = await file.read()

        print(
            f"[BALE API] Uploaded file size: "
            f"{len(file_bytes)} bytes"
        )

        if not file_bytes:

            raise ValueError(
                "فایل خالی دریافت شد."
            )

    except Exception as e:

        print(
            f"[BALE API] File read error: "
            f"{e}"
        )

        raise HTTPException(
            status_code=400,
            detail=f"خطا در دریافت فایل: {e}"
        )

    # ========================================================
    # SAVE FILE ON SERVER
    # ========================================================

    try:

        original_extension = (
            os.path.splitext(
                file.filename
            )[1]
        )

        saved_filename = (
            f"{uuid.uuid4()}"
            f"{original_extension}"
        )

        saved_path = os.path.join(
            UPLOAD_DIR,
            saved_filename
        )

        with open(
            saved_path,
            "wb"
        ) as output_file:

            output_file.write(
                file_bytes
            )

        file_exists = os.path.exists(
            saved_path
        )

        file_size_on_disk = (
            os.path.getsize(
                saved_path
            )
            if file_exists
            else 0
        )

        print(
            "[BALE API] FILE SAVED ON SERVER"
        )

        print(
            f"    Path: "
            f"{saved_path}"
        )

        print(
            f"    Exists: "
            f"{file_exists}"
        )

        print(
            f"    Size: "
            f"{file_size_on_disk} bytes"
        )

    except Exception as e:

        print(
            f"[BALE API] "
            f"File save error: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "خطا در ذخیره فایل "
                "روی سرور."
            )
        )

    # ========================================================
    # READ EXCEL
    # ========================================================

    try:

        excel_data = (
            read_excel_contacts(
                file_bytes
            )
        )

        contacts = excel_data[
            "contacts"
        ]

    except ValueError as e:

        print(
            f"[BALE API] "
            f"Excel validation error: {e}"
        )

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

    except Exception as e:

        print(
            "[BALE API] "
            "Excel read error"
        )

        print(
            f"    Type: "
            f"{type(e).__name__}"
        )

        print(
            f"    Error: "
            f"{e}"
        )

        raise HTTPException(
            status_code=400,
            detail=(
                "خطا در خواندن "
                "فایل Excel."
            )
        )

    # ========================================================
    # CREATE JOB
    # ========================================================

    job_id = str(
        uuid.uuid4()
    )

    with bale_jobs_lock:

        bale_jobs[job_id] = {

            "job_id": job_id,

            "status": "starting",

            "total": len(contacts),

            "processed": 0,

            "successful": 0,

            "failed": 0,

            "progress": 0,

            "current": None,

            "results": [],

            "error": None
        }

    # ========================================================
    # START WORKER
    # ========================================================
    worker = threading.Thread(
        target=send_job_worker,
        args=(
            job_id,
            contacts,
            message,
            message_type,
            media_path
        ),
        daemon=True
    )

    worker.start()

    # ========================================================
    # RESPONSE
    # ========================================================

    print(
        "\n================================"
    )

    print(
        "[BALE API] FILE + EXCEL SUCCESS"
    )

    print(
        "================================"
    )

    print(
        f"Filename: "
        f"{file.filename}"
    )

    print(
        f"Saved path: "
        f"{saved_path}"
    )

    print(
        f"Rows: "
        f"{excel_data['rows_count']}"
    )

    print(
        f"Contacts: "
        f"{len(contacts)}"
    )

    print(
        f"Job ID: "
        f"{job_id}"
    )

    print(
        "================================"
    )

    return {

        "success": True,

        "job_id": job_id,

        "total": len(contacts),

        "message": "ارسال شروع شد.",

        "file": {

            "original_name": file.filename,

            "content_type": file.content_type,

            "size": len(file_bytes),

            "saved_path": saved_path,

            "exists_on_server": file_exists,

            "size_on_disk": file_size_on_disk
        },

        "excel": {

            "sheet_names": (
                excel_data["sheet_names"]
            ),

            "active_sheet": (
                excel_data["active_sheet"]
            ),

            "headers": (
                excel_data["headers"]
            ),

            "rows_count": (
                excel_data["rows_count"]
            ),

            "contacts_count": (
                len(contacts)
            ),

            "preview": contacts[:10]
        }
    }


# ============================================================
# SEND STATUS
# ============================================================

@router.get(
    "/send/status/{job_id}"
)
def bale_send_status(
    job_id: str
):

    with bale_jobs_lock:

        job = bale_jobs.get(
            job_id
        )

        if not job:

            raise HTTPException(
                status_code=404,
                detail=(
                    "عملیات ارسال "
                    "پیدا نشد."
                )
            )

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

            "results": job["results"],

            "error": job.get("error"),

            "report_file": job.get("report_file"),

            "has_report": bool(job.get("report_file")),

            "contact6_screenshot_before_url": (
                f"/api/bale/send/screenshot/{job_id}/before"
                if job.get("contact6_screenshot_before") and os.path.exists(job["contact6_screenshot_before"])
                else None
            ),
            "contact6_screenshot_after_url": (
                f"/api/bale/send/screenshot/{job_id}/after"
                if job.get("contact6_screenshot_after") and os.path.exists(job["contact6_screenshot_after"])
                else None
            ),
            "contact6_screenshot_error": job.get("contact6_screenshot_error")
        }


@router.get("/send/screenshot/{job_id}/{stage}")
def bale_send_screenshot(job_id: str, stage: str):
    if stage not in ("before", "after"):
        raise HTTPException(status_code=400, detail="مرحله اسکرین‌شات نامعتبر است.")

    key = "contact6_screenshot_before" if stage == "before" else "contact6_screenshot_after"
    with bale_jobs_lock:
        job = bale_jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="عملیات ارسال پیدا نشد.")
        screenshot_file = job.get(key)

    if not screenshot_file or not os.path.isfile(screenshot_file):
        raise HTTPException(status_code=404, detail=f"اسکرین‌شات مخاطب ۶ ({stage}) موجود نیست.")

    return FileResponse(
        screenshot_file,
        media_type="image/png",
        filename=f"bale_contact6_{stage}_{job_id}.png"
    )


# ============================================================
# DOWNLOAD EXCEL REPORT
# ============================================================

@router.get("/send/export/{job_id}")
def bale_send_export(job_id: str):

    with bale_jobs_lock:
        job = bale_jobs.get(job_id)

        if not job:
            raise HTTPException(
                status_code=404,
                detail="عملیات ارسال پیدا نشد."
            )

        report_file = job.get("report_file")

    if not report_file or not os.path.exists(report_file):
        raise HTTPException(
            status_code=404,
            detail="گزارش اکسل هنوز آماده نیست یا پیدا نشد."
        )

    filename = os.path.basename(report_file)

    return FileResponse(
        path=report_file,
        filename=filename,
        media_type=(
            "application/vnd.openxmlformats-"
            "officedocument.spreadsheetml.sheet"
        ),
    )
