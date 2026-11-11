"""Seed the permission catalog using the live permissions table schema.

Run with: python -m API.migrations.seed_permissions
This avoids assuming that the deployed permissions table has a particular label column.
"""
from API.database import get_connection
from API.permissions_admin import PERMISSION_CATALOG


def _column_is_generated(column):
    return "auto_increment" in (column.get("Extra") or "").lower()


def _required_unknown_columns(columns, values):
    missing = []
    for column in columns:
        name = column["Field"]
        if name in values or _column_is_generated(column):
            continue
        if column.get("Null") == "YES" or column.get("Default") is not None:
            continue
        missing.append(name)
    return missing


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

            unknown_required = _required_unknown_columns(columns, values)
            if unknown_required:
                raise RuntimeError(
                    "برای درج امن مجوزها، این ستون‌های اجباری جدول permissions باید "
                    "در اسکریپت نگاشت شوند: " + ", ".join(unknown_required)
                )

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
