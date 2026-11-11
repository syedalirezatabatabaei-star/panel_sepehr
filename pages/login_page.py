import re

from playwright.sync_api import Page
from pages.base_page import BasePage


class LoginPage(BasePage):
    LOGIN_URL = "https://web.bale.ai/login?redirectTo=/"

    def __init__(self, page: Page):
        super().__init__(page)

    # =========================================================
    # OPEN LOGIN
    # =========================================================

    def open(self):
        print("[BALE LOGIN] Opening login page...")

        self.page.goto(
            self.LOGIN_URL,
            wait_until="domcontentloaded",
            timeout=60000
        )

        self.page.wait_for_timeout(2000)

        print("[BALE LOGIN] URL:", self.page.url)
        print("[BALE LOGIN] TITLE:", self.page.title())

        # بستن پنجره راهنمای نصب
        self.close_install_guide()

        # تنظیم زبان فارسی
        self.set_persian_language()

        # اطمینان از آماده بودن صفحه Login
        self.page.locator(
            '[data-testid="submit-button"]'
        ).wait_for(
            state="visible",
            timeout=30000
        )

        print("[BALE LOGIN] Login page ready.")

    # =========================================================
    # CLOSE INSTALL GUIDE
    # =========================================================

    def close_install_guide(self):
        """
        بستن پنجره راهنمای نصب در صورت وجود.
        """

        # English
        try:
            got_it = self.page.get_by_role(
                "button",
                name="Got it"
            )

            if got_it.count() > 0:
                if got_it.first.is_visible():

                    print(
                        "[BALE LOGIN] Closing install guide..."
                    )

                    got_it.first.click()

                    self.page.wait_for_timeout(500)

                    return

        except Exception:
            pass

        # Persian
        try:
            close_button = self.page.get_by_role(
                "button",
                name="متوجه شدم"
            )

            if close_button.count() > 0:
                if close_button.first.is_visible():

                    print(
                        "[BALE LOGIN] Closing Persian install guide..."
                    )

                    close_button.first.click()

                    self.page.wait_for_timeout(500)

        except Exception:
            pass

    # =========================================================
    # SET PERSIAN LANGUAGE
    # =========================================================

    def set_persian_language(self):
        """
        انتخاب زبان فارسی.
        اگر گزینه زبان وجود نداشته باشد، ادامه می‌دهد.
        """

        try:

            language_button = self.page.locator(
                "button"
            ).filter(
                has_text="Language | زبان"
            )

            if language_button.count() == 0:

                print(
                    "[BALE LOGIN] Language button not found."
                )

                return

            if not language_button.first.is_visible():
                return

            print(
                "[BALE LOGIN] Opening language menu..."
            )

            language_button.first.click()

            self.page.wait_for_timeout(500)

            persian = self.page.get_by_text(
                "فارسی",
                exact=True
            )

            if persian.count() == 0:

                print(
                    "[BALE LOGIN] Persian option not found."
                )

                return

            persian.wait_for(
                state="visible",
                timeout=10000
            )

            persian.click()

            self.page.wait_for_timeout(300)

            save_button = self.page.locator(
                '[data-testid="confirm-button"]'
            )

            if save_button.count() == 0:

                print(
                    "[BALE LOGIN] Save button not found."
                )

                return

            save_button.wait_for(
                state="visible",
                timeout=10000
            )

            save_button.click()

            self.page.wait_for_timeout(1000)

            print(
                "[BALE LOGIN] Persian language selected."
            )

        except Exception as e:

            # زبان نباید باعث fail شدن Login شود
            print(
                "[BALE LOGIN] Language setup skipped:",
                type(e).__name__,
                str(e)
            )

    # =========================================================
    # IS LOGIN PAGE
    # =========================================================

    def is_login_page(self) -> bool:

        try:

            return (
                self.page.locator(
                    '[data-testid="submit-button"]'
                ).count()
                > 0
            )

        except Exception:

            return False

    # =========================================================
    # CLICK LOGIN
    # =========================================================

    def click_login(self):

        print("[BALE LOGIN] Clicking login...")

        self.close_install_guide()

        login_button = self.page.locator(
            '[data-testid="submit-button"]'
        )

        login_button.wait_for(
            state="visible",
            timeout=30000
        )

        print(
            "[BALE LOGIN] Submit button initial disabled:",
            login_button.is_disabled()
        )

        # صبر برای فعال شدن واقعی دکمه
        for attempt in range(60):

            try:

                if not login_button.is_disabled():

                    print(
                        "[BALE LOGIN] Submit button enabled after "
                        f"{attempt * 500}ms."
                    )

                    login_button.click(
                        timeout=10000
                    )

                    print(
                        "[BALE LOGIN] Login button clicked."
                    )

                    return

            except Exception as e:

                print(
                    "[BALE LOGIN] Waiting for submit button:",
                    type(e).__name__
                )

            self.page.wait_for_timeout(500)

        print(
            "[BALE LOGIN] Submit button is STILL disabled."
        )

        self.debug_inputs()

        raise RuntimeError(
            "دکمه تایید شماره در بله فعال نشد."
        )

    # =========================================================
    # DEBUG INPUTS
    # =========================================================

    def debug_inputs(self):

        print(
            "[BALE LOGIN] Available inputs:"
        )

        try:

            inputs = self.page.locator("input")

            count = inputs.count()

            for i in range(count):

                element = inputs.nth(i)

                print(
                    f"[BALE LOGIN] INPUT {i}:",
                    "type=",
                    element.get_attribute("type"),
                    "name=",
                    element.get_attribute("name"),
                    "placeholder=",
                    element.get_attribute("placeholder"),
                    "aria-label=",
                    element.get_attribute("aria-label"),
                    "value=",
                    element.input_value(),
                )

        except Exception as e:

            print(
                "[BALE LOGIN] Input debug failed:",
                type(e).__name__
            )

    # =========================================================
    # ENTER PHONE
    # =========================================================

    def enter_phone(self, phone: str):
        """
        وارد کردن شماره موبایل در فرم Login بله.
    
        شماره ایران بدون صفر ابتدایی وارد می‌شود.
    
        مثال:
            09966909622
        تبدیل می‌شود به:
            9966909622
        """
    
        phone = str(phone).strip()
    
        if not phone:
            raise ValueError("Phone number is empty.")
    
        # =====================================================
        # Normalize Persian / Arabic digits
        # =====================================================
    
        translation = str.maketrans(
            "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩",
            "01234567890123456789"
        )
    
        phone = phone.translate(translation)
    
        # =====================================================
        # Normalize Iranian phone
        # =====================================================
    
        if phone.startswith("+98"):
            phone = phone[3:]
    
        elif phone.startswith("0098"):
            phone = phone[4:]
    
        elif phone.startswith("98") and len(phone) >= 12:
            phone = phone[2:]
    
        if phone.startswith("0"):
            phone = phone[1:]
    
        # فقط عدد
        phone = re.sub(r"\D", "", phone)
    
        print(
            "[BALE LOGIN] Normalized phone:",
            phone
        )
    
        # =====================================================
        # Validate
        # =====================================================
    
        if not re.fullmatch(r"9\d{9}", phone):
            raise ValueError(
                f"Invalid Iranian mobile number: {phone}"
            )
    
        # =====================================================
        # Find exact Bale mobile input
        # =====================================================
    
        candidates = [
    
            self.page.locator(
                'input[aria-label="شماره همراه"]'
            ),
    
            self.page.locator(
                'input[aria-label="Mobile number"]'
            ),
    
            self.page.locator(
                'input[aria-label*="Mobile"]'
            ),
    
            self.page.locator(
                'input[placeholder*="912"]'
            ),
    
            self.page.locator(
                'input[type="tel"]'
            ),
    
            self.page.get_by_role(
                "textbox",
                name=re.compile(
                    "شماره همراه|شماره موبایل|شماره تلفن|Mobile number",
                    re.IGNORECASE
                )
            ),
        ]
    
        phone_input = None
    
        for candidate in candidates:
    
            try:
    
                count = candidate.count()
    
                if count == 0:
                    continue
    
                for i in range(count):
    
                    element = candidate.nth(i)
    
                    if element.is_visible():
    
                        phone_input = element
    
                        print(
                            "[BALE LOGIN] Phone input found."
                        )
    
                        break
    
                if phone_input is not None:
                    break
    
            except Exception:
                continue
    
        # =====================================================
        # Input not found
        # =====================================================
    
        if phone_input is None:
    
            print(
                "[BALE LOGIN] Phone input NOT FOUND."
            )
    
            self.debug_inputs()
    
            raise RuntimeError(
                "فیلد شماره موبایل در بله پیدا نشد."
            )
    
        # =====================================================
        # Enter phone
        # =====================================================
    
        phone_input.click()
    
        # پاک کردن مقدار قبلی
        phone_input.press("Control+A")
        phone_input.press("Backspace")
    
        # =====================================================
        # IMPORTANT:
        # استفاده از تایپ واقعی به جای fill
        # =====================================================
    
        phone_input.press_sequentially(
            phone,
            delay=50
        )
    
        # کمی فرصت برای React/Vue validation
        self.page.wait_for_timeout(1000)
    
        # =====================================================
        # Debug input value
        # =====================================================
    
        try:
    
            current_value = phone_input.input_value()
    
            print(
                "[BALE LOGIN] Phone input value:",
                current_value
            )
    
        except Exception as e:
    
            print(
                "[BALE LOGIN] Could not read phone value:",
                e
            )
    
        # =====================================================
        # Check submit button
        # =====================================================
    
        submit_button = self.page.locator(
            '[data-testid="submit-button"]'
        ).first
    
        submit_button.wait_for(
            state="visible",
            timeout=10000
        )
    
        try:
    
            disabled = submit_button.is_disabled()
    
            print(
                "[BALE LOGIN] Submit button disabled:",
                disabled
            )
    
        except Exception as e:
    
            print(
                "[BALE LOGIN] Could not check submit button:",
                e
            )
    
            disabled = True
    
        # =====================================================
        # If still disabled:
        # trigger blur/change event
        # =====================================================
    
        if disabled:
    
            print(
                "[BALE LOGIN] Submit still disabled."
            )
    
            print(
                "[BALE LOGIN] Triggering blur/change..."
            )
    
            phone_input.press("Tab")
    
            self.page.wait_for_timeout(500)
    
            try:
    
                disabled = submit_button.is_disabled()
    
                print(
                    "[BALE LOGIN] Submit button disabled after Tab:",
                    disabled
                )
    
            except Exception:
                pass
    
        # =====================================================
        # Final validation
        # =====================================================
    
        if disabled:
    
            print(
                "[BALE LOGIN] Phone input value:",
                phone_input.input_value()
            )
    
            raise RuntimeError(
                "دکمه تایید شماره در بله فعال نشد."
            )
    
        print(
            "[BALE LOGIN] Phone entered successfully."
        )
        
    # =========================================================
    # SUBMIT PHONE
    # =========================================================
   
    def submit_phone(self):
        print("[BALE LOGIN] Submitting phone...")
    
        submit_button = self.page.locator(
            '[data-testid="submit-button"]'
        ).first
    
        submit_button.wait_for(
            state="visible",
            timeout=10000
        )
    
        if submit_button.is_disabled():
            raise RuntimeError(
                "دکمه تایید شماره در بله فعال نیست."
            )
    
        submit_button.click()
    
        print(
            "[BALE LOGIN] Phone submitted."
        )
        
    # =========================================================
    # ENTER OTP
    # =========================================================

    def enter_otp(self, otp: str):

        otp = str(otp).strip()

        if not otp:

            raise ValueError(
                "OTP is empty."
            )

        print(
            "[BALE LOGIN] Entering OTP."
        )

        candidates = [

            self.page.get_by_role(
                "textbox",
                name="کد ورود"
            ),

            self.page.locator(
                'input[aria-label*="کد"]'
            ),

            self.page.locator(
                'input[placeholder*="کد"]'
            ),

            self.page.locator(
                'input[inputmode="numeric"]'
            ),

            self.page.locator(
                'input[type="tel"]'
            ),

            self.page.locator(
                'input[type="text"]'
            ),
        ]

        otp_input = None

        for candidate in candidates:

            try:

                count = candidate.count()

                if count == 0:
                    continue

                for i in range(count):

                    element = candidate.nth(i)

                    if element.is_visible():

                        otp_input = element

                        break

                if otp_input is not None:
                    break

            except Exception:

                continue

        # -----------------------------------------------------
        # OTP input not found
        # -----------------------------------------------------

        if otp_input is None:

            print(
                "[BALE LOGIN] OTP input NOT FOUND."
            )

            try:

                print(
                    self.page.locator(
                        "body"
                    ).inner_text()[:5000]
                )

            except Exception:

                pass

            raise RuntimeError(
                "فیلد کد ورود در بله پیدا نشد."
            )

        # -----------------------------------------------------
        # Fill OTP
        # -----------------------------------------------------

        otp_input.click()

        otp_input.fill(otp)

        print(
            "[BALE LOGIN] OTP entered."
        )

    # =========================================================
    # SUBMIT OTP
    # =========================================================

    def submit_otp(self):

        print(
            "[BALE LOGIN] Waiting for OTP submission..."
        )

        # ممکن است Bale خودش Submit کند
        self.page.wait_for_timeout(2000)

        if (
            "/chat" in self.page.url
            and "/login" not in self.page.url
        ):

            print(
                "[BALE LOGIN] Login completed automatically."
            )

            return

        print(
            "[BALE LOGIN] Current URL:",
            self.page.url
        )

        # -----------------------------------------------------
        # Find OTP submit button
        # -----------------------------------------------------

        candidates = [

            self.page.get_by_role(
                "button",
                name="تایید و ادامه"
            ),

            self.page.get_by_role(
                "button",
                name=re.compile(
                    "تایید و ادامه|ادامه|ورود|continue|login",
                    re.IGNORECASE
                )
            ),

            self.page.locator(
                'button[type="submit"]'
            ),
        ]

        submit_button = None

        for candidate in candidates:

            try:

                count = candidate.count()

                if count == 0:
                    continue

                for i in range(count):

                    element = candidate.nth(i)

                    if element.is_visible():

                        submit_button = element

                        break

                if submit_button is not None:
                    break

            except Exception:

                continue

        # -----------------------------------------------------
        # Login may have completed automatically
        # -----------------------------------------------------

        if submit_button is None:

            self.page.wait_for_timeout(1500)

            if (
                "/chat" in self.page.url
                and "/login" not in self.page.url
            ):

                print(
                    "[BALE LOGIN] Login completed."
                )

                return

            print(
                "[BALE LOGIN] OTP submit button NOT FOUND."
            )

            try:

                print(
                    "[BALE LOGIN] BODY:"
                )

                print(
                    self.page.locator(
                        "body"
                    ).inner_text()[:5000]
                )

            except Exception:

                pass

            raise RuntimeError(
                "دکمه تایید کد ورود پیدا نشد و Login انجام نشد."
            )

        # -----------------------------------------------------
        # Click submit
        # -----------------------------------------------------

        try:

            print(
                "[BALE LOGIN] Clicking OTP submit..."
            )

            submit_button.click(
                timeout=10000,
                force=True
            )

            print(
                "[BALE LOGIN] OTP submit clicked."
            )

        except Exception as e:

            print(
                "[BALE LOGIN] OTP submit click failed:",
                type(e).__name__,
                str(e)
            )

            # شاید Login انجام شده باشد
            self.page.wait_for_timeout(2000)

            if (
                "/chat" in self.page.url
                and "/login" not in self.page.url
            ):

                print(
                    "[BALE LOGIN] Login completed "
                    "despite button click issue."
                )

                return

            raise

        # -----------------------------------------------------
        # Wait for navigation / login
        # -----------------------------------------------------

        self.page.wait_for_timeout(3000)

        print(
            "[BALE LOGIN] URL after OTP:",
            self.page.url
        )

        print(
            "[BALE LOGIN] TITLE after OTP:",
            self.page.title()
        )

        # -----------------------------------------------------
        # Success
        # -----------------------------------------------------

        if (
            "/chat" in self.page.url
            and "/login" not in self.page.url
        ):

            print(
                "[BALE LOGIN] Login completed successfully."
            )

            return

        # -----------------------------------------------------
        # Login failed
        # -----------------------------------------------------

        print(
            "[BALE LOGIN] Login not completed yet."
        )

        try:

            print(
                "[BALE LOGIN] BODY AFTER OTP:"
            )

            print(
                self.page.locator(
                    "body"
                ).inner_text()[:5000]
            )

        except Exception:

            pass

        raise RuntimeError(
            "کد تایید وارد شد اما Login در بله تکمیل نشد."
        )
