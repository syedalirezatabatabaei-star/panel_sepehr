"""Shared Excel and phone utilities for Bale Super (BaleLink) API.

This module deliberately contains no browser or Playwright code.
"""
import io
import os
from openpyxl import load_workbook

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPORT_DIR = os.getenv(
    "BALE_SUPER_REPORT_DIR",
    os.path.join(BASE_DIR, "data", "bale-super-reports"),
)
os.makedirs(REPORT_DIR, exist_ok=True)


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
        REPORT_DIR,
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
        "پیغام لحظه‌ای بله هنگام افزودن",
        "وضعیت پیام",
        "توضیحات",
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
            str(row.get("ui_notification") or row.get("add_notification") or ""),
            str(message_status),
            str(detail),
        ])

    for idx, width in enumerate([8, 16, 20, 18, 60, 16, 40], start=1):
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
        seen_phones = set()

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

            # Deduplicate by normalized phone so a contact repeated in the
            # uploaded spreadsheet is added/searched/messaged only once.
            if phone in seen_phones:
                print(f"[BALE API] Row {row_index}: duplicate phone {phone}; skipping.")
                continue
            seen_phones.add(phone)

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
