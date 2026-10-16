from playwright.sync_api import TimeoutError as PlaywrightTimeoutError


class BalePage:

    def __init__(self, page):
        self.page = page


    # =========================================================
    # OPEN BALE
    # =========================================================

    def open_bale(self):

        print("\nOpening Bale...")

        try:

            self.page.goto(
                "https://web.bale.ai/chat",
                wait_until="domcontentloaded"
            )

            self.page.wait_for_timeout(
                3000
            )

            print(
                "Bale URL:",
                self.page.url
            )

            return True


        except Exception as e:

            print(
                "[BALE OPEN ERROR]"
            )

            print(
                f"{type(e).__name__}: {e}"
            )

            return False



    # =========================================================
    # AUTHENTICATION
    # =========================================================

    def is_authenticated(self):

        print(
            "\n[BALE AUTH] Checking authentication..."
        )

        try:

            current_url = self.page.url


            print(
                "[BALE AUTH] Current URL:",
                current_url
            )


            # -----------------------------
            # URL CHECK
            # -----------------------------

            if "/chat" in current_url:

                print(
                    "[BALE AUTH] Bale chat page detected."
                )

                return True


            if "/contacts" in current_url:

                print(
                    "[BALE AUTH] Bale contacts page detected."
                )

                return True


            if "/login" in current_url:

                print(
                    "[BALE AUTH] Login page detected."
                )

                return False



            # -----------------------------
            # BODY CHECK
            # -----------------------------

            try:

                body_text = self.page.locator(
                    "body"
                ).inner_text(
                    timeout=5000
                )


                keywords = [

                    "Chat",
                    "Contacts",
                    "گفتگو",
                    "مخاطبین",
                    "Bale"

                ]


                for keyword in keywords:

                    if keyword in body_text:

                        print(
                            "[BALE AUTH] Bale interface detected."
                        )

                        return True


            except Exception:

                pass



            print(
                "[BALE AUTH] Authentication could not be confirmed."
            )


            return False



        except Exception as e:

            print(
                "[BALE AUTH ERROR]"
            )

            print(
                f"{type(e).__name__}: {e}"
            )

            return False
    # =========================================================
    # OPEN CONTACTS
    # =========================================================

    def open_contacts(self):

        print("\n================================")
        print("OPEN CONTACTS")
        print("================================")

        try:

            print(
                "[CONTACTS] Current URL:",
                self.page.url
            )

            #
            # اگر قبلا داخل contacts هستیم
            #
            if "/contacts" in self.page.url:

                print(
                    "[CONTACTS] Already on contacts page."
                )

                return True


            self.page.wait_for_timeout(
                1000
            )


            #
            # Selectorهای احتمالی Contacts
            #
            selectors = [

                # نسخه فعلی بله
                'svg[aria-label="Contacts-icon"]',

                '[aria-label="Contacts-icon"]',

                '[aria-label*="Contacts"]',

                '[aria-label*="contacts"]',

                '[title="Contacts"]',

                '[title*="Contacts"]',

                '[role="button"][aria-label*="Contacts"]',

                'button[aria-label*="Contacts"]',

                'button:has-text("Contacts")',

                'text=Contacts'

            ]


            print(
                "[CONTACTS] Searching selectors..."
            )


            for selector in selectors:


                try:


                    locator = self.page.locator(
                        selector
                    )


                    count = locator.count()


                    print(
                        f"[CONTACTS] {selector} -> {count}"
                    )


                    if count == 0:

                        continue



                    for index in range(count):


                        element = locator.nth(
                            index
                        )


                        try:


                            if not element.is_visible():

                                continue



                            print(
                                "[CONTACTS] Clicking:",
                                selector,
                                "index:",
                                index
                            )



                            try:


                                element.click(
                                    timeout=3000
                                )


                            except Exception:


                                print(
                                    "[CONTACTS] Force click..."
                                )


                                element.click(
                                    force=True,
                                    timeout=3000
                                )



                            self.page.wait_for_timeout(
                                2000
                            )


                            #
                            # بررسی موفقیت
                            #
                            if "/contacts" in self.page.url:


                                print(
                                    "[CONTACTS] Opened successfully."
                                )


                                return True



                            #
                            # fallback بررسی متن صفحه
                            #
                            body = self.page.locator(
                                "body"
                            ).inner_text(
                                timeout=3000
                            )


                            if "Contacts" in body:


                                print(
                                    "[CONTACTS] Contacts UI detected."
                                )


                                return True



                        except Exception as e:


                            print(
                                "[CONTACTS] Click failed:",
                                type(e).__name__
                            )

                            continue



                except Exception as e:


                    print(
                        "[CONTACTS] Selector error:",
                        selector,
                        type(e).__name__
                    )

                    continue



            #
            # آخرین fallback:
            # رفتن مستقیم به route
            #
            print(
                "[CONTACTS] Trying direct route..."
            )


            try:


                self.page.goto(
                    "https://web.bale.ai/contacts",
                    wait_until="domcontentloaded"
                )


                self.page.wait_for_timeout(
                    3000
                )


                if "/contacts" in self.page.url:


                    print(
                        "[CONTACTS] Opened by direct route."
                    )

                    return True



            except Exception as e:


                print(
                    "[CONTACTS] Direct route failed:",
                    e
                )



            #
            # Screenshot برای دیباگ
            #
            try:


                self.page.screenshot(
                    path="/tmp/bale_contacts_failed.png",
                    full_page=True
                )


                print(
                    "[DEBUG] Screenshot:"
                    "/tmp/bale_contacts_failed.png"
                )


            except Exception:

                pass



            print(
                "[CONTACTS] Could not open contacts."
            )


            return False



        except Exception as e:


            print(
                "\n[OPEN CONTACTS ERROR]"
            )


            print(
                f"{type(e).__name__}: {e}"
            )


            return False

    # =========================================================
    # =========================================================
    # OPEN ADD CONTACT
    # =========================================================

    def open_add_contact(self):

        print("\\n================================")
        print("OPEN ADD CONTACT")
        print("================================")

        try:
            # If the form is already open (e.g. prepared after the previous
            # contact was added), reuse it instead of clicking the button twice.
            for selector in [
                'input[aria-label="شماره همراه"]',
                'input[placeholder*="شماره"]',
                'input[type="tel"]',
                'input[name*="phone" i]',
            ]:
                try:
                    existing_field = self.page.locator(selector).first
                    if existing_field.is_visible(timeout=1000):
                        print("[ADD CONTACT] Form is already open.")
                        return True
                except Exception:
                    continue

            # Ensure the contacts route is loaded before locating controls.
            if "/contacts" not in self.page.url:
                print("[ADD CONTACT] Navigating to contacts...")
                if not self.open_contacts():
                    print("[ADD CONTACT] Could not open contacts page.")
                    return False

            self.page.wait_for_load_state("domcontentloaded", timeout=10000)
            # The add-contact control can be below the viewport after prior
            # interactions; always search from the top of the page.
            try:
                self.page.evaluate("window.scrollTo(0, 0)")
                self.page.wait_for_timeout(300)
            except Exception:
                pass

            # Prefer accessible names and clickable controls; SVG-only selectors
            # are brittle because Bale can change icon aria-labels between builds.
            selectors = [
                'button[aria-label*="AddUser" i]',
                '[role="button"][aria-label*="AddUser" i]',
                'button[title*="افزودن" i]',
                '[role="button"][title*="افزودن" i]',
                'button[aria-label*="مخاطب" i]',
                '[role="button"][aria-label*="مخاطب" i]',
                'button:has-text("افزودن مخاطب")',
                '[role="button"]:has-text("افزودن مخاطب")',
                'button:has-text("افزودن")',
                '[role="button"]:has-text("افزودن")',
                '[aria-label="AddUser-icon"]',
                'svg[aria-label="AddUser-icon"]',
                '[aria-label*="AddUser" i]',
                '[aria-label*="add contact" i]',
                '[title*="Add contact" i]',
                '[data-testid*="add-contact" i]',
                '[data-testid*="add-user" i]',
            ]

            add_control = None
            for selector in selectors:
                try:
                    locator = self.page.locator(selector)
                    count = locator.count()
                    print(f"[ADD CONTACT] {selector} => {count}")

                    for index in range(count):
                        candidate = locator.nth(index)
                        if not candidate.is_visible():
                            continue

                        # If the match is an SVG/icon, click its nearest
                        # interactive ancestor rather than the decorative SVG.
                        try:
                            tag_name = candidate.evaluate("(el) => el.tagName.toLowerCase()")
                        except Exception:
                            tag_name = ""

                        if tag_name == "svg":
                            parent_button = candidate.locator(
                                "xpath=ancestor-or-self::*[self::button or @role='button'][1]"
                            )
                            if parent_button.count() and parent_button.first.is_visible():
                                candidate = parent_button.first

                        add_control = candidate
                        print("[ADD CONTACT] Candidate found:", selector)
                        break

                    if add_control is not None:
                        break
                except Exception as e:
                    print("[ADD CONTACT] Selector skipped:", selector, type(e).__name__)

            if add_control is None:
                # Diagnostic snapshot helps identify a changed UI label/DOM.
                try:
                    print("[ADD CONTACT] Visible buttons:")
                    buttons = self.page.locator('button, [role="button"]')
                    for i in range(min(buttons.count(), 80)):
                        item = buttons.nth(i)
                        if item.is_visible():
                            label = (item.get_attribute("aria-label") or "").strip()
                            title = (item.get_attribute("title") or "").strip()
                            text_value = (item.inner_text(timeout=1000) or "").strip()
                            print(f"[ADD CONTACT] button[{i}] aria={label!r} title={title!r} text={text_value[:120]!r}")
                    self.page.screenshot(path="/tmp/add_contact_failed.png", full_page=True)
                except Exception:
                    pass

                print("[ADD CONTACT] No supported add-contact control found.")
                return False

            try:
                add_control.click(timeout=7000)
            except Exception as click_error:
                print("[ADD CONTACT] Normal click failed:", type(click_error).__name__)
                add_control.click(force=True, timeout=5000)

            # Wait for the form by locator state, not a fixed short sleep.
            input_selectors = [
                'input[aria-label="شماره همراه"]',
                'input[placeholder*="شماره"]',
                'input[type="tel"]',
                'input[name*="phone" i]',
            ]

            for selector in input_selectors:
                try:
                    field = self.page.locator(selector).first
                    field.wait_for(state="visible", timeout=7000)
                    print("[ADD CONTACT] Add-contact form opened.")
                    return True
                except Exception:
                    continue

            print("[ADD CONTACT] Control was clicked but phone field did not appear.")
            try:
                print(self.page.locator("body").inner_text(timeout=3000)[:3000])
                self.page.screenshot(path="/tmp/add_contact_failed.png", full_page=True)
            except Exception:
                pass
            return False

        except Exception as e:
            print("[OPEN ADD CONTACT ERROR]", f"{type(e).__name__}: {e}")
            return False

    # ADD CONTACT (FIXED)
    # =========================================================

    def add_contact(self, phone, name):
        print("\\n================================")
        print("ADD CONTACT")
        print("================================")
        print("Phone:", phone)
        print("Name:", name)

        def result(success, status, message):
            return {"success": success, "status": status, "message": message}

        def refresh_contacts_page():
            """Return to the clean contacts page and verify the add control is back."""
            try:
                if "/contacts" in self.page.url:
                    self.page.reload(wait_until="domcontentloaded", timeout=30000)
                else:
                    self.page.goto("https://web.bale.ai/contacts", wait_until="domcontentloaded", timeout=30000)

                self.page.wait_for_load_state("domcontentloaded", timeout=10000)
                try:
                    self.page.evaluate("window.scrollTo(0, 0)")
                except Exception:
                    pass

                # Wait for the contacts UI to finish rendering. A URL alone is
                # not enough: the next iteration needs the add-contact control.
                ready_selectors = [
                    'button[aria-label*="AddUser" i]',
                    '[role="button"][aria-label*="AddUser" i]',
                    '[aria-label="AddUser-icon"]',
                    'svg[aria-label="AddUser-icon"]',
                    'button:has-text("افزودن مخاطب")',
                    '[role="button"]:has-text("افزودن مخاطب")',
                    'button:has-text("افزودن")',
                    '[role="button"]:has-text("افزودن")',
                ]
                deadline = time.monotonic() + 12
                while time.monotonic() < deadline:
                    if "/contacts" not in self.page.url:
                        self.page.goto("https://web.bale.ai/contacts", wait_until="domcontentloaded", timeout=30000)
                    for selector in ready_selectors:
                        try:
                            loc = self.page.locator(selector)
                            for idx in range(min(loc.count(), 10)):
                                if loc.nth(idx).is_visible():
                                    print("[ADD CONTACT] Contacts page refreshed; add control is visible.")
                                    return True
                        except Exception:
                            continue
                    self.page.wait_for_timeout(400)

                self.page.screenshot(path="/tmp/add_contact_refresh_not_ready.png", full_page=True)
                print("[ADD CONTACT] Refresh completed but add-contact control did not become visible.")
                return False
            except Exception as refresh_error:
                print("[ADD CONTACT] Refresh failed:", f"{type(refresh_error).__name__}: {refresh_error}")
                return False

        try:
            if not self.open_add_contact():
                return result(False, "form_not_open", "فرم افزودن مخاطب باز نشد")

            phone = str(phone).strip()
            if phone.startswith("+98"):
                phone = phone[3:]
            elif phone.startswith("98"):
                phone = phone[2:]
            elif phone.startswith("0"):
                phone = phone[1:]
            name = str(name).strip()

            phone_input = None
            for selector in [
                'input[aria-label="شماره همراه"]',
                'input[placeholder*="شماره"]',
                'input[type="tel"]',
                'input[name*="phone" i]',
            ]:
                try:
                    candidate = self.page.locator(selector).first
                    candidate.wait_for(state="visible", timeout=3000)
                    phone_input = candidate
                    break
                except Exception:
                    continue
            if phone_input is None:
                return result(False, "phone_field_missing", "فیلد شماره همراه پیدا نشد")

            name_input = None
            for selector in [
                'input[aria-label="نام"]',
                'input[placeholder*="نام"]',
                'input[name*="name" i]',
            ]:
                try:
                    candidate = self.page.locator(selector).first
                    candidate.wait_for(state="visible", timeout=3000)
                    name_input = candidate
                    break
                except Exception:
                    continue
            if name_input is None:
                return result(False, "name_field_missing", "فیلد نام پیدا نشد")

            phone_input.fill(phone)
            name_input.fill(name)

            # Snapshot the page before submission so old notifications cannot
            # be mistaken for a new confirmation for this contact.
            try:
                before_text = self.page.locator("body").inner_text(timeout=3000)
            except Exception:
                before_text = ""

            add_button = self.page.get_by_text("افزودن", exact=True).last
            add_button.wait_for(state="visible", timeout=5000)
            add_button.click(timeout=5000)

            success_phrases = [
                "مخاطب اضافه شد",
                "مخاطب با موفقیت اضافه شد",
                "با موفقیت اضافه شد",
                "مخاطب با موفقیت ذخیره شد",
                "با موفقیت ذخیره شد",
                "Contact added",
                "Contact added successfully",
                "Added successfully",
            ]
            error_phrases = [
                "شماره معتبر نیست",
                "شماره تلفن نامعتبر",
                "مخاطب پیدا نشد",
                "کاربر پیدا نشد",
                "قبلاً وجود دارد",
                "قبلا وجود دارد",
                "تکراری",
                "ناموفق",
                "Invalid phone",
                "already exists",
            ]

            confirmed = False
            observed_text = ""
            deadline_seconds = 15
            for _ in range(deadline_seconds * 2):
                try:
                    observed_text = self.page.locator("body").inner_text(timeout=2000)
                except Exception:
                    observed_text = ""

                new_text = observed_text[len(before_text):] if observed_text.startswith(before_text) else observed_text
                lowered = observed_text.casefold()
                before_lowered = before_text.casefold()

                matched_success = next(
                    (
                        phrase for phrase in success_phrases
                        if phrase.casefold() in lowered
                        and lowered.count(phrase.casefold()) > before_lowered.count(phrase.casefold())
                    ),
                    None,
                )
                if matched_success:
                    print("[ADD CONTACT] Fresh Bale confirmation:", matched_success)
                    confirmed = True
                    break

                matched_error = next(
                    (
                        phrase for phrase in error_phrases
                        if phrase.casefold() in lowered
                        and lowered.count(phrase.casefold()) > before_lowered.count(phrase.casefold())
                    ),
                    None,
                )
                if matched_error:
                    print("[ADD CONTACT] Bale rejected contact:", matched_error)
                    break

                self.page.wait_for_timeout(500)

            # Refresh after every submission (success, rejection, or timeout).
            # The next contact starts from the clean contacts page and clicks
            # Add Contact again rather than reusing a stale form.
            page_ready = refresh_contacts_page()

            if confirmed and page_ready:
                return result(True, "success", "تأیید جدید بله دریافت شد و صفحه برای مخاطب بعدی آماده است")
            if confirmed and not page_ready:
                return result(False, "refresh_failed", "افزودن تأیید شد اما صفحه مخاطبین و دکمه افزودن پس از رفرش آماده نشد")

            print("[ADD CONTACT] No fresh success confirmation; do not count as added.")
            try:
                self.page.screenshot(path="/tmp/add_contact_unconfirmed.png", full_page=True)
            except Exception:
                pass
            return result(False, "unconfirmed", "تأیید جدید بله دریافت نشد؛ مخاطب به‌عنوان موفق ثبت نمی‌شود" + ("" if page_ready else "؛ صفحه پس از رفرش آماده نشد"))

        except Exception as e:
            print("[ADD CONTACT ERROR]", f"{type(e).__name__}: {e}")
            try:
                self.page.screenshot(path="/tmp/add_contact_failed.png", full_page=True)
            except Exception:
                pass
            refresh_contacts_page()
            return result(False, "error", "خطا هنگام افزودن مخاطب: " + str(e))

    # =========================================================
    # OPEN SEARCH
    # =========================================================

    def open_search(self):

        print("\n================================")
        print("OPEN SEARCH")
        print("================================")

        selectors = [

            'svg[aria-label="Search-icon"]',

            '[aria-label="Search-icon"]',

            '[aria-label*="Search"]',

            '[aria-label*="search"]',

            '[title*="Search"]',

            '[title*="search"]',

            'button[aria-label*="Search"]',

            '[role="button"][aria-label*="Search"]'

        ]


        for selector in selectors:

            try:

                locator = self.page.locator(
                    selector
                )

                count = locator.count()


                print(
                    f"[SEARCH] selector={selector} "
                    f"count={count}"
                )


                if count == 0:
                    continue


                for i in range(count):

                    element = locator.nth(i)


                    try:

                        if not element.is_visible():
                            continue


                        print(
                            "[SEARCH] Visible search found:",
                            selector,
                            "index:",
                            i
                        )


                        try:

                            element.click(
                                timeout=5000
                            )

                            print(
                                "[SEARCH] Normal click success"
                            )


                        except Exception as e:

                            print(
                                "[SEARCH] Normal click failed:"
                            )

                            print(
                                type(e).__name__
                            )


                            element.click(
                                force=True,
                                timeout=5000
                            )


                            print(
                                "[SEARCH] Force click success"
                            )


                        self.page.wait_for_timeout(
                            1000
                        )


                        # پیدا کردن input سرچ

                        search_inputs = [

                            'input[type="search"]',

                            'input[placeholder*="جستجو"]',

                            'input[placeholder*="Search"]',

                            'input'

                        ]


                        for inp in search_inputs:

                            try:

                                box = self.page.locator(
                                    inp
                                ).last


                                if box.is_visible():

                                    print(
                                        "[SEARCH] Input found:",
                                        inp
                                    )

                                    return True


                            except Exception:
                                continue



                    except Exception:

                        continue


            except Exception as e:

                print(
                    "[SEARCH selector error]",
                    selector,
                    type(e).__name__
                )



        # =====================================================
        # KEYBOARD FALLBACK
        # =====================================================

        print(
            "[SEARCH] Trying keyboard shortcut fallback..."
        )


        try:

            self.page.keyboard.press(
                "Control+K"
            )

            self.page.wait_for_timeout(
                1500
            )


            inputs = self.page.locator(
                "input"
            )


            count = inputs.count()


            print(
                "[SEARCH] Inputs after shortcut:",
                count
            )


            for i in range(count):

                inp = inputs.nth(i)

                try:

                    if inp.is_visible():

                        print(
                            "[SEARCH] Input opened by shortcut"
                        )

                        return True


                except Exception:
                    continue


        except Exception as e:

            print(
                "[SEARCH shortcut failed]",
                e
            )



        try:

            self.page.screenshot(
                path="/tmp/bale_search_open_failed.png",
                full_page=True
            )


        except Exception:
            pass



        print(
            "[SEARCH] Could not open search."
        )


        return False




    # =========================================================
    # SEARCH CONTACT
    # =========================================================
   
    def search_contact(self, query):

        print("\n================================")
        print("SEARCH CONTACT")
        print("================================")

        search_text = str(query).strip()

        print(
            "Searching:",
            search_text
        )

        try:

            # -------------------------------------------------
            # اول برگردیم به صفحه اصلی Bale
            # تا Search-icon در UI وجود داشته باشد
            # -------------------------------------------------

            if "/chat" not in self.page.url:

                print(
                    "[SEARCH] Returning to Bale chat..."
                )

                self.page.goto(
                    "https://web.bale.ai/chat",
                    wait_until="domcontentloaded"
                )

                self.page.wait_for_timeout(
                    2000
                )
                print (
                    "[SEARCH]Current URL:",
                    self.page.url
                )
            # -------------------------------------------------
            # OPEN SEARCH
            # -------------------------------------------------

            if not self.open_search():

                print(
                    "[SEARCH ERROR] Search open failed"
                )

                return False

            # -------------------------------------------------
            # FIND SEARCH INPUT
            # -------------------------------------------------

            search_input = None

            possible_inputs = [

                'input[type="search"]',

                'input[placeholder*="جستجو"]',

                'input[placeholder*="Search"]',

                'input'

            ]

            for selector in possible_inputs:

                try:

                    locator = self.page.locator(
                        selector
                    )

                    count = locator.count()

                    for i in range(count):

                        item = locator.nth(i)

                        if item.is_visible():

                            search_input = item

                            print(
                                "[SEARCH] Using input:",
                                selector
                            )

                            break

                    if search_input:

                        break

                except Exception:

                    continue

            if search_input is None:

                print(
                    "[SEARCH ERROR] Input not found"
                )
                try:
                    self.page.screenshot(
                        path="/tmp/bale_search_input_not_found.png",
                        full_page=True
                    )
                except Exception:
                    pass

                return False
                

            # -------------------------------------------------
            # ENTER SEARCH
            # -------------------------------------------------

            try:

                search_input.fill("")

            except Exception:

                pass

            search_input.fill(
                search_text
            )

            print(
                "[SEARCH] Text entered:",
                search_text
            )

            self.page.wait_for_timeout(
                1000
            )

            # -------------------------------------------------
            # ENTER
            # -------------------------------------------------

            search_input.press(
                "Enter"
            )

            print(
                "[SEARCH] Enter pressed"
            )

            self.page.wait_for_timeout(
                2500
            )

            # -------------------------------------------------
            # RESULT
            # -------------------------------------------------

            body = self.page.locator(
                "body"
            ).inner_text()

            print(
                "\n[SEARCH RESULT]"
            )

            print(
                "----------------------------"
            )

            print(
                body[:5000]
            )

            print(
                "----------------------------"
            )

            # -------------------------------------------------
            # CHECK RESULT
            # -------------------------------------------------

            if search_text in body:

                print(
                    "[SEARCH SUCCESS]",
                    search_text
                )

                return True

            no_result = [

                "نتیجه‌ای پیدا نشد",

                "نتیجه ای پیدا نشد",

                "پیدا نشد",

                "موردی وجود ندارد"

            ]

            for msg in no_result:

                if msg in body:

                    print(
                        "[SEARCH NOT FOUND]",
                        msg
                    )

                    return False

            print(
                "[SEARCH UNKNOWN RESULT]"
            )

            try:

                self.page.screenshot(
                    path="/tmp/bale_search_unknown.png",
                    full_page=True
                )

            except Exception:

                pass

            return False

        except Exception as e:

            print(
                "\n[SEARCH CONTACT ERROR]"
            )

            print(
                f"{type(e).__name__}: {e}"
            )

            try:

                self.page.screenshot(
                    path="/tmp/bale_search_exception.png",
                    full_page=True
                )

            except Exception:

                pass

            return False
