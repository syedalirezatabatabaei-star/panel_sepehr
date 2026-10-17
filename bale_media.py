# bale_media.py

import os
from pathlib import Path

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError


# =========================================================
# BALE MEDIA SENDER
# =========================================================

class BaleMediaSender:
    """
    ارسال تصویر و ویدیو در Bale Web با استفاده از Playwright.

    این کلاس مستقل است و فقط به page مربوط به Playwright نیاز دارد.

    Usage:

        sender = BaleMediaSender(page)

        sender.send_image(
            "/tmp/image.jpg",
            "سلام 👋"
        )

        sender.send_video(
            "/tmp/video.mp4",
            "این یک ویدیو است."
        )
    """

    # -----------------------------------------------------
    # INIT
    # -----------------------------------------------------

    def __init__(self, page):
        self.page = page

    # -----------------------------------------------------
    # VALIDATE
    # -----------------------------------------------------

    def _validate_file(self, file_path):
        if not file_path:
            raise ValueError("Media file path is empty.")

        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(
                f"Media file not found: {file_path}"
            )

        if not path.is_file():
            raise ValueError(
                f"Media path is not a file: {file_path}"
            )

        return path

    # -----------------------------------------------------
    # FIND FILE INPUT
    # -----------------------------------------------------
    def _find_file_input(self, media_type=None):
        print("[MEDIA] Looking for file input...")

        # Prefer the input explicitly intended for the requested media type.
        if media_type == "image":
            selectors = [
                'input[type="file"][accept*="image"]',
                'input[type="file"][accept*="image/*"]',
                'input[type="file"][accept*="image/video"]',
                'input[type="file"]',
            ]
        elif media_type == "video":
            selectors = [
                'input[type="file"][accept*="video"]',
                'input[type="file"][accept*="video/*"]',
                'input[type="file"][accept*="image/video"]',
                'input[type="file"]',
            ]
        else:
            selectors = [
                'input[type="file"][accept*="image/video"]',
                'input[type="file"][accept*="image"]',
                'input[type="file"][accept*="video"]',
                'input[type="file"]',
            ]

        # ---------------------------------------------------------
        # STEP 1 - Check existing file inputs
        # ---------------------------------------------------------

        for selector in selectors:
            try:
                locator = self.page.locator(selector)
                count = locator.count()

                if count > 0:
                    print(
                        f"[MEDIA] Existing file input found: "
                        f"{selector} ({count})"
                    )

                    for i in range(count):
                        try:
                            item = locator.nth(i)

                            if item.is_attached():
                                print(
                                    f"[MEDIA] Using file input: "
                                    f"{selector} index={i}"
                                )
                                return item

                        except Exception:
                            continue

            except Exception:
                continue

        # ---------------------------------------------------------
        # STEP 2 - Try opening attachment menu
        # ---------------------------------------------------------

        print("[MEDIA] File input not found.")
        print("[MEDIA] Trying to open attachment menu...")

        attachment_selectors = [
            'svg[aria-label*="Attach"]',
            'svg[aria-label*="attach"]',
            '[aria-label*="Attach"]',
            '[aria-label*="attach"]',
            '[title*="Attach"]',
            '[title*="attach"]',
            'button[aria-label*="Attach"]',
            'button[aria-label*="attach"]',
        ]

        attachment_clicked = False

        for selector in attachment_selectors:
            try:
                locator = self.page.locator(selector)
                count = locator.count()

                print(
                    f"[MEDIA] Attachment selector: "
                    f"{selector} -> {count}"
                )

                for i in range(count):
                    try:
                        item = locator.nth(i)

                        if not item.is_visible():
                            continue

                        try:
                            item.click(timeout=1500)
                            print(
                                f"[MEDIA] Attachment clicked: "
                                f"{selector} index={i}"
                            )
                            attachment_clicked = True
                            break
                        except Exception:
                            try:
                                item.click(
                                    timeout=1500,
                                    force=True
                                )
                                print(
                                    f"[MEDIA] Attachment force-clicked: "
                                    f"{selector} index={i}"
                                )
                                attachment_clicked = True
                                break
                            except Exception:
                                continue

                    except Exception:
                        continue

                if attachment_clicked:
                    break

            except Exception:
                continue

        if not attachment_clicked:
            print("[MEDIA] Attachment button not found.")

        # ---------------------------------------------------------
        # STEP 3 - Wait for menu / file input
        # ---------------------------------------------------------

        try:
            self.page.wait_for_timeout(500)
        except Exception:
            pass

        # ---------------------------------------------------------
        # STEP 4 - Search again
        # ---------------------------------------------------------

        for selector in selectors:
            try:
                locator = self.page.locator(selector)
                count = locator.count()

                print(
                    f"[MEDIA] After attachment: "
                    f"{selector} -> {count}"
                )

                for i in range(count):
                    try:
                        item = locator.nth(i)

                        if item.is_attached():
                            print(
                                f"[MEDIA] File input found after "
                                f"attachment: {selector} index={i}"
                            )
                            return item

                    except Exception:
                        continue

            except Exception:
                continue

        print("[MEDIA] File input still not found.")

        return None
    # -----------------------------------------------------
    # FIND MESSAGE INPUT
    # -----------------------------------------------------

    def _find_message_input(self):
        """Prefer a caption editor in the media preview, then the chat composer."""
        selectors = [
            '[aria-label="editable-message-text"]',
            '[contenteditable="true"]',
            'textarea',
        ]

        # A media preview is commonly rendered in a dialog/modal. Prefer its
        # editor so the caption is not accidentally typed into the chat composer.
        for scope_selector in ('[role="dialog"]', '[aria-modal="true"]'):
            try:
                scopes = self.page.locator(scope_selector)
                for scope_index in range(scopes.count()):
                    scope = scopes.nth(scope_index)
                    if not scope.is_visible():
                        continue
                    for selector in selectors:
                        items = scope.locator(selector)
                        for item_index in range(items.count()):
                            item = items.nth(item_index)
                            try:
                                if item.is_visible() and item.is_enabled():
                                    return item
                            except Exception:
                                continue
            except Exception:
                continue

        for selector in selectors:
            try:
                locator = self.page.locator(selector)
                for i in range(locator.count()):
                    item = locator.nth(i)
                    try:
                        if item.is_visible() and item.is_enabled():
                            return item
                    except Exception:
                        continue
            except Exception:
                continue
        return None

    # -----------------------------------------------------
    # SET CAPTION
    # -----------------------------------------------------

    def _set_caption(self, caption):
        """
        متن کپشن را وارد می‌کند.

        اگر caption خالی باشد هیچ کاری انجام نمی‌شود.
        """

        caption = (
            str(caption).strip()
            if caption is not None
            else ""
        )

        if not caption:
            return True

        input_box = self._find_message_input()

        if input_box is None:

            print(
                "[MEDIA] Message input not found."
            )

            return False

        try:

            input_box.fill(caption)

            print(
                "[MEDIA] Caption entered."
            )

            return True

        except Exception as e:

            print(
                "[MEDIA] Caption error:",
                e
            )

            return False

    # -----------------------------------------------------
    # SEND MEDIA
    # -----------------------------------------------------

    def send_media(
        self,
        file_path,
        caption="",
        media_type=None
    ):
        """
        ارسال تصویر یا ویدیو.

        media_type:
            image
            video

        اگر media_type مشخص نشود، بر اساس پسوند فایل
        تشخیص داده می‌شود.
        """

        path = self._validate_file(file_path)

        # ---------------------------------------------
        # Detect media type
        # ---------------------------------------------

        if media_type is None:

            extension = path.suffix.lower()

            image_extensions = {
                ".jpg",
                ".jpeg",
                ".png",
                ".webp",
                ".gif",
                ".bmp"
            }

            video_extensions = {
                ".mp4",
                ".webm",
                ".mov",
                ".mkv",
                ".avi",
                ".m4v"
            }

            if extension in image_extensions:
                media_type = "image"

            elif extension in video_extensions:
                media_type = "video"

            else:
                raise ValueError(
                    f"Unsupported media type: {extension}"
                )

        media_type = str(
            media_type
        ).strip().lower()

        if media_type not in {
            "image",
            "video"
        }:

            raise ValueError(
                "media_type must be 'image' or 'video'."
            )

        print(
            "\n================================"
        )

        print(
            "[BALE MEDIA] SEND MEDIA"
        )

        print(
            "================================"
        )

        print(
            "[MEDIA] Type:",
            media_type
        )

        print(
            "[MEDIA] File:",
            str(path)
        )

        # ---------------------------------------------
        # Find file input
        # ---------------------------------------------

        baseline_media_count = self._count_visible_chat_media()\n\n        file_input = self._find_file_input(media_type)

        if file_input is None:

            print(
                "[MEDIA] File input not found."
            )

            return False

        try:

            # -----------------------------------------
            # Upload file
            # -----------------------------------------

            file_input.set_input_files(
                str(path)
            )

            print(
                "[MEDIA] File selected."
            )

        except Exception as e:

            print(
                "[MEDIA] File upload error:",
                e
            )

            return False

        # ---------------------------------------------
        # Wait for media preview
        # ---------------------------------------------

        try:

            self.page.wait_for_timeout(
                1000
            )

        except Exception:
            pass

        # ---------------------------------------------
        # Caption
        # ---------------------------------------------

        caption_ok = self._set_caption(
            caption
        )

        if not caption_ok and str(
            caption or ""
        ).strip():

            print(
                "[MEDIA] Caption could not be entered."
            )

            return False

        # ---------------------------------------------
        # Send
        # ---------------------------------------------

        return self._send_media_message(\n            baseline_media_count=baseline_media_count\n        )

    # -----------------------------------------------------
    # SEND MEDIA MESSAGE
    # -----------------------------------------------------

    def _count_visible_chat_media(self):
        """
        Count visible media outside modal previews. A count increase after
        sending is used as a conservative signal that media appeared in chat.
        """
        try:
            return self.page.locator("img, video").evaluate_all(
                """els => els.filter(el => {
                    const rect = el.getBoundingClientRect();
                    const style = window.getComputedStyle(el);
                    const visible = rect.width > 0 && rect.height > 0 &&
                        style.visibility !== 'hidden' && style.display !== 'none';
                    const inPreview = !!el.closest(
                        '[role="dialog"], [aria-modal="true"]'
                    );
                    return visible && !inPreview;
                }).length"""
            )
        except Exception as e:
            print("[MEDIA] Could not count chat media:", e)
            return None

    def _find_media_send_button(self):
        """Find a clearly labelled send button, preferring the media preview."""
        accepted = {
            "send", "send message", "ارسال", "ارسال پیام",
            "ارسال رسانه", "ارسال تصویر", "ارسال ویدیو"
        }
        scopes = []
        for scope_selector in ('[role="dialog"]', '[aria-modal="true"]'):
            try:
                loc = self.page.locator(scope_selector)
                for i in range(loc.count()):
                    scope = loc.nth(i)
                    if scope.is_visible():
                        scopes.append(scope)
            except Exception:
                continue
        scopes.append(self.page)

        for scope in scopes:
            for selector in ('button', '[role="button"]'):
                try:
                    buttons = scope.locator(selector)
                    for i in range(buttons.count()):
                        button = buttons.nth(i)
                        try:
                            if not button.is_visible() or not button.is_enabled():
                                continue
                            label = " ".join([
                                button.get_attribute("aria-label") or "",
                                button.get_attribute("title") or "",
                                button.inner_text() or "",
                            ]).strip().lower()
                            normalized = " ".join(label.split())
                            # Exact text matching avoids clicking unrelated controls.
                            if normalized in accepted:
                                return button
                            aria = (button.get_attribute("aria-label") or "").strip().lower()
                            title = (button.get_attribute("title") or "").strip().lower()
                            if aria in accepted or title in accepted:
                                return button
                        except Exception:
                            continue
                except Exception:
                    continue
        return None

    def _send_media_message(self, baseline_media_count=None):
        """
        Send media and only return True when a new visible chat media item is
        observed. A click/Enter alone is not treated as delivery confirmation.
        """
        input_box = self._find_message_input()
        send_button = self._find_media_send_button()

        try:
            if send_button is not None:
                print("[MEDIA] Clicking the labelled media send button.")
                send_button.click(timeout=2500)
            elif input_box is not None:
                print("[MEDIA] No labelled send button found; trying Enter.")
                input_box.press("Enter", timeout=2500)
            else:
                print("[MEDIA] Neither a send button nor an input was found.")
                return False

            # Wait for a new media item to appear in the chat. Do not infer
            # success merely because the button was clicked or the preview closed.
            for attempt in range(16):
                self.page.wait_for_timeout(500)
                current_count = self._count_visible_chat_media()
                if (
                    baseline_media_count is not None
                    and current_count is not None
                    and current_count > baseline_media_count
                ):
                    print(
                        "[MEDIA] Delivery visually confirmed: "
                        f"chat media count {baseline_media_count} -> {current_count}"
                    )
                    return True

            print(
                "[MEDIA] Send action was triggered, but a new chat media item "
                "could not be confirmed."
            )
            return False

        except Exception as e:
            print("[MEDIA] Send error:", e)
            return False

    # -----------------------------------------------------
    # IMAGE
    # -----------------------------------------------------

    def send_image(
        self,
        image_path,
        caption=""
    ):
        """
        ارسال تصویر + کپشن
        """

        return self.send_media(
            file_path=image_path,
            caption=caption,
            media_type="image"
        )

    # -----------------------------------------------------
    # VIDEO
    # -----------------------------------------------------

    def send_video(
        self,
        video_path,
        caption=""
    ):
        """
        ارسال ویدیو + کپشن
        """

        return self.send_media(
            file_path=video_path,
            caption=caption,
            media_type="video"
        )


# =========================================================
# HELPER FUNCTIONS
# =========================================================

def send_image(
    page,
    image_path,
    caption=""
):
    """
    Helper ساده برای ارسال تصویر.
    """

    sender = BaleMediaSender(page)

    return sender.send_image(
        image_path=image_path,
        caption=caption
    )


def send_video(
    page,
    video_path,
    caption=""
):
    """
    Helper ساده برای ارسال ویدیو.
    """

    sender = BaleMediaSender(page)

    return sender.send_video(
        video_path=video_path,
        caption=caption
    )


def send_media(
    page,
    media_path,
    caption="",
    media_type=None
):
    """
    Helper عمومی برای ارسال مدیا.
    """

    sender = BaleMediaSender(page)

    return sender.send_media(
        file_path=media_path,
        caption=caption,
        media_type=media_type
    )

