import os
import shutil
from concurrent.futures import ThreadPoolExecutor
from playwright.sync_api import sync_playwright

from pages.bale_page import BalePage
from pages.login_page import LoginPage


BALE_EXECUTOR = ThreadPoolExecutor(
    max_workers=1,
    thread_name_prefix="bale-playwright"
)


def run_bale(func, *args, **kwargs):
    future = BALE_EXECUTOR.submit(
        func,
        *args,
        **kwargs
    )

    return future.result()


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

BROWSER_PROFILE = os.path.join(
    BASE_DIR,
    "browser_profile"
)

CHROMIUM_PATH = "/usr/bin/chromium"


class BaleBackend:

    def __init__(self):

        self.playwright = None
        self.context = None
        self.page = None

        self.bale = None
        self.login = None

        print("[BALE] Backend initialized.")


    # =====================================================
    # Session
    # =====================================================

    def clear_bale_session(self):

        if self.context is not None:
            raise RuntimeError(
                "Cannot clear Bale session while browser is running."
            )

        if os.path.exists(BROWSER_PROFILE):

            shutil.rmtree(
                BROWSER_PROFILE
            )

            print(
                "[BALE] Previous browser session deleted."
            )

        os.makedirs(
            BROWSER_PROFILE,
            exist_ok=True
        )


    # =====================================================
    # Browser
    # =====================================================

    def start_browser(self):

        if self.context is not None:
            return


        os.makedirs(
            BROWSER_PROFILE,
            exist_ok=True
        )


        print("[BALE] Starting Playwright...")

        self.playwright = sync_playwright().start()


        self.context = (
            self.playwright.chromium.launch_persistent_context(
                user_data_dir=BROWSER_PROFILE,
                executable_path=CHROMIUM_PATH,
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu"
                ]
            )
        )


        if self.context.pages:

            self.page = self.context.pages[0]

        else:

            self.page = self.context.new_page()



        self.bale = BalePage(
            self.page
        )

        self.login = LoginPage(
            self.page
        )


        print(
            "[BALE] Browser started."
        )



    # =====================================================
    # Open Bale
    # =====================================================

    def open_bale(self):

        self.start_browser()

        self.bale.open_bale()



    # =====================================================
    # Authentication
    # =====================================================

    def is_authenticated(self):

        if self.bale is None:
            return False


        try:

            return self.bale.is_authenticated()


        except Exception as e:

            print(e)

            return False



    # =====================================================
    # Login
    # =====================================================

    def start_login(
        self,
        phone: str
    ):

        phone = phone.strip()


        if not phone:

            raise ValueError(
                "Phone number is empty."
            )


        self.start_browser()


        self.login.open()


        self.login.click_login()


        self.login.enter_phone(
            phone
        )


        self.login.submit_phone()


        return True



    # =====================================================
    # OTP
    # =====================================================

    def verify_otp(
        self,
        otp: str
    ):

        otp = otp.strip()


        if not otp:

            raise ValueError(
                "OTP is empty."
            )


        if self.login is None:

            raise RuntimeError(
                "Login not initialized."
            )


        self.login.enter_otp(
            otp
        )


        self.login.submit_otp()


        self.page.wait_for_timeout(
            3000
        )


        self.bale = BalePage(
            self.page
        )


        return self.is_authenticated()



    # =====================================================
    # Contacts
    # =====================================================

    def open_contacts(self):

        if self.bale is None:

            raise RuntimeError(
                "Bale not initialized."
            )


        return self.bale.open_contacts()



    # =====================================================
    # Add Contact
    # =====================================================

    def add_contact(
        self,
        phone: str,
        name: str
    ):


        if self.bale is None:

            raise RuntimeError(
                "Bale not initialized."
            )


        return self.bale.add_contact(
            phone,
            name
        )



    # =====================================================
    # Search Contact
    # =====================================================

    def search_contact(
        self,
        phone
    ):


        original_phone = str(phone).strip()


        search_phone = original_phone


        if not search_phone.startswith("0"):

            search_phone = "0" + search_phone



        self.page.goto(
            "https://web.bale.ai/contacts",
            wait_until="domcontentloaded"
        )


        self.page.wait_for_timeout(
            1500
        )


        search_icon = self.page.locator(
            'svg[aria-label="Search-icon"]'
        ).first


        search_icon.wait_for(
            state="visible",
            timeout=10000
        )


        try:

            search_icon.click()

        except:

            search_icon.click(
                force=True
            )



        search_input = self.page.locator(
            'input[type="search"]'
        ).first


        search_input.wait_for(
            state="visible",
            timeout=10000
        )


        search_input.fill(
            search_phone
        )


        search_input.press(
            "Enter"
        )


        self.page.wait_for_timeout(
            3000
        )


        body = self.page.locator(
            "body"
        ).inner_text()



        if search_phone in body:

            return True


        if original_phone in body:

            return True



        return False



    # =====================================================
    # Chat
    # =====================================================

    def open_contact_chat(
        self,
        name: str
    ):

        if self.bale is None:

            raise RuntimeError(
                "Bale not initialized."
            )


        return self.bale.open_contact_chat(
            name
        )



    # =====================================================
    # Send Message
    # =====================================================

    def send_message(
        self,
        message: str
    ):


        if self.bale is None:

            raise RuntimeError(
                "Bale not initialized."
            )


        message = message.strip()


        if not message:

            raise ValueError(
                "Message is empty."
            )



        return self.bale.send_message(
            message
        )



    # =====================================================
    # Close
    # =====================================================

    def close(self):

        print(
            "[BALE] Closing..."
        )


        try:

            if self.context:

                self.context.close()


        except Exception as e:

            print(e)


        self.context = None
        self.page = None
        self.bale = None
        self.login = None



        try:

            if self.playwright:

                self.playwright.stop()


        except Exception as e:

            print(e)



        self.playwright = None



        print(
            "[BALE] Closed."
        )



# =========================================================
# Global Backend
# =========================================================

bale_backend = BaleBackend()
