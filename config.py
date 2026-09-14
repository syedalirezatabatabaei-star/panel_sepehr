from pathlib import Path


BASE_DIR = Path("/root/bale_sender")


CHROMIUM_PATH = "/usr/bin/chromium-browser"


CONTACTS_FILE = BASE_DIR / "contacts.xlsx"
MESSAGE_FILE = BASE_DIR / "message.txt"



SESSION_FILE = BASE_DIR / "bale_session.json"



DATA_DIR = BASE_DIR / "data"
DATABASE_FILE = DATA_DIR / "state.db"



LOG_DIR = BASE_DIR / "logs"
LOG_FILE = LOG_DIR / "app.log"
