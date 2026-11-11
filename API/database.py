import os
import mysql.connector


def get_connection():
    """Create a MySQL connection using deployment-provided credentials.

    DB_PASSWORD is intentionally required: credentials must not be committed
    into source code. Keep DB_HOST/DB_USER/DB_NAME compatible with the existing
    deployment defaults.
    """
    password = os.getenv("DB_PASSWORD") or os.getenv("MYSQL_PASSWORD")
    if not password:
        raise RuntimeError(
            "DB_PASSWORD is not configured. Set it in the untracked deployment .env file."
        )

    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "mysql"),
        user=os.getenv("DB_USER", "bale_api"),
        password=password,
        database=os.getenv("DB_NAME", "bale_sender"),
        charset="utf8mb4",
        collation="utf8mb4_unicode_ci",
        use_unicode=True,
        connection_timeout=int(os.getenv("DB_CONNECT_TIMEOUT", "10")),
    )
