# bale_media.py

import os
import re
from datetime import datetime
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

    def _capture_debug(self, stage, error=None):
        """Save a screenshot and DOM snapshot when a media action fails."""
        if self.page is None:
            return

        safe_stage = re.sub(r"[^a-zA-Z0-9_-]+", "-", str(stage)).strip("-") or "media-error"
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        base_path = f"/tmp/bale_{safe_stage}_{timestamp}"

        if error is not None:
            print(f"[MEDIA DEBUG] {stage}: {error}")

        try:
            self.page.screenshot(path=f"{base_path}.png", full_page=True, timeout=10000)
            print(f"[MEDIA DEBUG] Screenshot: {base_path}.png")
        except Exception as capture_error:
            print(f"[MEDIA DEBUG] Screenshot failed: {capture_error}")

        try:
            with open(f"{base_path}.html", "w", encoding="utf-8") as output:
                output.write(self.page.content())
            print(f"[MEDIA DEBUG] DOM: {base_path}.html")
        except Exception as capture_error:
            print(f"[MEDIA DEBUG] DOM capture failed: {capture_error}")

        try:
            with open(f"{base_path}.txt", "w", encoding="utf-8") as output:
                output.write(f"URL: {self.page.url}\nStage: {stage}\nError: {error or ''}\n\n")
                output.write(self.page.locator("body").inner_text(timeout=3000))
        except Exception as capture_error:
            print(f"[MEDIA DEBUG] Text capture failed: {capture_error}")

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
    def _find_file_input(self):
        print("[MEDIA] Looking for a file input...")

        def first_attached_input():
            inputs = self.page.locator('input[type="file"]')
            for index in range(inputs.count()):
                item = inputs.nth(index)
                try:
                    if item.is_attached():
                        print(f"[MEDIA] File input found at index={index}")
                        return item
                except Exception:
                    continue
            return None

        existing = first_attached_input()
        if existing is not None:
            return existing

        # Some Bale builds add the file input only after the attachment menu opens.
        attachment_selectors = [
            'button[aria-label*="attach" i]',
            '[role="button"][aria-label*="attach" i]',
            '[aria-label*="پیوست"]',
            '[title*="پیوست"]',
            'button[aria-label*="file" i]',
            '[role="button"][aria-label*="file" i]',
            'button[aria-label*="media" i]',
            '[role="button"][aria-label*="media" i]',
            '[aria-label*="تصویر"]',
            '[aria-label*="رسانه"]',
            '[aria-label*="ضمیمه"]',
            '[title*="Attach" i]',
            '[title*="Upload" i]',
            '[data-testid*="attach" i]',
        ]

        for selector in attachment_selectors:
            try:
                locator = self.page.locator(selector)
                for index in range(locator.count()):
                    candidate = locator.nth(index)
                    if not candidate.is_visible():
                        continue

                    try:
                        tag = candidate.evaluate("(el) => el.tagName.toLowerCase()")
                    except Exception:
                        tag = ""

                    if tag == "svg":
                        parent = candidate.locator(
                            "xpath=ancestor-or-self::*[self::button or @role='button'][1]"
                        )
                        if parent.count() and parent.first.is_visible():
                            candidate = parent.first

                    try:
                        candidate.click(timeout=3000)
                    except Exception:
                        candidate.click(timeout=3000, force=True)

                    print(f"[MEDIA] Attachment control clicked: {selector}")
                    break
                else:
                    continue

                try:
                    self.page.locator('input[type="file"]').first.wait_for(
                        state="attached",
                        timeout=4000
                    )
                except Exception:
                    pass

                attached = first_attached_input()
                if attached is not None:
                    return attached
            except Exception as error:
                print(f"[MEDIA] Attachment selector skipped {selector}: {type(error).__name__}")

        self._capture_debug("media-file-input-not-found", "No file input or attachment control found")
        return None

    # -----------------------------------------------------
    # FIND MESSAGE INPUT
    # -----------------------------------------------------

    def _find_message_input(self):
        """
        input مربوط به نوشتن پیام / کپشن را پیدا می‌کند.
        """

        selectors = [
            '[aria-label="editable-message-text"]',
            '[contenteditable="true"]',
            'textarea',
        ]

        for selector in selectors:
            try:
                locator = self.page.locator(selector)
                for i in range(locator.count() - 1, -1, -1):
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

        file_input = self._find_file_input()

        if file_input is None:

            self._capture_debug("media-file-input-not-found", "File input not found after attachment menu scan")
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

            self._capture_debug("media-file-upload-error", e)
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

            self._capture_debug("media-caption-error", "Caption could not be entered")
            return False

        # ---------------------------------------------
        # Send
        # ---------------------------------------------

        return self._send_media_message()

    # -----------------------------------------------------
    # SEND MEDIA MESSAGE
    # -----------------------------------------------------

    def _send_media_message(self):
        """Send prepared media using the visible send control when available."""
        input_box = self._find_message_input()
        send_selectors = [
            'button[aria-label*="send" i]',
            '[role="button"][aria-label*="send" i]',
            'button[aria-label*="ارسال"]',
            '[role="button"][aria-label*="ارسال"]',
            'button:has-text("ارسال")',
            '[role="button"]:has-text("ارسال")',
            'button:has-text("فرستادن")',
        ]

        for selector in send_selectors:
            try:
                locator = self.page.locator(selector)
                for index in range(locator.count() - 1, -1, -1):
                    button = locator.nth(index)
                    if button.is_visible() and button.is_enabled():
                        button.click(timeout=4000)
                        self.page.wait_for_timeout(1000)
                        print(f"[MEDIA] Send control clicked: {selector}")
                        return True
            except Exception:
                continue

        if input_box is None:
            self._capture_debug("media-send-control-not-found", "No message editor or send button found")
            return False

        try:
            input_box.press("Enter")
            self.page.wait_for_timeout(1500)
            print("[MEDIA] Media send submitted with Enter.")
            return True
        except Exception as error:
            self._capture_debug("media-send-error", error)
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

