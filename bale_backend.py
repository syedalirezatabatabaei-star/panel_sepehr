import os
import shutil

from concurrent.futures import ThreadPoolExecutor

from playwright.sync_api import sync_playwright
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError


from pages.bale_page import BalePage
from pages.login_page import LoginPage

from bale_media import BaleMediaSender

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



BALE_ACCOUNT_DIR = os.path.join(
    BASE_DIR,
    "bale_account"
)

BALE_PROFILE = os.path.join(
    BALE_ACCOUNT_DIR,
    "profile"
)

BROWSER_PROFILE = BALE_PROFILE

BALE_ACCOUNT_FILE = os.path.join(
    BALE_ACCOUNT_DIR,
    "account.json"
)

os.makedirs(
    BALE_ACCOUNT_DIR,
    exist_ok=True
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
        self.current_login_phone = None

        self.bale = None

        self.login = None

        self.media_sender = None

        # آخرین مخاطب پردازش شده

        self.last_contact_phone = None

        self.last_contact_name = None



        print(
            "[BALE] Backend initialized."
        )
    def reset_bale_account(self):

        print("[BALE] Reset account requested.")

        # بستن مرورگر فعلی
        self.close()

        # حذف پروفایل قبلی
        if os.path.exists(BROWSER_PROFILE):

            shutil.rmtree(
                BROWSER_PROFILE
            )

            print(
                "[BALE] Old session removed."
            )


        # ساخت پروفایل جدید خالی
        os.makedirs(
            BROWSER_PROFILE,
            exist_ok=True
        )


        print(
            "[BALE] New empty session created."
        )

        return True
    @staticmethod
    def _normalize_phone(phone):
        phone = str(phone).strip()

        digits = "".join(char for char in phone if char.isdigit())

        if digits.startswith("98"):
            digits = "0" + digits[2:]
        elif digits.startswith("9"):
            digits = "0" + digits
        elif not digits.startswith("0"):
            digits = "0" + digits

        return digits
    # ADD CONTACT
    def add_contact(self, phone, name, contact_index=None):
        if self.bale is None:
            raise RuntimeError("Bale browser is not initialized.")

        phone = self._normalize_phone(phone)
        name = str(name).strip()

        print(
            f"[BALE BACKEND] ADD CONTACT → "
            f"{phone} | {name}"
        )

        return self.bale.add_contact(
            phone,
            name,
            contact_index=contact_index
        )
    def get_saved_account(self):

        if not os.path.exists(BALE_ACCOUNT_FILE):
            return None

        try:

            import json

            with open(
                BALE_ACCOUNT_FILE,
                "r",
                encoding="utf-8"
            ) as file:

                return json.load(file)

        except Exception as e:

            print(
                "[BALE ACCOUNT] Read error:",
                e
            )

            return None


    def save_account(self, phone):

        import json

        phone = self._normalize_phone(phone)

        os.makedirs(
            BALE_ACCOUNT_DIR,
            exist_ok=True
        )

        with open(
            BALE_ACCOUNT_FILE,
            "w",
            encoding="utf-8"
        ) as file:

            json.dump(
                {
                    "phone": phone
                },
                file,
                ensure_ascii=False,
                indent=4
            )

        print(
            f"[BALE ACCOUNT] Saved: {phone}"
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


            user_data_dir=BALE_PROFILE,


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

        self.media_sender = BaleMediaSender(
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

        self.current_login_phone = phone

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

        if result:

            self.save_account(
                self.current_login_phone
            )
        return result

    # =====================================================
    # OPEN CONTACTS
    # =====================================================

    def open_contacts(self):

        print(
            "\n================================"
        )

        print(
            "[BALE BACKEND] OPEN CONTACTS"
        )

        print(
            "================================"
        )

        if self.bale is None:

            raise RuntimeError(
                "Bale browser is not initialized."
            )

        result = self.bale.open_contacts()

        print(
            "[BALE BACKEND] Contacts opened:",
            result
        )

        return result
    # =====================================================
    # SEARCH CONTACT
    # =====================================================
    def search_contact(
        self,
        name
    ):

        print("\n================================")
        print("SEARCH CONTACT")
        print("================================")

        if self.page is None:
            return False

        target = str(
            name
        ).strip()

        print(
            "[SEARCH] Name:",
            target
        )

        try:

            # Search results are chat/dialog results, so run the search from
            # the chat view rather than the contacts-management page. On
            # /contacts the dialog-item selector is absent and valid contacts
            # are incorrectly reported as missing.
            self.page.goto(
                "https://web.bale.ai/chat",
                wait_until="domcontentloaded"
            )

            self.page.wait_for_timeout(2000)


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


            print(
                "[SEARCH] Input found"
            )


            search_input.fill(
                target
            )


            print(
                "[SEARCH] Name entered:",
                target
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

                    print(
                        "[SEARCH] No result"
                    )

                    return False


            dialogs = self.page.locator(
                '[aria-label="dialog-item"]'
            )


            count = dialogs.count()


            print(
                "[SEARCH] Dialog count:",
                count
            )


            for i in range(count):

                item = dialogs.nth(i)

                try:

                    text = item.inner_text(
                        timeout=2000
                    )

                    print(
                        f"[SEARCH] Result {i}:",
                        text
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

                            print(
                                "[SEARCH] Chat opened"
                            )

                            return True


                except Exception as e:

                    print(
                        "[SEARCH] Result error:",
                        e
                    )

                    continue


            # fallback
            element = self.page.get_by_text(
                target,
                exact=True
            ).last


            if element.count() > 0:

                print(
                    "[SEARCH] Fallback result found"
                )


                element.click(
                    force=True
                )


                self.page.wait_for_timeout(
                    1500
                )


                if self._is_chat_open():

                    self.last_contact_name = target

                    print(
                        "[SEARCH] Chat opened by fallback"
                    )

                    return True


            print(
                "[SEARCH] Contact not opened"
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

        if self.page is None:
            return False

        try:

            message = str(message).strip()

            if not message:
                return False

            selectors = [
                '[aria-label="editable-message-text"]',
                '[contenteditable="true"]',
                'textarea'
            ]

            input_box = None

            for selector in selectors:

                loc = self.page.locator(
                    selector
                )

                for i in range(loc.count()):

                    item = loc.nth(i)

                    if item.is_visible():

                        input_box = item
                        break

                if input_box is not None:
                    break

            if input_box is None:

                print(
                    "[SEND] Message input not found"
                )

                return False

            input_box.fill(
                message
            )

            print(
                "[SEND] Message entered"
            )

            message_locator = self.page.get_by_text(message, exact=True)
            try:
                before_message_count = message_locator.count()
            except Exception:
                before_message_count = 0

            input_box.press("Enter")

            # Wait until a new matching outgoing message appears.
            sent_in_chat = False
            for _ in range(16):
                try:
                    if self.page.get_by_text(message, exact=True).count() > before_message_count:
                        sent_in_chat = True
                        break
                except Exception:
                    pass
                self.page.wait_for_timeout(500)

            if not sent_in_chat:
                print("[SEND] Submission was not confirmed in the current chat.")
                return False

            # A new matching message appeared in the already-verified target
            # chat after submission. Do not reload here: a reload can reset the
            # selected chat/virtualized history and create a false "failed"
            # report even though the outgoing message was visible.
            print("[SEND] New message confirmed in the current chat.")
            return True

        except Exception as e:

            print(
                "[SEND ERROR]",
                e
            )

            return False

    # =====================================================
    # SEND MEDIA
    # =====================================================

    def send_media(
        self,
        media_path,
        caption="",
        media_type=None
    ):

        print(
            "\n[BALE] SEND MEDIA"
        )

        if self.page is None:
            print(
                "[MEDIA] Page is not initialized."
            )
            return False

        if self.media_sender is None:
            self.media_sender = BaleMediaSender(
                self.page
            )

        try:

            result = self.media_sender.send_media(
                file_path=media_path,
                caption=caption,
                media_type=media_type
            )

            print(
                "[MEDIA] Result:",
                result
            )

            return result

        except Exception as e:

            print(
                "[MEDIA SEND ERROR]",
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
