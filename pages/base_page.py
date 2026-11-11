from playwright.sync_api import Page


class BasePage:

    def __init__(self, page: Page):
        self.page = page

    def goto(self, url: str):
        self.page.goto(
            url,
            wait_until="domcontentloaded"
        )

    def get_title(self):
        return self.page.title()

    def current_url(self):
        return self.page.url
