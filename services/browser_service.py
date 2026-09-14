from pathlib import Path

from playwright.sync_api import sync_playwright


class BrowserService:

    def __init__(self, profile_dir: Path):
        self.profile_dir = profile_dir

        self.playwright = None
        self.context = None

    def start(self):

        self.playwright = sync_playwright().start()

        print("Browser profile:")
        print(self.profile_dir)

        self.profile_dir.mkdir(
            parents=True,
            exist_ok=True
        )

        self.context = self.playwright.chromium.launch_persistent_context(
            user_data_dir=str(self.profile_dir),
            executable_path="/usr/bin/chromium-browser",
            headless=True,
            args=[
                "--no-sandbox"
            ]
        )

        if self.context.pages:
            return self.context.pages[0]

        return self.context.new_page()

    def close(self):

        if self.context:
            self.context.close()

        if self.playwright:
            self.playwright.stop()
