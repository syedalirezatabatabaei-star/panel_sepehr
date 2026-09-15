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



def run_bale(
    func,
    *args,
    **kwargs
):

    """
    تمام عملیات Playwright
    روی یک Thread ثابت اجرا می‌شود.
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



        # آخرین مخاطب پردازش شده

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
                "Cannot clear session while browser is running."
            )



        if os.path.exists(
            BROWSER_PROFILE
        ):


            shutil.rmtree(
                BROWSER_PROFILE
            )



            print(
                "[BALE] Old session deleted."
            )



        os.makedirs(
            BROWSER_PROFILE,
            exist_ok=True
        )



        print(
            "[BALE] New session created."
        )





    # =====================================================
    # START BROWSER
    # =====================================================


    def start_browser(self):


        if self.context is not None:


            print(
                "[BALE] Browser already running."
            )

            return




        print(
            "[BALE] Starting Playwright..."
        )



        self.playwright = sync_playwright().start()



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
            "[BALE] Browser started."
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
    # START BROWSER
    # =====================================================

    def start_browser(self):

        if self.context is not None:
            print("[BALE] Browser already running.")
            return

        print("[BALE] Starting browser...")

        self.playwright = sync_playwright().start()

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

        print("[BALE] Browser ready.")


    # =====================================================
    # OPEN BALE
    # =====================================================

    def open_bale(self):

        self.start_browser()

        print("[BALE] Opening Bale...")

        self.bale.open_bale()

        return True


    # =====================================================
    # AUTH CHECK
    # =====================================================

    def is_authenticated(self):

        if self.bale is None:
            return False

        try:
            return self.bale.is_authenticated()

        except Exception as e:

            print(
                "[BALE AUTH ERROR]",
                e
            )

            return False


    # =====================================================
    # START LOGIN
    # =====================================================

    def start_login(
        self,
        phone: str
    ):

        phone = str(phone).strip()

        if not phone:
            raise ValueError(
                "Phone empty"
            )

        self.start_browser()

        print(
            "[BALE] Login start:",
            phone
        )

        self.login.open()

        self.login.click_login()

        self.page.wait_for_timeout(
            1000
        )

        self.login.enter_phone(
            phone
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

        otp = str(otp).strip()

        if not otp:
            raise ValueError(
                "OTP empty"
            )


        if self.login is None:
            raise RuntimeError(
                "Login not initialized"
            )


        print(
            "[BALE] Verify OTP..."
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


        result = self.is_authenticated()


        print(
            "[BALE] Auth:",
            result
        )


        return result
    # =====================================================
    # SEARCH CONTACT
    # =====================================================

    def search_contact(
        self,
        phone
    ):

        print("\n================================")
        print("SEARCH CONTACT")
        print("================================")

        if self.page is None:
            return False

        original_phone = str(
            phone
        ).strip()

        search_phone = self._normalize_phone(
            original_phone
        )

        print(
            "Searching:",
            search_phone
        )

        try:

            self.last_contact_phone = search_phone


            self.page.goto(
                "https://web.bale.ai/contacts",
                wait_until="domcontentloaded"
            )

            self.page.wait_for_timeout(
                1500
            )


            if self.bale is not None:

                if not self.bale.open_search():

                    print(
                        "[SEARCH] Cannot open search"
                    )

                    return False


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
                2500
            )


            body = self.page.locator(
                "body"
            ).inner_text()


            print(
                body[:3000]
            )


            errors = [

                "نتیجه‌ای پیدا نشد",
                "نتیجه ای پیدا نشد",
                "پیدا نشد",
                "کاربر پیدا نشد"

            ]


            for error in errors:

                if error in body:

                    return False



            variants = [

                search_phone,
                search_phone.lstrip("0"),
                "98" + search_phone.lstrip("0"),
                "+98" + search_phone.lstrip("0")

            ]


            for item in variants:

                if item in body:

                    print(
                        "[SEARCH SUCCESS]"
                    )

                    return True



            # fallback
            if self.page.locator(
                '[aria-label="dialog-item"]'
            ).count() > 0:

                return True



            print(
                "[SEARCH FAILED]"
            )

            return False



        except Exception as e:

            print(
                "[SEARCH ERROR]",
                e
            )

            return False



    # =====================================================
    # OPEN CONTACT CHAT
    # =====================================================

    def open_contact_chat(
        self,
        name
    ):

        print(
            "Opening chat:",
            name
        )


        if self.page is None:

            return False


        try:


            target = str(
                name
            ).strip()


            dialogs = self.page.locator(
                '[aria-label="dialog-item"]'
            )


            count = dialogs.count()


            for i in range(count):


                item = dialogs.nth(i)


                try:


                    text = item.inner_text(
                        timeout=1000
                    )


                    if target in text:


                        try:

                            item.click(
                                timeout=5000
                            )

                        except Exception:

                            item.click(
                                force=True,
                                timeout=5000
                            )


                        self.page.wait_for_timeout(
                            1500
                        )


                        if self._is_chat_open():

                            self.last_contact_name = target

                            return True


                except Exception:

                    continue



            # fallback name

            element = self.page.get_by_text(
                target,
                exact=True
            ).last


            if element.count() > 0:


                element.click(
                    force=True
                )


                self.page.wait_for_timeout(
                    1500
                )


                if self._is_chat_open():

                    self.last_contact_name = target

                    return True



            return False



        except Exception as e:

            print(
                "[CHAT ERROR]",
                e
            )

            return False



    # =====================================================
    # CHECK CHAT OPEN
    # =====================================================

    def _is_chat_open(
        self
    ):


        selectors = [

            '[aria-label="editable-message-text"]',

            '[contenteditable="true"]',

            'textarea'

        ]


        try:


            for selector in selectors:


                loc = self.page.locator(
                    selector
                )


                for i in range(
                    loc.count()
                ):


                    if loc.nth(i).is_visible():

                        return True



            if "/chat/" in self.page.url:

                return True



            return False



        except Exception:

            return False
    # =====================================================
    # SEARCH CONTACT
    # =====================================================

    def search_contact(self, phone):

        print("\n[BALE] SEARCH CONTACT")

        if self.page is None:
            return False

        search_phone = self._normalize_phone(phone)

        self.last_contact_phone = search_phone

        try:

            self.page.goto(
                "https://web.bale.ai/contacts",
                wait_until="domcontentloaded"
            )

            self.page.wait_for_timeout(1500)

            if not self.bale.open_search():

                print(
                    "[SEARCH] Cannot open search"
                )

                return False


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
                2500
            )


            body = self.page.locator(
                "body"
            ).inner_text()


            print(
                body[:3000]
            )


            failed_words = [

                "نتیجه‌ای پیدا نشد",
                "نتیجه ای پیدا نشد",
                "پیدا نشد",
                "کاربر پیدا نشد"

            ]


            for word in failed_words:

                if word in body:

                    return False



            if search_phone in body:

                return True



            dialogs = self.page.locator(
                '[aria-label="dialog-item"]'
            )


            if dialogs.count() > 0:

                return True



            return False



        except Exception as e:

            print(
                "[SEARCH ERROR]",
                e
            )

            return False



    # =====================================================
    # OPEN CONTACT CHAT
    # =====================================================

    def open_contact_chat(self, name):

        print(
            "\n[BALE] OPEN CONTACT CHAT"
        )


        target = str(
            name
        ).strip()


        try:


            dialogs = self.page.locator(
                '[aria-label="dialog-item"]'
            )


            count = dialogs.count()


            for i in range(count):


                item = dialogs.nth(i)


                try:


                    text = item.inner_text()


                    if target in text:


                        try:

                            item.click()

                        except Exception:

                            item.click(
                                force=True
                            )


                        self.page.wait_for_timeout(
                            1500
                        )


                        return True


                except Exception:

                    continue



            contact = self.page.get_by_text(
                target,
                exact=True
            ).last


            if contact.count():


                try:

                    contact.click()

                except Exception:

                    contact.click(
                        force=True
                    )


                self.page.wait_for_timeout(
                    1500
                )


                return True



            return False



        except Exception as e:


            print(
                "[OPEN CHAT ERROR]",
                e
            )


            return False



    # =====================================================
    # SEND MESSAGE
    # =====================================================

    def send_message(self, message):

        print(
            "\n[BALE] SEND MESSAGE"
        )


        try:


            return self.bale.send_message(
                message
            )


        except Exception as e:


            print(
                "[SEND ERROR]",
                e
            )


            return False



    # =====================================================
    # FULL SEND FLOW
    # =====================================================

    def send_message_to_contact(
            self,
            phone,
            name,
            message
    ):


        print(
            "\n[BALE FLOW]"
        )


        #
        # 1 SEARCH
        #

        if not self.search_contact(phone):

            return {

                "success": False,

                "status": "search_failed",

                "message": "مخاطب پیدا نشد"

            }



        #
        # 2 OPEN CHAT
        #

        if not self.open_contact_chat(name):

            return {

                "success": False,

                "status": "chat_failed",

                "message": "چت باز نشد"

            }



        #
        # 3 SEND
        #

        if not self.send_message(message):

            return {

                "success": False,

                "status": "send_failed",

                "message": "ارسال نشد"

            }



        return {

            "success": True,

            "status": "sent",

            "message": "پیام ارسال شد"

        }



    # =====================================================
    # CLOSE
    # =====================================================

    def close(self):

        print(
            "[BALE] Closing..."
        )


        try:


            if self.context:

                self.context.close()



        except Exception:

            pass



        finally:


            self.context = None

            self.page = None

            self.bale = None

            self.login = None

            self.last_contact_phone = None

            self.last_contact_name = None



        try:


            if self.playwright:

                self.playwright.stop()



        except Exception:

            pass



        self.playwright = None


        print(
            "[BALE] Closed."
        )



# =====================================================
# GLOBAL INSTANCE
# =====================================================

bale_backend = BaleBackend()
