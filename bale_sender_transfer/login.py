from pathlib import Path

from playwright.sync_api import sync_playwright

from pages.login_page import LoginPage


BASE_DIR = Path("/root/bale_sender")
SESSION_FILE = BASE_DIR / "bale_session.json"


def main():

    print("================================")
    print("Bale Login")
    print("================================")

    phone = input("شماره همراه را وارد کنید: ").strip()

    with sync_playwright() as p:

        browser = p.chromium.launch(
            executable_path="/usr/bin/chromium-browser",
            headless=True,
            args=["--no-sandbox"]
        )

        context = browser.new_context()

        page = context.new_page()

        login = LoginPage(page)

        print("\nOpening Bale...")

        page.goto(
            "https://web.bale.ai",
            wait_until="domcontentloaded"
        )

        page.wait_for_timeout(2000)

        if login.is_login_page():

            print("Login page detected.")

            login.close_install_guide()

            login.click_login()

            print("Phone page detected.")

            login.enter_phone(phone)

            print("Phone entered.")

            login.submit_phone()

            print("OTP requested.")

            otp = input("\nکد ورود را وارد کنید: ").strip()

            login.enter_otp(otp)

            print("OTP entered.")

            login.submit_otp()

            print("Waiting for Bale login...")

            try:

                page.wait_for_url(
                    "**/chat**",
                    timeout=15000
                )

            except Exception:

                print("URL did not change to /chat immediately.")

            page.wait_for_timeout(3000)

        else:

            print("Unexpected page detected.")

        print("\nURL:", page.url)
        print("TITLE:", page.title())

        # فقط در صورت Login واقعی Session را ذخیره کن
        if page.url.startswith("https://web.bale.ai/chat"):

            context.storage_state(
                path=str(SESSION_FILE)
            )

            print("\nSession saved successfully:")
            print(SESSION_FILE)

        else:

            print("\nERROR: Login was not confirmed.")
            print("Session file was NOT overwritten.")

        print("\nBODY:")
        print(page.locator("body").inner_text())

        context.close()
        browser.close()


if __name__ == "__main__":
    main()
