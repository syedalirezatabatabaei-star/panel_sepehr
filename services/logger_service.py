import logging
from pathlib import Path


class LoggerService:

    def __init__(self, log_file: Path):
        self.log_file = log_file

        self.log_file.parent.mkdir(
            parents=True,
            exist_ok=True
        )

        self.logger = logging.getLogger("bale_sender")
        self.logger.setLevel(logging.INFO)

       
        if not self.logger.handlers:
            file_handler = logging.FileHandler(
                self.log_file,
                encoding="utf-8"
            )

            formatter = logging.Formatter(
                "%(asctime)s | %(levelname)s | %(message)s"
            )

            file_handler.setFormatter(formatter)

            self.logger.addHandler(file_handler)

    def info(self, message: str):
        self.logger.info(message)

    def error(self, message: str):
        self.logger.error(message)

    def warning(self, message: str):
        self.logger.warning(message)

    def debug(self, message: str):
        self.logger.debug(message)
