import os
from datetime import datetime

import pandas as pd
from playwright.sync_api import sync_playwright

from pages.bale_page import BalePage


BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

BROWSER_PROFILE = os.path.join(
    BASE_DIR,
    "browser_profile"
)

REPORT_DIR = os.path.join(
    BASE_DIR,
    "reports"
)

EXCEL_FILE = os.path.join(
    BASE_DIR,
    "contacts.xlsx"
)

# پیام مورد نظر
MESSAGE = """
سلام وقت بخیر

این یک پیام آزمایشی از سیستم ارسال پیام بله است.

با تشکر
"""


def read_contacts():
    print("\nReading Excel...")

    if not os.path.exists(EXCEL_FILE):
        raise FileNotFoundError(
            f"Excel file not found: {EXCEL_FILE}"
        )

    df = pd.read_excel(EXCEL_FILE)

    required_columns = [
        "phone",
        "name"
    ]

    for column in required_columns:
        if column not in df.columns:
            raise ValueError(
                f"Column '{column}' not found in Excel."
            )

    df = df[
        required_columns
    ].copy()

    df["phone"] = (
        df["phone"]
        .astype(str)
        .str.replace(
            ".0",
            "",
            regex=False
        )
        .str.strip()
    )

    df["name"] = (
        df["name"]
        .astype(str)
        .str.strip()
    )

    print(
        f"Contacts found: {len(df)}"
    )

    return df


def create_report(results):
    print("\n================================")
    print("CREATING REPORT")
    print("================================")

    os.makedirs(
        REPORT_DIR,
        exist_ok=True
    )

    timestamp = datetime.now().strftime(
        "%Y%m%d_%H%M%S"
    )

    output_file = os.path.join(
        REPORT_DIR,
        f"contacts_report_{timestamp}.xlsx"
    )

    report_df = pd.DataFrame(
        results
    )

    report_df.to_excel(
        output_file,
        index=False
    )

    return output_file


def main():

    print("================================")
    print("BALE CONTACT IMPORTER")
    print("================================")

    contacts = read_contacts()

    results = []

    print("\nStarting browser...")
    print(
        f"Browser profile:\n{BROWSER_PROFILE}"
    )

    with sync_playwright() as p:

        context = p.chromium.launch_persistent_context(
            user_data_dir=BROWSER_PROFILE,
            executable_path="/usr/bin/chromium-browser",
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu"
            ]
        )

        page = (
            context.pages[0]
            if context.pages
            else context.new_page()
        )

        bale = BalePage(page)

        try:

            # =========================
            # OPEN BALE
            # =========================

            bale.open_bale()

            if not bale.is_authenticated():
                print("\nERROR:")
                print(
                    "Bale Web is NOT authenticated."
                )
                print(
                    "Please login first."
                )
                return

            print(
                "\nBale Web is authenticated."
            )

            # =========================
            # OPEN CONTACTS
            # =========================

            bale.open_contacts()

            # =========================
            # PROCESS CONTACTS
            # =========================

            for index, row in contacts.iterrows():

                phone = str(
                    row["phone"]
                ).strip()

                name = str(
                    row["name"]
                ).strip()

                print("\n================================")
                print(
                    f"CONTACT {index + 1}/"
                    f"{len(contacts)}"
                )
                print("================================")

                print(
                    f"Phone: {phone}"
                )

                print(
                    f"Name: {name}"
                )

                result = bale.add_contact(
                    phone=phone,
                    name=name
                )

                status = result.get(
                    "status",
                    "unknown"
                )

                message = result.get(
                    "message",
                    ""
                )

                print(
                    f"\nRESULT: {status}"
                )

                print(
                    f"MESSAGE: {message}"
                )

                # -------------------------
                # NOT REGISTERED
                # -------------------------

                if status == "not_registered":

                    results.append({
                        "phone": phone,
                        "name": name,
                        "contact_status":
                            "not_registered",
                        "message_status":
                            "not_sent",
                        "message": message
                    })

                    print(
                        "Not registered. "
                        "Moving to next contact..."
                    )

                    continue

                # -------------------------
                # ADD CONTACT ERROR
                # -------------------------

                if status != "success":

                    results.append({
                        "phone": phone,
                        "name": name,
                        "contact_status":
                            "error",
                        "message_status":
                            "not_sent",
                        "message": message
                    })

                    print(
                        "Contact error. "
                        "Moving to next contact..."
                    )

                    continue

                # -------------------------
                # OPEN CHAT
                # -------------------------

                print(
                    "\nOpening contact chat..."
                )

                opened = bale.open_contact_chat(
                    name
                )

                if not opened:

                    results.append({
                        "phone": phone,
                        "name": name,
                        "contact_status":
                            "success",
                        "message_status":
                            "error",
                        "message":
                            "Could not open chat"
                    })

                    print(
                        "Could not open chat."
                    )

                    continue

                # -------------------------
                # SEND MESSAGE
                # -------------------------

                message = "سلام وقت بخیر\nاین یک پیام آزمایشی است."

                print("\nSending message...")

                message_sent = bale.send_message(message)

                if message_sent:
                    result["status"] = "message_sent"
                    result["message"] = "پیام با موفقیت ارسال شد"

                    print("[SUCCESS] Message sent.")

                else:
                    result["status"] = "message_error"
                    result["message"] = "ارسال پیام ناموفق بود"

                    print("[ERROR] Message not sent.")

                print("\nMoving to next contact...")
                # -------------------------
                # NEXT CONTACT
                # -------------------------

                print(
                    "\nMoving to next contact..."
                )

                # برگشت به صفحه مخاطبین
                try:
                    bale.open_contacts()
                except Exception as e:
                    print(
                        f"Could not reopen contacts: {e}"
                    )

            # =========================
            # REPORT
            # =========================

            output_file = create_report(
                results
            )

            print("\n================================")
            print("FINAL REPORT")
            print("================================")

            total = len(results)

            contact_success = sum(
                1
                for r in results
                if r["contact_status"]
                == "success"
            )

            not_registered = sum(
                1
                for r in results
                if r["contact_status"]
                == "not_registered"
            )

            message_sent = sum(
                1
                for r in results
                if r["message_status"]
                == "sent"
            )

            errors = sum(
                1
                for r in results
                if r["message_status"]
                == "error"
            )

            print(
                f"Total: {total}"
            )

            print(
                f"Contacts added: "
                f"{contact_success}"
            )

            print(
                f"Not registered: "
                f"{not_registered}"
            )

            print(
                f"Messages sent: "
                f"{message_sent}"
            )

            print(
                f"Message errors: "
                f"{errors}"
            )

            print(
                f"\nReport file:\n"
                f"{output_file}"
            )

        except Exception as e:

            print("\n================================")
            print("ERROR")
            print("================================")

            print(
                type(e).__name__
            )

            print(e)

        finally:

            print(
                "\nClosing browser..."
            )

            context.close()


if __name__ == "__main__":
    main()
