
import os
import shutil
from concurrent.futures import ThreadPoolExecutor
from playwright.sync_api import sync_playwright

from pages.bale_page import BalePage
from pages.login_page import LoginPage

#shger
BALE_EXECUTOR = ThreadPoolExecutor(
    max_workers=1,
    thread_name_prefix="bale-playwright"
)


def run_bale(func, *args, **kwargs):
    """
    اجرای تمام عملیات Playwright روی یک thread ثابت.
    """
    future = BALE_EXECUTOR.submit(
        func,
        *args,
        **kwargs
    )

    return future.result()
# =========================================================
# Paths
# =========================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

BROWSER_PROFILE = os.path.join(
    BASE_DIR,
    "browser_profile"
)

# Chromium installed inside Docker
CHROMIUM_PATH = "/usr/bin/chromium"


# =========================================================
# Bale Backend
# =========================================================

class BaleBackend:

    def __init__(self):

        # Playwright is NOT started here.
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

        """
        Delete previous Bale browser profile.

        This method must only be called when
        browser/context is not running.
        """

        if self.context is not None:
            raise RuntimeError(
                "Cannot clear Bale session while browser is running."
            )

        if os.path.exists(BROWSER_PROFILE):

            try:

                shutil.rmtree(BROWSER_PROFILE)

                print(
                    "[BALE] Previous browser session deleted."
                )

            except Exception as e:

                print(
                    f"[BALE] Failed to delete browser session: {e}"
                )

                raise

        os.makedirs(
            BROWSER_PROFILE,
            exist_ok=True
        )

        print(
            "[BALE] New browser session ready."
        )

    # =====================================================
    # Browser
    # =====================================================

    def start_browser(self):

        """
        Start Playwright + Chromium.
        """

        if self.context is not None:

            print(
                "[BALE] Browser is already running."
            )

            return

        print(
            "[BALE] Starting Playwright..."
        )

        self.playwright = sync_playwright().start()

        print(
            f"[BALE] Starting Chromium: {CHROMIUM_PATH}"
        )

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

        # Use existing page if available
        if self.context.pages:

            self.page = self.context.pages[0]

        else:

            self.page = self.context.new_page()

        # Page Objects
        self.bale = BalePage(
            self.page
        )

        self.login = LoginPage(
            self.page
        )

        print(
            "[BALE] Browser started successfully."
        )

    # =====================================================
    # Open Bale
    # =====================================================

    def open_bale(self):

        self.start_browser()

        print(
            "[BALE] Opening Bale..."
        )

        self.bale.open_bale()

        print(
            "[BALE] Bale opened."
        )

    # =====================================================
    # Authentication
    # =====================================================

    def is_authenticated(self):

        if self.bale is None:
            return False

        try:

            return self.bale.is_authenticated()

        except Exception as e:

            print(
                f"[BALE] Authentication check error: {e}"
            )

            return False

    # =====================================================
    # Login
    # =====================================================

    def start_login(self, phone: str):

        """
        Start Bale login process.

        Flow:

        Browser
            ↓
        Bale Login
            ↓
        Click Login
            ↓
        Enter Phone
            ↓
        Submit Phone
            ↓
        OTP Requested
        """

        phone = phone.strip()

        if not phone:

            raise ValueError(
                "Phone number is empty."
            )

        print(
            f"[BALE] Starting login for: {phone}"
        )

        # Start browser
        self.start_browser()

        print(
            "[BALE] Opening login page..."
        )

        self.login.open()
        print("[DEBUG] URL:", self.page.url)
        print("[DEBUG] TITLE:", self.page.title())

        self.page.screenshot(
            path="/tmp/bale_login.png",
            full_page=True
        )

        print(
            self.page.locator("body").inner_text()[:5000]
        )
        print(
            "[BALE] Clicking login..."
        )

        self.login.click_login()

        self.page.wait_for_timeout(1000)

        print(
            "[BALE] Entering phone..."
        )

        self.login.enter_phone(
            phone
        )

        print(
            "[BALE] Submitting phone..."
        )

        self.login.submit_phone()

        print(
            "[BALE] OTP requested."
        )

        return True

    # =====================================================
    # OTP
    # =====================================================

    def verify_otp(self, otp: str):

        """
        Verify Bale OTP.

        The SAME browser/context/page created during
        start_login() is used.
        """

        otp = otp.strip()

        if not otp:

            raise ValueError(
                "OTP is empty."
            )

        if self.context is None:

            raise RuntimeError(
                "Bale browser session is not running."
            )

        if self.page is None:

            raise RuntimeError(
                "Bale page is not initialized."
            )

        if self.login is None:

            raise RuntimeError(
                "Bale login session is not initialized."
            )

        print(
            "[BALE] Verifying OTP..."
        )

        print(
            "[BALE] Current URL before OTP:",
            self.page.url
        )

        # -------------------------------------------------
        # Enter OTP
        # -------------------------------------------------

        print(
            "[BALE] Entering OTP..."
        )

        self.login.enter_otp(
            otp
        )

        print(
            "[BALE] OTP entered."
        )

        # -------------------------------------------------
        # Submit OTP
        # -------------------------------------------------

        print(
            "[BALE] Submitting OTP..."
        )

        self.login.submit_otp()

        # -------------------------------------------------
        # Wait for navigation / application state
        # -------------------------------------------------

        self.page.wait_for_timeout(
            3000
        )

        print(
            "[BALE] URL after OTP:",
            self.page.url
        )

        print(
            "[BALE] Page title:",
            self.page.title()
        )

        # -------------------------------------------------
        # Recreate BalePage
        # -------------------------------------------------

        self.bale = BalePage(
            self.page
        )

        # -------------------------------------------------
        # Authentication check
        # -------------------------------------------------

        authenticated = self.is_authenticated()

        print(
            "[BALE] Authentication result:",
            authenticated
        )

        # -------------------------------------------------
        # If authentication failed, dump page information
        # -------------------------------------------------

        if not authenticated:

            print(
                "[BALE] Authentication failed."
            )

            try:

                body_text = (
                    self.page
                    .locator("body")
                    .inner_text()
                )

                print(
                    "[BALE] PAGE BODY:"
                )

                print(
                    body_text[:5000]
                )

            except Exception as e:

                print(
                    "[BALE] Could not read page body:",
                    type(e).__name__
                )

        return authenticated

    # =====================================================
    # Contacts
    # =====================================================

    def open_contacts(self):

        if self.bale is None:

            raise RuntimeError(
                "Bale browser is not initialized."
            )

        return self.bale.open_contacts()

    def add_contact(
        self,
        phone: str,
        name: str
    ):

        if self.bale is None:

            raise RuntimeError(
                "Bale browser is not initialized."
            )

        return self.bale.add_contact(
            phone,
            name
        )

    # =====================================================
    # Search
    # =====================================================

    def search_contact(self, phone):
        print("\n================================")
        print("SEARCH CONTACT")
        print("================================")

        original_phone = str(phone).strip()

        search_phone = original_phone
        if not search_phone.startswith("0"):
           search_phone = "0" + search_phone

        print("Original phone:", original_phone)
        print("Search phone:", search_phone)

        try:
            # ---------------------------------------------
            # رفتن مستقیم به Contacts
            # ---------------------------------------------
            self.page.goto(
                "https://web.bale.ai/contacts",
                wait_until="domcontentloaded"
            )
    
            self.page.wait_for_timeout(1500)
    
            print("Contacts URL:", self.page.url)
    
            # ---------------------------------------------
            # پیدا کردن Search در Contacts
            # ---------------------------------------------
            search_icon = self.page.locator(
                'svg[aria-label="Search-icon"]'
            ).first
    
            search_icon.wait_for(
                state="visible",
                timeout=10000
            )
    
            try:
                search_icon.click(timeout=5000)
            except Exception:
                search_icon.click(
                    force=True,
                    timeout=5000
                )
    
            self.page.wait_for_timeout(1000)
    
            # ---------------------------------------------
            # Search input
            # ---------------------------------------------
            search_input = self.page.locator(
                'input[type="search"]'
            ).first
    
            search_input.wait_for(
                state="visible",
                timeout=10000
            )
    
            search_input.fill(search_phone)
    
            print("Phone entered into Contacts search.")
    
            self.page.wait_for_timeout(2000)
    
            # ---------------------------------------------
            # بررسی نتیجه
            # ---------------------------------------------
            body_text = self.page.locator(
                "body"
            ).inner_text()
    
            print("\nCONTACT SEARCH RESULT:")
            print("--------------------------------")
            print(body_text)
    
            # اگر شماره یا مخاطب در صفحه وجود داشت
            if search_phone in body_text or original_phone in body_text:
                print("[SUCCESS] Contact found.")
                return True
    
            print("[ERROR] Contact not found.")
            return False
    
        except Exception as e:
            print("\n[CONTACT SEARCH ERROR]")
            print(f"{type(e).__name__}: {e}")
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
                "Bale browser is not initialized."
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
                "Bale browser is not initialized."
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

        """
        Completely close Bale browser
        and Playwright.
        """

        print(
            "[BALE] Closing browser..."
        )

        # -------------------------------------------------
        # Close browser context
        # -------------------------------------------------

        try:

            if self.context is not None:

                self.context.close()

        except Exception as e:

            print(
                f"[BALE] Context close error: {e}"
            )

        finally:

            self.context = None
            self.page = None
            self.bale = None
            self.login = None

        # -------------------------------------------------
        # Stop Playwright
        # -------------------------------------------------

        try:

            if self.playwright is not None:

                self.playwright.stop()

        except Exception as e:

            print(
                f"[BALE] Playwright stop error: {e}"
            )

        finally:

            self.playwright = None

        print(
            "[BALE] Browser closed."
        )


# =========================================================
# Global Bale Backend
# =========================================================

bale_backend = BaleBackend()
