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
    # OPEN ADD CONTACT (FIXED)
    # =========================================================

    def open_add_contact(self):

        print("\n================================")
        print("OPEN ADD CONTACT")
        print("================================")

        try:

            # مطمئن شویم داخل contacts هستیم
            if "/contacts" not in self.page.url:

                print(
                    "[ADD CONTACT] Contacts page required..."
                )

                if not self.open_contacts():

                    print(
                        "[ADD CONTACT] Cannot open contacts."
                    )

                    return False


            # -------------------------------------------------
            # CLOSE OLD MODALS / OVERLAYS
            # -------------------------------------------------

            try:

                overlays = self.page.locator(
                    ".ReactModal__Overlay"
                )

                count = overlays.count()

                print(
                    "[ADD CONTACT] Existing overlays:",
                    count
                )


                for i in range(count):

                    try:

                        overlay = overlays.nth(i)

                        if overlay.is_visible():

                            print(
                                "[ADD CONTACT] Closing old overlay..."
                            )

                            self.page.keyboard.press(
                                "Escape"
                            )

                            self.page.wait_for_timeout(
                                500
                            )

                    except Exception:
                        pass


            except Exception:

                pass



            # -------------------------------------------------
            # FIND ADD USER ICON
            # -------------------------------------------------

            selectors = [

                'svg[aria-label="AddUser-icon"]',

                '[aria-label="AddUser-icon"]',

                '[aria-label*="AddUser"]',

                '[aria-label*="add"]',

                'svg[title*="Add"]'

            ]


            add_user = None


            for selector in selectors:

                try:

                    loc = self.page.locator(
                        selector
                    )

                    count = loc.count()


                    print(
                        f"[ADD CONTACT] "
                        f"{selector} => {count}"
                    )


                    for i in range(count):

                        candidate = loc.nth(i)

                        if candidate.is_visible():

                            add_user = candidate

                            print(
                                "[ADD CONTACT] Icon found:",
                                selector
                            )

                            break


                    if add_user:
                        break


                except Exception:

                    continue



            if add_user is None:

                print(
                    "[ADD CONTACT] Add icon not found."
                )

                return False



            # -------------------------------------------------
            # CLICK ICON
            # -------------------------------------------------

            clicked = False


            try:

                add_user.click(
                    timeout=5000
                )

                clicked = True

                print(
                    "[ADD CONTACT] Normal click OK."
                )


            except Exception as e:

                print(
                    "[ADD CONTACT] Normal click failed:"
                )

                print(
                    type(e).__name__
                )


                try:

                    add_user.click(
                        force=True,
                        timeout=5000
                    )

                    clicked = True


                    print(
                        "[ADD CONTACT] Force click OK."
                    )


                except Exception as e:

                    print(
                        "[ADD CONTACT] Force click failed:"
                    )

                    print(
                        e
                    )


            if not clicked:

                return False



            self.page.wait_for_timeout(
                1000
            )



            # -------------------------------------------------
            # CHECK MODAL INPUT
            # -------------------------------------------------

            input_selectors = [

                'input[aria-label="شماره همراه"]',

                'input[placeholder*="شماره"]',

                'input[type="tel"]',

                'input[name*="phone"]'

            ]


            for selector in input_selectors:

                try:

                    field = self.page.locator(
                        selector
                    ).first


                    if field.is_visible(
                        timeout=3000
                    ):

                        print(
                            "[ADD CONTACT] Modal opened."
                        )

                        return True


                except Exception:

                    continue



            # -------------------------------------------------
            # DEBUG
            # -------------------------------------------------

            print(
                "[ADD CONTACT] Modal not detected."
            )


            try:

                body = self.page.locator(
                    "body"
                ).inner_text()


                print(
                    body[:3000]
                )


                self.page.screenshot(
                    path="/tmp/add_contact_failed.png",
                    full_page=True
                )


            except Exception:

                pass



            return False



        except Exception as e:


            print(
                "[OPEN ADD CONTACT ERROR]"
            )

            print(
                f"{type(e).__name__}: {e}"
            )


            return False




    # =========================================================
    # ADD CONTACT (FIXED)
    # =========================================================

    def add_contact(
        self,
        phone,
        name
    ):


        print("\n================================")
        print("ADD CONTACT")
        print("================================")


        print(
            "Phone:",
            phone
        )

        print(
            "Name:",
            name
        )


        try:


            if not self.open_add_contact():

                return {

                    "success": False,

                    "status": "error",

                    "message":
                    "فرم افزودن مخاطب باز نشد"

                }



            # normalize phone

            phone = str(
                phone
            ).strip()


            if phone.startswith("+98"):

                phone = phone[3:]


            elif phone.startswith("98"):

                phone = phone[2:]


            elif phone.startswith("0"):

                phone = phone[1:]


            print(
                "Normalized phone:",
                phone
            )



            phone_input = None



            for selector in [

                'input[aria-label="شماره همراه"]',

                'input[placeholder*="شماره"]',

                'input[type="tel"]'

            ]:

                try:

                    loc = self.page.locator(
                        selector
                    ).first


                    if loc.is_visible(
                        timeout=3000
                    ):

                        phone_input = loc

                        break


                except Exception:

                    continue



            if phone_input is None:

                print(
                    "Phone input not found"
                )

                return False



            phone_input.fill(
                phone
            )


            print(
                "Phone entered"
            )



            name_input = self.page.locator(
                'input[aria-label="نام"]'
            ).first


            name_input.fill(
                str(name)
            )


            print(
                "Name entered"
            )



            self.page.wait_for_timeout(
                500
            )



            add_button = self.page.get_by_text(
                "افزودن",
                exact=True
            ).last



            add_button.click(
                force=True
            )


            print(
                "Add clicked"
            )


            self.page.wait_for_timeout(
                2000
            )



            return {

                "success": True,

                "status":
                "success",

                "message":
                "مخاطب اضافه شد"

            }



        except Exception as e:


            print(
                "[ADD CONTACT ERROR]"
            )


            print(
                f"{type(e).__name__}: {e}"
            )


            return {

                "success": False,

                "status":
                "error",

                "message":
                str(e)

            }

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

    def search_contact(
        self,
        query
    ):


        print("\n================================")
        print("SEARCH CONTACT")
        print("================================")


        search_text = str(
            query
        ).strip()


        print(
            "Searching:",
            search_text
        )


        try:


            # اطمینان از صفحه contacts

            if "/contacts" not in self.page.url:


                print(
                    "[SEARCH] Opening contacts page..."
                )


                self.page.goto(

                    "https://web.bale.ai/contacts",

                    wait_until="domcontentloaded"

                )


                self.page.wait_for_timeout(
                    2000
                )



            print(
                "[SEARCH] Current URL:",
                self.page.url
            )



            if not self.open_search():

                print(
                    "[SEARCH ERROR] Search open failed"
                )

                return False



            # پیدا کردن input

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


                return False



            # پاک کردن سرچ قبلی

            try:

                search_input.fill(
                    ""
                )

            except Exception:
                pass



            search_input.fill(
                search_text
            )


            print(
                "[SEARCH] Text entered:",
                search_text
            )



            search_input.press(
                "Enter"
            )


            print(
                "[SEARCH] Enter pressed"
            )


            self.page.wait_for_timeout(
                3000
            )



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



            # نتیجه پیدا شد

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


            self.page.screenshot(

                path="/tmp/bale_search_unknown.png",

                full_page=True

            )


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
