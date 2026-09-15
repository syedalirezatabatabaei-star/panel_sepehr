import os
import shutil
from concurrent.futures import ThreadPoolExecutor

from playwright.sync_api import sync_playwright
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError

from pages.bale_page import BalePage
from pages.login_page import LoginPage


# =========================================================
# BALE PLAYWRIGHT EXECUTOR
# =========================================================

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
# PATHS
# =========================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

BROWSER_PROFILE = os.path.join(
    BASE_DIR,
    "browser_profile"
)

CHROMIUM_PATH = "/usr/bin/chromium"


# =========================================================
# BALE BACKEND
# =========================================================

class BaleBackend:

    def __init__(self):

        self.playwright = None
        self.context = None
        self.page = None

        self.bale = None
        self.login = None

        # آخرین مخاطبی که Search شده
        self.last_contact_phone = None
        self.last_contact_name = None

        print(
            "[BALE] Backend initialized."
        )

    # =====================================================
    # CLEAR SESSION
    # =====================================================

    def clear_bale_session(self):

        if self.context is not None:

            raise RuntimeError(
                "Cannot clear Bale session while browser is running."
            )

        if os.path.exists(
            BROWSER_PROFILE
        ):

            try:

                shutil.rmtree(
                    BROWSER_PROFILE
                )

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
    # START BROWSER
    # =====================================================

    def start_browser(self):

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

        self.context = self.playwright.chromium.launch_persistent_context(
            user_data_dir=BROWSER_PROFILE,
            executable_path=CHROMIUM_PATH,
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu"
            ]
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
            "[BALE] Browser started successfully."
        )

    # =====================================================
    # OPEN BALE
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
    # AUTHENTICATION
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
    # START LOGIN
    # =====================================================

    def start_login(
        self,
        phone: str
    ):

        phone = str(
            phone
        ).strip()

        if not phone:

            raise ValueError(
                "Phone number is empty."
            )

        print(
            f"[BALE] Starting login for: {phone}"
        )

        self.start_browser()

        print(
            "[BALE] Opening login page..."
        )

        self.login.open()

        print(
            "[DEBUG] URL:",
            self.page.url
        )

        print(
            "[DEBUG] TITLE:",
            self.page.title()
        )

        try:

            self.page.screenshot(
                path="/tmp/bale_login.png",
                full_page=True
            )

        except Exception:
            pass

        try:

            print(
                self.page.locator(
                    "body"
                ).inner_text()[:5000]
            )

        except Exception:
            pass

        print(
            "[BALE] Clicking login..."
        )

        self.login.click_login()

        self.page.wait_for_timeout(
            1000
        )

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
    # VERIFY OTP
    # =====================================================

    def verify_otp(
        self,
        otp: str
    ):

        otp = str(
            otp
        ).strip()

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

        print(
            "[BALE] Entering OTP..."
        )

        self.login.enter_otp(
            otp
        )

        print(
            "[BALE] OTP entered."
        )

        print(
            "[BALE] Submitting OTP..."
        )

        self.login.submit_otp()

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

        self.bale = BalePage(
            self.page
        )

        authenticated = self.is_authenticated()

        print(
            "[BALE] Authentication result:",
            authenticated
        )

        if not authenticated:

            print(
                "[BALE] Authentication failed."
            )

            try:

                body_text = self.page.locator(
                    "body"
                ).inner_text()

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
    # OPEN CONTACTS
    # =====================================================

    def open_contacts(self):

        if self.bale is None:

            raise RuntimeError(
                "Bale browser is not initialized."
            )

        print(
            "\n================================"
        )

        print(
            "[BALE BACKEND] OPEN CONTACTS"
        )

        print(
            "================================"
        )

        result = self.bale.open_contacts()

        print(
            "[BALE BACKEND] Contacts opened:",
            result
        )

        return result

    # =====================================================
    # ADD CONTACT
    # =====================================================

    def add_contact(
        self,
        phone: str,
        name: str
    ):

        print(
            "\n================================"
        )

        print(
            "BACKEND ADD CONTACT"
        )

        print(
            "================================"
        )

        print(
            "PHONE:",
            phone
        )

        print(
            "NAME:",
            name
        )

        if self.bale is None:

            raise RuntimeError(
                "Bale browser is not initialized."
            )

        result = self.bale.add_contact(
            phone,
            name
        )

        print(
            "[BACKEND ADD RESULT]",
            result
        )

        return result

    # =====================================================
    # NORMALIZE PHONE
    # =====================================================

    @staticmethod
    def _normalize_phone(
        phone
    ):

        phone = str(
            phone
        ).strip()

        digits = "".join(
            char
            for char in phone
            if char.isdigit()
        )

        if digits.startswith("98"):

            digits = "0" + digits[2:]

        elif digits.startswith("9"):

            digits = "0" + digits

        elif not digits.startswith("0"):

            digits = "0" + digits

        return digits

    # =====================================================
    # SEARCH CONTACT
    # =====================================================

    def search_contact(
        self,
        phone
    ):

        print(
            "\n================================"
        )

        print(
            "SEARCH CONTACT"
        )

        print(
            "================================"
        )

        if self.page is None:

            print(
                "[SEARCH ERROR] Page is not initialized."
            )

            return False

        original_phone = str(
            phone
        ).strip()

        search_phone = self._normalize_phone(
            original_phone
        )

        print(
            "Original phone:",
            original_phone
        )

        print(
            "Search phone:",
            search_phone
        )

        try:

            # ذخیره مخاطب فعلی برای مرحله OPEN CHAT
            self.last_contact_phone = search_phone

            # -------------------------------------------------
            # رفتن به Contacts
            # -------------------------------------------------

            print(
                "[SEARCH] Opening Contacts page..."
            )

            self.page.goto(
                "https://web.bale.ai/contacts",
                wait_until="domcontentloaded"
            )

            self.page.wait_for_timeout(
                1500
            )

            print(
                "[SEARCH] Contacts URL:",
                self.page.url
            )

            # -------------------------------------------------
            # باز کردن Search
            # -------------------------------------------------

            search_icon = self.page.locator(
                'svg[aria-label="Search-icon"]'
            ).first

            if search_icon.count() == 0:

                print(
                    "[SEARCH ERROR] Search icon not found."
                )

                try:

                    self.page.screenshot(
                        path="/tmp/bale_search_icon_error.png",
                        full_page=True
                    )

                except Exception:
                    pass

                return False

            search_icon.wait_for(
                state="visible",
                timeout=10000
            )

            try:

                search_icon.click(
                    timeout=5000
                )

            except Exception:

                search_icon.click(
                    force=True,
                    timeout=5000
                )

            print(
                "[SEARCH] Search opened."
            )

            self.page.wait_for_timeout(
                700
            )

            # -------------------------------------------------
            # Search input
            # -------------------------------------------------

            search_input = self.page.locator(
                'input[type="search"]'
            ).first

            search_input.wait_for(
                state="visible",
                timeout=10000
            )

            print(
                "[SEARCH] Search input found."
            )

            try:

                search_input.fill(
                    ""
                )

            except Exception:
                pass

            search_input.fill(
                search_phone
            )

            print(
                "[SEARCH] Phone entered:",
                search_phone
            )

            search_input.press(
                "Enter"
            )

            print(
                "[SEARCH] Search submitted."
            )

            self.page.wait_for_timeout(
                2500
            )

            print(
                "[SEARCH] URL after search:",
                self.page.url
            )

            # -------------------------------------------------
            # بررسی Body
            # -------------------------------------------------

            body_text = self.page.locator(
                "body"
            ).inner_text()

            print(
                "\n[SEARCH] RESULT:"
            )

            print(
                "--------------------------------"
            )

            print(
                body_text[:5000]
            )

            print(
                "--------------------------------"
            )

            # -------------------------------------------------
            # تشخیص نتیجه منفی
            # -------------------------------------------------

            no_result_messages = [

                "نتیجه‌ای پیدا نشد",
                "نتیجه ای پیدا نشد",
                "موردی پیدا نشد",
                "پیدا نشد",
                "کاربری پیدا نشد",
                "کاربر پیدا نشد"

            ]

            for message in no_result_messages:

                if message in body_text:

                    print(
                        "[SEARCH] No result:",
                        message
                    )

                    return False

            # -------------------------------------------------
            # بررسی شماره
            # -------------------------------------------------

            phone_variants = [

                search_phone,
                search_phone.lstrip("0"),
                "98" + search_phone.lstrip("0"),
                "+98" + search_phone.lstrip("0"),
                original_phone

            ]

            found_phone = False

            for variant in phone_variants:

                if variant and variant in body_text:

                    print(
                        "[SEARCH] Phone found in result:",
                        variant
                    )

                    found_phone = True

                    break

            # -------------------------------------------------
            # بررسی المنت‌های قابل کلیک
            # -------------------------------------------------

            clickable_candidates = [

                '[role="button"]',
                'button',
                '[aria-label="dialog-item"]',
                '[role="listitem"]',
                'a'

            ]

            candidate_found = None

            for selector in clickable_candidates:

                try:

                    locator = self.page.locator(
                        selector
                    )

                    count = locator.count()

                    print(
                        f"[SEARCH] Selector {selector} count:",
                        count
                    )

                    for index in range(
                        min(count, 100)
                    ):

                        candidate = locator.nth(
                            index
                        )

                        try:

                            if not candidate.is_visible():

                                continue

                            text = candidate.inner_text(
                                timeout=1000
                            ).strip()

                            if not text:

                                continue

                            normalized_text = (
                                text
                                .replace(
                                    " ",
                                    ""
                                )
                                .replace(
                                    "\u200c",
                                    ""
                                )
                            )

                            for variant in phone_variants:

                                normalized_variant = (
                                    variant
                                    .replace(
                                        " ",
                                        ""
                                    )
                                    .replace(
                                        "\u200c",
                                        ""
                                    )
                                )

                                if (
                                    normalized_variant
                                    and normalized_variant in normalized_text
                                ):

                                    candidate_found = candidate

                                    print(
                                        "[SEARCH] Matching clickable result found."
                                    )

                                    print(
                                        "[SEARCH] Selector:",
                                        selector
                                    )

                                    print(
                                        "[SEARCH] Text:",
                                        repr(text)
                                    )

                                    break

                            if candidate_found is not None:

                                break

                        except Exception:

                            continue

                    if candidate_found is not None:

                        break

                except Exception:

                    continue

            # -------------------------------------------------
            # نتیجه
            # -------------------------------------------------

            if found_phone or candidate_found is not None:

                print(
                    "[SEARCH SUCCESS] Contact found."
                )

                return True

            # اگر شماره در body نبود ولی Search نتیجه‌ای
            # نمایش داده، یک بررسی ثانویه انجام بده.
            body_lower = body_text.lower()

            generic_result_words = [

                "مخاطبین",
                "مخاطب",
                "شماره همراه",
                "اینجا بوده"

            ]

            for word in generic_result_words:

                if word in body_lower:

                    print(
                        "[SEARCH] Possible contact result detected:",
                        word
                    )

                    return True

            print(
                "[SEARCH ERROR] Contact not found."
            )

            try:

                self.page.screenshot(
                    path="/tmp/bale_contact_search.png",
                    full_page=True
                )

                print(
                    "[DEBUG] Screenshot saved:"
                    " /tmp/bale_contact_search.png"
                )

            except Exception:
                pass

            return False

        except PlaywrightTimeoutError as e:

            print(
                "\n[CONTACT SEARCH TIMEOUT]"
            )

            print(
                f"{type(e).__name__}: {e}"
            )

            try:

                self.page.screenshot(
                    path="/tmp/bale_contact_search_timeout.png",
                    full_page=True
                )

            except Exception:
                pass

            return False

        except Exception as e:

            print(
                "\n[CONTACT SEARCH ERROR]"
            )

            print(
                f"{type(e).__name__}: {e}"
            )

            try:

                self.page.screenshot(
                    path="/tmp/bale_contact_search_error.png",
                    full_page=True
                )

            except Exception:
                pass

            return False

    # =====================================================
    # OPEN CONTACT CHAT
    # =====================================================

    def open_contact_chat(
        self,
        name: str
    ):

        print(
            "\n================================"
        )

        print(
            "OPEN CONTACT CHAT"
        )

        print(
            "================================"
        )

        target_name = str(
            name
        ).strip()

        print(
            "Target contact name:",
            target_name
        )

        print(
            "Last searched phone:",
            self.last_contact_phone
        )

        if self.page is None:

            print(
                "[CHAT ERROR] Page is not initialized."
            )

            return False

        try:

            # -------------------------------------------------
            # اولویت اول:
            # اگر Search انجام شده، همان نتیجه Search را
            # پیدا و کلیک کن.
            # -------------------------------------------------

            phone = self.last_contact_phone

            phone_variants = []

            if phone:

                phone_variants = [

                    phone,
                    phone.lstrip("0"),
                    "98" + phone.lstrip("0"),
                    "+98" + phone.lstrip("0")

                ]

            print(
                "[CHAT] Searching visible result..."
            )

            selectors = [

                '[role="button"]',
                'button',
                '[role="listitem"]',
                '[aria-label="dialog-item"]',
                'a',
                'div'

            ]

            # -------------------------------------------------
            # مرحله 1: پیدا کردن المنتی که شماره دارد
            # -------------------------------------------------

            for selector in selectors:

                try:

                    locator = self.page.locator(
                        selector
                    )

                    count = locator.count()

                    if count == 0:

                        continue

                    print(
                        f"[CHAT] Checking {selector}: {count}"
                    )

                    for index in range(
                        min(count, 150)
                    ):

                        candidate = locator.nth(
                            index
                        )

                        try:

                            if not candidate.is_visible():

                                continue

                            text = candidate.inner_text(
                                timeout=700
                            ).strip()

                            if not text:

                                continue

                            compact_text = (
                                text
                                .replace(
                                    " ",
                                    ""
                                )
                                .replace(
                                    "\u200c",
                                    ""
                                )
                                .replace(
                                    "\n",
                                    ""
                                )
                            )

                            matched = False

                            for variant in phone_variants:

                                compact_variant = (
                                    variant
                                    .replace(
                                        " ",
                                        ""
                                    )
                                )

                                if (
                                    compact_variant
                                    and compact_variant in compact_text
                                ):

                                    matched = True

                                    break

                            if not matched:

                                continue

                            print(
                                "[CHAT] Contact result matched by phone."
                            )

                            print(
                                "[CHAT] Result text:",
                                repr(text[:500])
                            )

                            try:

                                candidate.click(
                                    timeout=5000
                                )

                            except Exception:

                                candidate.click(
                                    force=True,
                                    timeout=5000
                                )

                            self.page.wait_for_timeout(
                                1800
                            )

                            print(
                                "[CHAT] Contact clicked."
                            )

                            print(
                                "[CHAT] Current URL:",
                                self.page.url
                            )

                            # بررسی اینکه صفحه چت باز شده
                            if self._is_chat_open():

                                print(
                                    "[CHAT SUCCESS] Chat opened."
                                )

                                return True

                            print(
                                "[CHAT] Click happened but chat "
                                "could not yet be confirmed."
                            )

                            # اگر کلیک انجام شده، فرصت دوباره
                            self.page.wait_for_timeout(
                                1500
                            )

                            if self._is_chat_open():

                                print(
                                    "[CHAT SUCCESS] Chat opened."
                                )

                                return True

                        except Exception:

                            continue

                except Exception:

                    continue

            # -------------------------------------------------
            # مرحله 2: اگر شماره در نتیجه نبود،
            # با نام مخاطب جستجو کن.
            # -------------------------------------------------

            if target_name:

                print(
                    "[CHAT] Trying exact contact name:"
                    f" {target_name}"
                )

                exact_candidates = self.page.get_by_text(
                    target_name,
                    exact=True
                )

                exact_count = exact_candidates.count()

                print(
                    "[CHAT] Exact name count:",
                    exact_count
                )

                for index in range(
                    exact_count
                ):

                    try:

                        candidate = exact_candidates.nth(
                            index
                        )

                        if not candidate.is_visible():

                            continue

                        print(
                            "[CHAT] Exact name candidate:",
                            index
                        )

                        candidate.click(
                            timeout=5000
                        )

                        self.page.wait_for_timeout(
                            1800
                        )

                        if self._is_chat_open():

                            print(
                                "[CHAT SUCCESS] Chat opened by name."
                            )

                            return True

                    except Exception:

                        try:

                            candidate.click(
                                force=True,
                                timeout=5000
                            )

                            self.page.wait_for_timeout(
                                1800
                            )

                            if self._is_chat_open():

                                print(
                                    "[CHAT SUCCESS] Chat opened by force click."
                                )

                                return True

                        except Exception:

                            continue

            # -------------------------------------------------
            # مرحله 3: اگر Search result هنوز باز است،
            # اولین نتیجه قابل کلیک را امتحان کن.
            # -------------------------------------------------

            print(
                "[CHAT] Trying first search result..."
            )

            result_selectors = [

                '[role="listitem"]',
                '[role="button"]',
                'button'

            ]

            for selector in result_selectors:

                try:

                    locator = self.page.locator(
                        selector
                    )

                    count = locator.count()

                    for index in range(
                        count
                    ):

                        candidate = locator.nth(
                            index
                        )

                        try:

                            if not candidate.is_visible():

                                continue

                            text = candidate.inner_text(
                                timeout=500
                            ).strip()

                            if not text:

                                continue

                            # از کلیک روی دکمه‌های عمومی صفحه
                            # جلوگیری کن.
                            if text in [
                                "باز کردن",
                                "افزودن",
                                "ساخت گروه",
                                "ساخت کانال"
                            ]:

                                continue

                            candidate.click(
                                timeout=3000
                            )

                            self.page.wait_for_timeout(
                                1500
                            )

                            if self._is_chat_open():

                                print(
                                    "[CHAT SUCCESS] Chat opened from result."
                                )

                                return True

                        except Exception:

                            continue

                except Exception:

                    continue

            print(
                "[CHAT ERROR] Could not open contact chat."
            )

            try:

                print(
                    "[CHAT DEBUG] Current body:"
                )

                print(
                    self.page.locator(
                        "body"
                    ).inner_text()[:5000]
                )

                self.page.screenshot(
                    path="/tmp/bale_open_chat_error.png",
                    full_page=True
                )

                print(
                    "[CHAT DEBUG] Screenshot saved:"
                    " /tmp/bale_open_chat_error.png"
                )

            except Exception:
                pass

            return False

        except Exception as e:

            print(
                "\n[OPEN CONTACT CHAT ERROR]"
            )

            print(
                f"{type(e).__name__}: {e}"
            )

            try:

                self.page.screenshot(
                    path="/tmp/bale_open_chat_exception.png",
                    full_page=True
                )

            except Exception:
                pass

            return False

    # =====================================================
    # CHECK CHAT OPEN
    # =====================================================

    def _is_chat_open(self):

        if self.page is None:

            return False

        try:

            # اگر Message input وجود دارد، تقریباً قطعی
            # وارد Chat شده‌ایم.
            message_selectors = [

                '[aria-label="editable-message-text"]',
                '[contenteditable="true"]',
                'textarea',
                'textarea[placeholder*="پیام"]',
                'input[placeholder*="پیام"]'

            ]

            for selector in message_selectors:

                try:

                    locator = self.page.locator(
                        selector
                    )

                    count = locator.count()

                    for index in range(
                        count
                    ):

                        if locator.nth(index).is_visible():

                            print(
                                "[CHAT CHECK] Message input detected."
                            )

                            return True

                except Exception:

                    continue

            # -------------------------------------------------
            # بررسی URL
            # -------------------------------------------------

            url = self.page.url

            if "/chat/" in url:

                return True

            # -------------------------------------------------
            # بررسی عناصر Chat
            # -------------------------------------------------

            body_text = self.page.locator(
                "body"
            ).inner_text()

            chat_words = [

                "پیام خود را",
                "پیام",
                "ارسال"

            ]

            found = 0

            for word in chat_words:

                if word in body_text:

                    found += 1

            if found >= 2:

                return True

            return False

        except Exception:

            return False

    # =====================================================
    # SEND MESSAGE
    # =====================================================

    def send_message(
        self,
        message: str
    ):

        print(
            "\n================================"
        )

        print(
            "SEND MESSAGE"
        )

        print(
            "================================"
        )

        if self.bale is None:

            raise RuntimeError(
                "Bale browser is not initialized."
            )

        message = str(
            message
        ).strip()

        if not message:

            raise ValueError(
                "Message is empty."
            )

        print(
            "[BALE BACKEND] Message received:"
        )

        print(
            repr(message)
        )

        print(
            "[BALE BACKEND] Message length:",
            len(message)
        )

        result = self.bale.send_message(
            message
        )

        print(
            "[BALE BACKEND] Send result:",
            result
        )

        return result

    # =====================================================
    # SEARCH + OPEN CHAT + SEND
    # =====================================================

    def send_message_to_contact(
        self,
        phone,
        name,
        message
    ):

        print(
            "\n================================"
        )

        print(
            "SEND MESSAGE TO CONTACT"
        )

        print(
            "================================"
        )

        print(
            "PHONE:",
            phone
        )

        print(
            "NAME:",
            name
        )

        print(
            "MESSAGE:",
            repr(message)
        )

        # -------------------------------------------------
        # 1. SEARCH
        # -------------------------------------------------

        print(
            "\n[BALE FLOW] STEP 1 - SEARCH CONTACT"
        )

        search_result = self.search_contact(
            phone
        )

        print(
            "[BALE FLOW] Search result:",
            search_result
        )

        if not search_result:

            print(
                "[BALE FLOW] STOP: Contact search failed."
            )

            return {
                "success": False,
                "status": "search_failed",
                "message": "مخاطب پیدا نشد"
            }

        # -------------------------------------------------
        # 2. OPEN CHAT
        # -------------------------------------------------

        print(
            "\n[BALE FLOW] STEP 2 - OPEN CONTACT CHAT"
        )

        chat_result = self.open_contact_chat(
            name
        )

        print(
            "[BALE FLOW] Chat result:",
            chat_result
        )

        if not chat_result:

            print(
                "[BALE FLOW] STOP: Chat could not be opened."
            )

            return {
                "success": False,
                "status": "chat_open_failed",
                "message": "گفتگو باز نشد"
            }

        # -------------------------------------------------
        # 3. SEND MESSAGE
        # -------------------------------------------------

        print(
            "\n[BALE FLOW] STEP 3 - SEND MESSAGE"
        )

        send_result = self.send_message(
            message
        )

        print(
            "[BALE FLOW] Send result:",
            send_result
        )

        if not send_result:

            print(
                "[BALE FLOW] STOP: Message was not sent."
            )

            return {
                "success": False,
                "status": "send_failed",
                "message": "پیام ارسال نشد"
            }

        print(
            "\n[BALE FLOW] SUCCESS"
        )

        return {
            "success": True,
            "status": "sent",
            "message": "پیام با موفقیت ارسال شد"
        }

    # =====================================================
    # CLOSE
    # =====================================================

    def close(self):

        print(
            "[BALE] Closing browser..."
        )

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

            self.last_contact_phone = None
            self.last_contact_name = None

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
# GLOBAL BALE BACKEND
# =========================================================

bale_backend = BaleBackend()
