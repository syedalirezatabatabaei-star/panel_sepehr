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
# LOGIN MODELS
# ============================================================

class BaleLoginRequest(BaseModel):
    phone: str


class BaleOtpRequest(BaseModel):
    otp: str


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
    message
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

        # ====================================================
        # STEP 4
        # ADD ALL CONTACTS
        # ====================================================

        print(
            "\n================================"
        )

        print(
            "[BALE JOB] STEP 4 - ADD CONTACTS"
        )

        print(
            "================================"
        )

        print(
            f"[BALE JOB] Total contacts to add: "
            f"{total}"
        )

        for contact_index, contact in enumerate(
            contacts,
            start=1
        ):

            phone = contact["phone"]

            name = (
                contact.get("name")
                or phone
            )

            print(
                "\n--------------------------------"
            )

            print(
                f"[BALE JOB] ADD CONTACT "
                f"{contact_index}/{total}"
            )

            print(
                f"[BALE JOB] Phone: {phone}"
            )

            print(
                f"[BALE JOB] Name: {name}"
            )

            try:

                add_result = (
                    bale_backend.add_contact(
                        phone,
                        name
                    )
                )

                print(
                    f"[BALE JOB] ADD RESULT: "
                    f"{add_result}"
                )

                if add_result is False:

                    print(
                        f"[BALE JOB] "
                        f"Contact add returned False: "
                        f"{phone}"
                    )

            except Exception as e:

                print(
                    f"[BALE JOB] "
                    f"ADD CONTACT ERROR → "
                    f"{phone}: {e}"
                )

                # اگر افزودن مخاطب شکست خورد،
                # اجرای ارسال متوقف نمی‌شود.
                # ممکن است مخاطب از قبل وجود داشته باشد.
                # مرحله SEARCH بعداً مشخص می‌کند قابل دسترسی هست یا نه.

            # =================================================
            # SMALL DELAY BETWEEN CONTACTS
            # =================================================

            if contact_index < total:

                delay = random.uniform(
                    1.0,
                    2.0
                )

                print(
                    f"[BALE JOB] "
                    f"Sleeping after add "
                    f"{delay:.2f}s"
                )

                time.sleep(delay)

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

            phone = contact["phone"]

            name = (
                contact.get("name")
                or phone
            )

            result = {

                "phone": phone,

                "name": name,

                "status": "failed",

                "success": False,

                "error": None
            }

            try:

                # =================================================
                # SEARCH
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
                    f"Original phone: {phone}"
                )

                print(
                    f"Search phone: {phone}"
                )

                found = (
                    bale_backend.search_contact(
                        phone
                    )
                )

                if not found:

                    result["error"] = (
                        "مخاطب پیدا نشد."
                    )

                    with bale_jobs_lock:

                        bale_jobs[
                            job_id
                        ]["failed"] += 1

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

                opened_chat = (
                    bale_backend.open_contact_chat(
                        name
                    )
                )

                if not opened_chat:

                    result["error"] = (
                        "امکان باز کردن چت وجود نداشت."
                    )

                    with bale_jobs_lock:

                        bale_jobs[
                            job_id
                        ]["failed"] += 1

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

                sent = (
                    bale_backend.send_message(
                        message
                    )
                )

                if not sent:

                    result["error"] = (
                        "ارسال پیام انجام نشد."
                    )

                    with bale_jobs_lock:

                        bale_jobs[
                            job_id
                        ]["failed"] += 1

                    continue

                # =================================================
                # SUCCESS
                # =================================================

                result["status"] = "success"

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
    message: str = Form(...)
):

    print(
        "\n================================"
    )

    print(
        "[BALE API] FILE UPLOAD"
    )

    print(
        "================================"
    )

    # ========================================================
    # VALIDATE MESSAGE
    # ========================================================

    if not message.strip():

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
            message.strip()
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

            "error": job.get("error")
        }
