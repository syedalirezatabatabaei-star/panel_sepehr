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
    def _find_file_input(self):
        print("[MEDIA] Looking for file input...")

        selectors = [
            'input[type="file"]',
            'input[type="file"][accept*="image"]',
            'input[type="file"][accept*="video"]',
            'input[type="file"][accept*="image/video"]',
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

                count = locator.count()

                for i in range(count):

                    item = locator.nth(i)

                    try:

                        if item.is_visible():
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

        return self._send_media_message()

    # -----------------------------------------------------
    # SEND MEDIA MESSAGE
    # -----------------------------------------------------

    def _send_media_message(self):
        """
        ارسال نهایی مدیا.

        در حالت معمول Enter روی input مربوط به کپشن
        باعث ارسال مدیا می‌شود.
        """

        input_box = self._find_message_input()

        if input_box is None:

            print(
                "[MEDIA] Message input not found for send."
            )

            return False

        try:

            input_box.press(
                "Enter"
            )

            self.page.wait_for_timeout(
                1500
            )

            print(
                "[MEDIA] Media sent successfully."
            )

            return True

        except Exception as e:

            print(
                "[MEDIA] Send error:",
                e
            )

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

