import sqlite3
from pathlib import Path
from datetime import datetime


class StateService:

    def __init__(self, database_path: Path):
        self.database_path = database_path

        
        self.database_path.parent.mkdir(
            parents=True,
            exist_ok=True
        )

        self._create_database()

    def _connect(self):
        return sqlite3.connect(self.database_path)

    def _create_database(self):
        with self._connect() as connection:
            connection.execute("""
                CREATE TABLE IF NOT EXISTS contacts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    phone TEXT NOT NULL UNIQUE,
                    status TEXT NOT NULL DEFAULT 'pending',
                    attempts INTEGER NOT NULL DEFAULT 0,
                    last_attempt TEXT,
                    error TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)

            connection.commit()

    def add_contact(self, phone: str):
        now = datetime.now().isoformat()

        with self._connect() as connection:
            connection.execute(
                """
                INSERT OR IGNORE INTO contacts (
                    phone,
                    status,
                    attempts,
                    created_at,
                    updated_at
                )
                VALUES (?, 'pending', 0, ?, ?)
                """,
                (phone, now, now)
            )

            connection.commit()

    def get_all_contacts(self):
        with self._connect() as connection:
            cursor = connection.execute("""
                SELECT
                    id,
                    phone,
                    status,
                    attempts,
                    last_attempt,
                    error,
                    created_at,
                    updated_at
                FROM contacts
                ORDER BY id
            """)

            return cursor.fetchall()

    def get_pending_contacts(self):
        with self._connect() as connection:
            cursor = connection.execute("""
                SELECT
                    id,
                    phone,
                    status,
                    attempts,
                    last_attempt,
                    error,
                    created_at,
                    updated_at
                FROM contacts
                WHERE status = 'pending'
                ORDER BY id
            """)

            return cursor.fetchall()

    def mark_processing(self, contact_id: int):
        self._update_status(
            contact_id,
            "processing"
        )

    def mark_success(self, contact_id: int):
        self._update_status(
            contact_id,
            "success"
        )

    def mark_failed(self, contact_id: int, error: str):
        now = datetime.now().isoformat()

        with self._connect() as connection:
            connection.execute(
                """
                UPDATE contacts
                SET
                    status = 'failed',
                    attempts = attempts + 1,
                    last_attempt = ?,
                    error = ?,
                    updated_at = ?
                WHERE id = ?
                """,
                (now, error, now, contact_id)
            )

            connection.commit()

    def _update_status(self, contact_id: int, status: str):
        now = datetime.now().isoformat()

        with self._connect() as connection:
            connection.execute(
                """
                UPDATE contacts
                SET
                    status = ?,
                    attempts = attempts + 1,
                    last_attempt = ?,
                    updated_at = ?
                WHERE id = ?
                """,
                (status, now, now, contact_id)
            )

            connection.commit()

