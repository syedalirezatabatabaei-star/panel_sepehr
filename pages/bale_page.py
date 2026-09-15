from playwright.sync_api import TimeoutError as PlaywrightTimeoutError


class BalePage:

    def __init__(self, page):
        self.page = page

    # =========================================================
    # OPEN BALE
    # =========================================================

    def open_bale(self):

        print("\nOpening Bale...")

        self.page.goto(
            "https://web.bale.ai/chat",
            wait_until="domcontentloaded"
        )

        self.page.wait_for_timeout(3000)

        print(
            "Bale URL:",
            self.page.url
        )

        return True

    # =========================================================
    # AUTHENTICATION
    # =========================================================

    def is_authenticated(self):

        print("\n[BALE AUTH] Checking authentication...")

        try:

            current_url = self.page.url

            print(
                "[BALE AUTH] Current URL:",
                current_url
            )

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

            body_text = self.page.locator(
                "body"
            ).inner_text()

            if "گفتگو" in body_text:

                print(
                    "[BALE AUTH] Bale interface detected."
                )

                return True

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

        print("\nOpening Contacts...")

        try:

            contacts_icon = self.page.locator(
                'svg[aria-label="Contacts-icon"]'
            ).first

            print(
                "Contacts icon count:",
                self.page.locator(
                    'svg[aria-label="Contacts-icon"]'
                ).count()
            )

            contacts_icon.wait_for(
                state="visible",
                timeout=10000
            )

            try:

                contacts_icon.click(
                    timeout=5000
                )

                print(
                    "Contacts opened with normal click."
                )

            except Exception:

                print(
                    "Normal Contacts click failed."
                )

                print(
                    "Trying force click..."
                )

                contacts_icon.click(
                    force=True,
                    timeout=5000
                )

                print(
                    "Contacts opened with force click."
                )

            self.page.wait_for_timeout(
                1500
            )

            print(
                "Contacts URL:",
                self.page.url
            )

            return True

        except PlaywrightTimeoutError as e:

            print(
                "[CONTACTS TIMEOUT]"
            )

            print(e)

            return False

        except Exception as e:

            print(
                "[CONTACTS ERROR]"
            )

            print(
                f"{type(e).__name__}: {e}"
            )

            return False

    # =========================================================
    # OPEN ADD CONTACT
    # =========================================================

    def open_add_contact(self):

        print("\nOpening Add Contact...")

        try:

            if "/contacts" not in self.page.url:

                print(
                    "[BALE] Opening Contacts first..."
                )

                if not self.open_contacts():

                    print(
                        "[ERROR] Could not open Contacts."
                    )

                    return False

            add_user = self.page.locator(
                'svg[aria-label="AddUser-icon"]'
            ).first

            print(
                "AddUser icon count:",
                self.page.locator(
                    'svg[aria-label="AddUser-icon"]'
                ).count()
            )

            add_user.wait_for(
                state="visible",
                timeout=10000
            )

            try:

                add_user.click(
                    timeout=5000
                )

                print(
                    "Add Contact opened with normal click."
                )

            except Exception as e:

                print(
                    "Normal Add Contact click failed."
                )

                print(
                    f"Reason: {type(e).__name__}: {e}"
                )

                print(
                    "Trying force click..."
                )

                add_user.click(
                    force=True,
                    timeout=5000
                )

                print(
                    "Add Contact opened with force click."
                )

            self.page.wait_for_timeout(
                1000
            )

            phone_input = self.page.locator(
                'input[aria-label="شماره همراه"]'
            ).first

            phone_input.wait_for(
                state="visible",
                timeout=10000
            )

            print(
                "Add Contact form opened."
            )

            return True

        except PlaywrightTimeoutError as e:

            print(
                "\n[ADD CONTACT FORM TIMEOUT]"
            )

            print(e)

            return False

        except Exception as e:

            print(
                "\n[ADD CONTACT FORM ERROR]"
            )

            print(
                f"{type(e).__name__}: {e}"
            )

            return False

    # =========================================================
    # ADD CONTACT
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

                print(
                    "[ERROR] Add Contact form did not open."
                )

                return {
                    "success": False,
                    "status": "error",
                    "message": "فرم افزودن مخاطب باز نشد"
                }

            original_phone = str(
                phone
            ).strip()

            normalized_phone = original_phone

            if normalized_phone.startswith("+98"):

                normalized_phone = normalized_phone[3:]

            elif normalized_phone.startswith("98"):

                normalized_phone = normalized_phone[2:]

            elif normalized_phone.startswith("0"):

                normalized_phone = normalized_phone[1:]

            print(
                "Original phone:",
                original_phone
            )

            print(
                "Normalized phone:",
                normalized_phone
            )

            phone_input = self.page.locator(
                'input[aria-label="شماره همراه"]'
            ).first

            phone_input.wait_for(
                state="visible",
                timeout=10000
            )

            phone_input.fill(
                normalized_phone
            )

            print(
                "Phone entered."
            )

            name_input = self.page.locator(
                'input[aria-label="نام"]'
            ).first

            name_input.wait_for(
                state="visible",
                timeout=10000
            )

            clean_name = str(
                name
            ).strip()

            name_input.fill(
                clean_name
            )

            print(
                "Name entered:",
                clean_name
            )

            self.page.wait_for_timeout(
                500
            )

            add_button = self.page.get_by_text(
                "افزودن",
                exact=True
            ).last

            add_button.wait_for(
                state="visible",
                timeout=10000
            )

            print(
                "[BALE] Add button found."
            )

            try:

                add_button.click(
                    timeout=5000
                )

                print(
                    "[BALE] Add button clicked."
                )

            except Exception as e:

                print(
                    "[BALE] Normal Add click failed."
                )

                print(
                    f"Reason: {type(e).__name__}: {e}"
                )

                add_button.click(
                    force=True,
                    timeout=5000
                )

                print(
                    "[BALE] Add button force-clicked."
                )

            self.page.wait_for_timeout(
                2000
            )

            body_text = self.page.locator(
                "body"
            ).inner_text()

            print(
                "\n[BALE] ADD CONTACT RESULT:"
            )

            print(
                "--------------------------------"
            )

            print(
                body_text[:3000]
            )

            print(
                "--------------------------------"
            )

            not_registered_messages = [

                "کاربری با این شماره پیدا نشد",
                "این شماره در بله ثبت نشده",
                "کاربر پیدا نشد",
                "کاربر یافت نشد",
                "وجود ندارد",
                "ثبت نشده",
                "یافت نشد"

            ]

            for msg in not_registered_messages:

                if msg in body_text:

                    print(
                        f"[NOT REGISTERED] "
                        f"{original_phone} - {clean_name}"
                    )

                    return {
                        "success": False,
                        "status": "not_registered",
                        "message": msg
                    }

            try:

                phone_input.wait_for(
                    state="hidden",
                    timeout=3000
                )

                print(
                    f"[ADD CONTACT SUCCESS] "
                    f"{original_phone} - {clean_name}"
                )

                return {
                    "success": True,
                    "status": "success",
                    "message": "مخاطب اضافه شد"
                }

            except Exception:

                pass

            if clean_name and clean_name in body_text:

                print(
                    f"[ADD CONTACT SUCCESS] "
                    f"{original_phone} - {clean_name}"
                )

                return {
                    "success": True,
                    "status": "success",
                    "message": "مخاطب اضافه شد"
                }

            print(
                f"[ADD CONTACT UNKNOWN] "
                f"{original_phone} - {clean_name}"
            )

            return {
                "success": False,
                "status": "unknown",
                "message": "نتیجه افزودن مشخص نیست"
            }

        except PlaywrightTimeoutError as e:

            print(
                f"[ADD CONTACT TIMEOUT] "
                f"{phone} - {name}"
            )

            print(e)

            return {
                "success": False,
                "status": "error",
                "message": "Timeout"
            }

        except Exception as e:

            print(
                f"[ADD CONTACT ERROR] "
                f"{phone} - {name}"
            )

            print(
                f"{type(e).__name__}: {e}"
            )

            return {
                "success": False,
                "status": "error",
                "message": str(e)
            }

    # =========================================================
    # OPEN SEARCH
    # =========================================================

    def open_search(self):

        print("\nOpening Search...")

        try:

            search_icon = self.page.locator(
                'svg[aria-label="Search-icon"]'
            ).first

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

            self.page.wait_for_timeout(
                1000
            )

            search_input = self.page.locator(
                'input[type="search"]'
            ).first

            search_input.wait_for(
                state="visible",
                timeout=10000
            )

            print(
                "Search input found."
            )

            return True

        except Exception as e:

            print(
                "\n[SEARCH OPEN ERROR]"
            )

            print(
                f"{type(e).__name__}: {e}"
            )

            return False

    # =========================================================
    # SEARCH CONTACT BY NAME / PHONE
    # =========================================================

    def search_contact(
        self,
        name
    ):

        print("\n================================")
        print("SEARCH CONTACT")
        print("================================")

        search_name = str(
            name
        ).strip()

        print(
            "Search name:",
            search_name
        )

        try:

            self.page.goto(
                "https://web.bale.ai/contacts",
                wait_until="domcontentloaded"
            )

            self.page.wait_for_timeout(
                1500
            )

            print(
                "Contacts URL:",
                self.page.url
            )

            if not self.open_search():

                print(
                    "[ERROR] Search could not be opened."
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
                search_name
            )

            print(
                "Name entered into Contacts search:",
                search_name
            )

            search_input.press(
                "Enter"
            )

            print(
                "Search submitted."
            )

            self.page.wait_for_timeout(
                2500
            )

            print(
                "URL after search:",
                self.page.url
            )

            body_text = self.page.locator(
                "body"
            ).inner_text()

            print(
                "\nCONTACT SEARCH RESULT:"
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

            no_result_messages = [

                "نتیجه‌ای پیدا نشد",
                "نتیجه ای پیدا نشد",
                "موردی پیدا نشد",
                "پیدا نشد"

            ]

            for msg in no_result_messages:

                if msg in body_text:

                    print(
                        f"[ERROR] Contact not found: "
                        f"{search_name}"
                    )

                    return False

            if search_name in body_text:

                print(
                    f"[SUCCESS] Contact found: "
                    f"{search_name}"
                )

                return True

            self.page.screenshot(
                path="/tmp/bale_contact_search.png",
                full_page=True
            )

            print(
                "[DEBUG] Screenshot saved:"
                " /tmp/bale_contact_search.png"
            )

            print(
                f"[ERROR] Contact not found: "
                f"{search_name}"
            )

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

                print(
                    "[DEBUG] Error screenshot saved:"
                    " /tmp/bale_contact_search_error.png"
                )

            except Exception:

                pass

            return False

    # =========================================================
    # OPEN DIALOG BY NAME
    # =========================================================

    def open_dialog_by_name(
        self,
        name
    ):

        print(
            "\nOpening dialog by name:",
            name
        )

        target_name = str(
            name
        ).strip()

        try:

            dialog_items = self.page.locator(
                '[aria-label="dialog-item"]'
            )

            count = dialog_items.count()

            print(
                "Dialog items:",
                count
            )

            for i in range(count):

                item = dialog_items.nth(i)

                try:

                    text = item.inner_text(
                        timeout=2000
                    )

                    if target_name in text:

                        print(
                            "Matching dialog found:",
                            text
                        )

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

                        print(
                            "Dialog opened."
                        )

                        return True

                except Exception:

                    continue

            exact_text = self.page.get_by_text(
                target_name,
                exact=True
            ).last

            if exact_text.count() > 0:

                exact_text.wait_for(
                    state="visible",
                    timeout=5000
                )

                try:

                    exact_text.click(
                        timeout=5000
                    )

                except Exception:

                    exact_text.click(
                        force=True,
                        timeout=5000
                    )

                self.page.wait_for_timeout(
                    1500
                )

                print(
                    "Dialog opened using text fallback."
                )

                return True

            print(
                "Dialog not found:",
                target_name
            )

            return False

        except Exception as e:

            print(
                "\n[OPEN DIALOG ERROR]"
            )

            print(
                f"{type(e).__name__}: {e}"
            )

            return False

    # =========================================================
    # OPEN FIRST DIALOG
    # =========================================================

    def open_first_dialog(self):

        print(
            "\nOpening first dialog..."
        )

        try:

            dialog_items = self.page.locator(
                '[aria-label="dialog-item"]'
            )

            if dialog_items.count() == 0:

                print(
                    "No dialog found."
                )

                return False

            first_dialog = dialog_items.first

            first_dialog.wait_for(
                state="visible",
                timeout=10000
            )

            try:

                first_dialog.click(
                    timeout=5000
                )

            except Exception:

                first_dialog.click(
                    force=True,
                    timeout=5000
                )

            self.page.wait_for_timeout(
                1000
            )

            print(
                "First dialog opened."
            )

            return True

        except Exception as e:

            print(
                "\n[OPEN FIRST DIALOG ERROR]"
            )

            print(
                f"{type(e).__name__}: {e}"
            )

            return False

    # =========================================================
    # OPEN CONTACT CHAT
    # =========================================================

    def open_contact_chat(
        self,
        name
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
            "Target contact:",
            target_name
        )

        try:

            # -------------------------------------------------
            # FIRST TRY DIALOG ITEM
            # -------------------------------------------------

            dialog_items = self.page.locator(
                '[aria-label="dialog-item"]'
            )

            count = dialog_items.count()

            print(
                "Dialog item count:",
                count
            )

            for i in range(count):

                item = dialog_items.nth(i)

                try:

                    text = item.inner_text(
                        timeout=2000
                    )

                    print(
                        f"Dialog {i + 1}:",
                        repr(text)
                    )

                    if target_name in text:

                        print(
                            "Matching contact dialog found."
                        )

                        try:

                            item.click(
                                timeout=5000
                            )

                            print(
                                "Contact dialog clicked."
                            )

                        except Exception as e:

                            print(
                                "Normal dialog click failed:",
                                type(e).__name__
                            )

                            item.click(
                                force=True,
                                timeout=5000
                            )

                            print(
                                "Contact dialog force-clicked."
                            )

                        self.page.wait_for_timeout(
                            2000
                        )

                        print(
                            "Current URL after opening chat:",
                            self.page.url
                        )

                        return True

                except Exception as e:

                    print(
                        f"Dialog {i + 1} inspection error:",
                        type(e).__name__
                    )

                    continue

            # -------------------------------------------------
            # FALLBACK BY EXACT TEXT
            # -------------------------------------------------

            print(
                "Trying exact text fallback..."
            )

            exact_contact = self.page.get_by_text(
                target_name,
                exact=True
            ).last

            if exact_contact.count() > 0:

                exact_contact.wait_for(
                    state="visible",
                    timeout=5000
                )

                print(
                    "Exact contact text found."
                )

                try:

                    exact_contact.click(
                        timeout=5000
                    )

                    print(
                        "Exact contact clicked."
                    )

                except Exception as e:

                    print(
                        "Normal exact text click failed:",
                        type(e).__name__
                    )

                    exact_contact.click(
                        force=True,
                        timeout=5000
                    )

                    print(
                        "Exact contact force-clicked."
                    )

                self.page.wait_for_timeout(
                    2000
                )

                print(
                    "Current URL after opening chat:",
                    self.page.url
                )

                return True

            # -------------------------------------------------
            # DEBUG
            # -------------------------------------------------

            print(
                "[ERROR] Contact chat not found:",
                target_name
            )

            try:

                self.page.screenshot(
                    path="/tmp/bale_open_chat_error.png",
                    full_page=True
                )

                print(
                    "[DEBUG] Screenshot saved:"
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

                print(
                    "[DEBUG] Exception screenshot saved:"
                    " /tmp/bale_open_chat_exception.png"
                )

            except Exception:
                pass

            return False

    # =========================================================
    # FIND MESSAGE INPUT
    # =========================================================

    def _find_message_input(self):

        selectors = [

            '[aria-label="editable-message-text"]',

            '[contenteditable="true"]',

            'div[contenteditable="true"]',

            'textarea',

            'textarea[placeholder*="پیام"]',

            'textarea[placeholder*="پیام خود را"]',

            'input[placeholder*="پیام"]'

        ]

        print(
            "\n[BALE] Searching for message input..."
        )

        for selector in selectors:

            try:

                locator = self.page.locator(
                    selector
                )

                count = locator.count()

                print(
                    f"[BALE] Selector: {selector} "
                    f"| count: {count}"
                )

                if count == 0:
                    continue

                for index in range(count):

                    candidate = locator.nth(
                        index
                    )

                    try:

                        if candidate.is_visible():

                            print(
                                f"[BALE] Message input found: "
                                f"{selector} "
                                f"(index={index})"
                            )

                            return candidate

                    except Exception:
                        continue

            except Exception as e:

                print(
                    f"[BALE] Selector error: "
                    f"{selector} -> "
                    f"{type(e).__name__}"
                )

        return None

    # =========================================================
    # FIND SEND BUTTON
    # =========================================================

    def _find_send_button(self):

        selectors = [

            '[aria-label="send-button"]',

            '[aria-label="Send-button"]',

            'button[aria-label*="ارسال"]',

            'button[title*="ارسال"]',

            '[role="button"][aria-label*="ارسال"]',

            'button[type="submit"]'

        ]

        print(
            "\n[BALE] Searching for send button..."
        )

        for selector in selectors:

            try:

                locator = self.page.locator(
                    selector
                )

                count = locator.count()

                print(
                    f"[BALE] Send selector: "
                    f"{selector} | count={count}"
                )

                if count == 0:
                    continue

                for index in range(count):

                    candidate = locator.nth(
                        index
                    )

                    try:

                        if candidate.is_visible():

                            print(
                                f"[BALE] Send button found: "
                                f"{selector} "
                                f"(index={index})"
                            )

                            return candidate

                    except Exception:
                        continue

            except Exception as e:

                print(
                    f"[BALE] Send selector error: "
                    f"{selector} -> "
                    f"{type(e).__name__}"
                )

        return None

    # =========================================================
    # SEND MESSAGE
    # =========================================================

    def send_message(
        self,
        message
    ):

        print("\n================================")
        print("SEND MESSAGE")
        print("================================")

        try:

            message_text = str(
                message
            ).strip()

            if not message_text:

                print(
                    "[BALE] Message is empty."
                )

                return False

            print(
                "[BALE] Message received from API:"
            )

            print(
                repr(message_text)
            )

            print(
                "[BALE] Message length:",
                len(message_text)
            )

            # -------------------------------------------------
            # WAIT FOR CHAT
            # -------------------------------------------------

            self.page.wait_for_timeout(
                1000
            )

            print(
                "[BALE] Current URL before message:",
                self.page.url
            )

            # -------------------------------------------------
            # FIND MESSAGE INPUT
            # -------------------------------------------------

            message_input = self._find_message_input()

            if message_input is None:

                print(
                    "[BALE ERROR] Message input not found."
                )

                try:

                    body_text = self.page.locator(
                        "body"
                    ).inner_text()

                    print(
                        "[BALE] CURRENT PAGE:"
                    )

                    print(
                        body_text[:5000]
                    )

                    self.page.screenshot(
                        path="/tmp/bale_message_input_error.png",
                        full_page=True
                    )

                    print(
                        "[DEBUG] Screenshot saved:"
                        " /tmp/bale_message_input_error.png"
                    )

                except Exception:
                    pass

                return False

            # -------------------------------------------------
            # FOCUS INPUT
            # -------------------------------------------------

            try:

                message_input.click(
                    timeout=5000
                )

            except Exception:

                message_input.click(
                    force=True,
                    timeout=5000
                )

            # -------------------------------------------------
            # CLEAR OLD MESSAGE
            # -------------------------------------------------

            try:

                message_input.fill("")

            except Exception:

                try:

                    message_input.press(
                        "Control+A"
                    )

                    message_input.press(
                        "Backspace"
                    )

                except Exception:
                    pass

            # -------------------------------------------------
            # ENTER MESSAGE
            # -------------------------------------------------

            try:

                message_input.fill(
                    message_text
                )

            except Exception as fill_error:

                print(
                    "[BALE] fill() failed:"
                )

                print(
                    f"{type(fill_error).__name__}: "
                    f"{fill_error}"
                )

                try:

                    message_input.press(
                        "Control+A"
                    )

                    message_input.press(
                        "Backspace"
                    )

                    message_input.type(
                        message_text,
                        delay=10
                    )

                except Exception as type_error:

                    print(
                        "[BALE] type() also failed:"
                    )

                    print(
                        f"{type(type_error).__name__}: "
                        f"{type_error}"
                    )

                    return False

            print(
                "[BALE] Message entered successfully."
            )

            # -------------------------------------------------
            # VERIFY MESSAGE INPUT
            # -------------------------------------------------

            try:

                current_value = message_input.input_value()

                print(
                    "[BALE] Input value after typing:",
                    repr(current_value)
                )

            except Exception:

                try:

                    current_text = message_input.inner_text()

                    print(
                        "[BALE] Input text after typing:",
                        repr(current_text)
                    )

                except Exception:
                    pass

            self.page.wait_for_timeout(
                500
            )

            # -------------------------------------------------
            # FIND SEND BUTTON
            # -------------------------------------------------

            send_button = self._find_send_button()

            if send_button is not None:

                print(
                    "[BALE] Clicking send button..."
                )

                try:

                    send_button.click(
                        timeout=5000
                    )

                    print(
                        "[BALE] Send button clicked."
                    )

                except Exception as e:

                    print(
                        "[BALE] Normal send click failed:"
                    )

                    print(
                        f"{type(e).__name__}: {e}"
                    )

                    try:

                        send_button.click(
                            force=True,
                            timeout=5000
                        )

                        print(
                            "[BALE] Send button force-clicked."
                        )

                    except Exception as force_error:

                        print(
                            "[BALE] Force send click failed:"
                        )

                        print(
                            f"{type(force_error).__name__}: "
                            f"{force_error}"
                        )

                        return False

            else:

                # -------------------------------------------------
                # ENTER FALLBACK
                # -------------------------------------------------

                print(
                    "[BALE] Send button not found."
                )

                print(
                    "[BALE] Trying Enter..."
                )

                message_input.press(
                    "Enter"
                )

                print(
                    "[BALE] Enter pressed."
                )

            # -------------------------------------------------
            # WAIT FOR SEND
            # -------------------------------------------------

            self.page.wait_for_timeout(
                1500
            )

            print(
                "[BALE] Message send operation completed."
            )

            return True

        except PlaywrightTimeoutError as e:

            print(
                "\n[SEND MESSAGE TIMEOUT]"
            )

            print(e)

            try:

                self.page.screenshot(
                    path="/tmp/bale_send_message_timeout.png",
                    full_page=True
                )

                print(
                    "[DEBUG] Screenshot saved:"
                    " /tmp/bale_send_message_timeout.png"
                )

            except Exception:
                pass

            return False

        except Exception as e:

            print(
                "\n[SEND MESSAGE ERROR]"
            )

            print(
                f"{type(e).__name__}: {e}"
            )

            try:

                self.page.screenshot(
                    path="/tmp/bale_send_message_error.png",
                    full_page=True
                )

                print(
                    "[DEBUG] Screenshot saved:"
                    " /tmp/bale_send_message_error.png"
                )

            except Exception:
                pass

            return False

    # =========================================================
    # INSPECT PAGE
    # =========================================================

    def inspect_page(self):

        print(
            "\n================================"
        )

        print(
            "BALE PAGE INSPECTION"
        )

        print(
            "================================"
        )

        try:

            print(
                "URL:",
                self.page.url
            )

            print(
                "TITLE:",
                self.page.title()
            )

            body_text = self.page.locator(
                "body"
            ).inner_text()

            print(
                "\nBODY:"
            )

            print(
                "--------------------------------"
            )

            print(
                body_text[:10000]
            )

            print(
                "--------------------------------"
            )

            return True

        except Exception as e:

            print(
                "[INSPECT ERROR]"
            )

            print(
                f"{type(e).__name__}: {e}"
            )

            return False
