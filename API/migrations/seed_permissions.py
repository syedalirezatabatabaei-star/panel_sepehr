"""Seed the permission catalog using the live permissions table schema.

Run with: python -m API.migrations.seed_permissions
This avoids assuming that the deployed permissions table has a particular label column.
"""
from datetime import datetime
import re

from API.database import get_connection
from API.permissions_admin import PERMISSION_CATALOG


def _default_value(column):
    name = column["Field"]
    kind = (column.get("Type") or "").lower()
    if "auto_increment" in (column.get("Extra") or "").lower():
        return None, False
    if column.get("Default") is not None or column.get("Null") == "YES":
        return None, False
    if name in {"id", "permission_id"}:
        return None, False
    if any(part in kind for part in ("int", "decimal", "float", "double", "bit", "bool")):
        return 0, True
    if "enum(" in kind:
        match = re.search(r"enum\('([^']*)'", kind)
        return (match.group(1) if match else ""), True
    if any(part in kind for part in ("datetime", "timestamp")):
        return datetime.now(), True
    if kind.startswith("date"):
        return datetime.now().date(), True
    if any(part in kind for part in ("char", "text", "json", "binary")):
        return "", True
    return 0, True


def seed_permissions():
    db = get_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SHOW COLUMNS FROM permissions")
        columns = cursor.fetchall()
        by_name = {column["Field"]: column for column in columns}
        if "code" not in by_name:
            raise RuntimeError("جدول permissions ستون code ندارد")

        cursor.execute("SELECT code FROM permissions")
        existing = {row["code"] for row in cursor.fetchall()}
        inserted = 0

        for permission in PERMISSION_CATALOG:
            code = permission["code"]
            if code in existing:
                continue
            values = {"code": code}
            for field, value in (
                ("name", permission["label"]),
                ("label", permission["label"]),
                ("title", permission["label"]),
                ("description", permission["label"]),
                ("group", permission["group"]),
                ("category", permission["group"]),
                ("is_active", 1),
            ):
                if field in by_name:
                    values[field] = value

            for column in columns:
                field = column["Field"]
                if field in values:
                    continue
                value, required = _default_value(column)
                if required:
                    values[field] = value

            names = list(values)
            sql = (
                "INSERT INTO permissions (" +
                ", ".join("`" + name.replace("`", "``") + "`" for name in names) +
                ") VALUES (" + ", ".join(["%s"] * len(names)) + ")"
            )
            cursor.execute(sql, tuple(values[name] for name in names))
            existing.add(code)
            inserted += 1

        db.commit()
        print(f"Permission catalog ready; inserted {inserted} new permission(s).")
    except Exception:
        db.rollback()
        raise
    finally:
        cursor.close()
        db.close()


if __name__ == "__main__":
    seed_permissions()
