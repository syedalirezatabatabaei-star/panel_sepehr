from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from API.database import get_connection

# Stable permission codes. Read/write controls are stored in user_permissions.
PERMISSION_CATALOG = [
    {"code":"bale.personal_message","group":"پیام‌رسانی","label":"استفاده از ارسال پیام شخصی بله","mode":"toggle"},
    {"code":"eitaa.personal_message","group":"پیام‌رسانی","label":"استفاده از ارسال پیام شخصی ایتا","mode":"toggle"},
    {"code":"rubika.personal_message","group":"پیام‌رسانی","label":"استفاده از ارسال پیام شخصی روبیکا","mode":"toggle"},
    {"code":"span.bale.personal_message","group":"Span API","label":"ارسال پیام شخصی بله از طریق Span API","mode":"toggle"},
    {"code":"span.eitaa.personal_message","group":"Span API","label":"ارسال پیام شخصی ایتا از طریق Span API","mode":"toggle"},
    {"code":"span.rubika.personal_message","group":"Span API","label":"ارسال پیام شخصی روبیکا از طریق Span API","mode":"toggle"},
    {"code":"bale.chats","group":"چت‌ها","label":"صفحه چت‌های بله","mode":"read_write"},
    {"code":"eitaa.chats","group":"چت‌ها","label":"صفحه چت‌های ایتا","mode":"read_write"},
    {"code":"users","group":"مدیریت","label":"مدیریت کاربران","mode":"read_write"},
    {"code":"registration_requests","group":"مدیریت","label":"درخواست‌های ثبت‌نام","mode":"read_write"},
    {"code":"roles","group":"مدیریت","label":"مدیریت نقش‌ها","mode":"read_write"},
    {"code":"notifications","group":"سیستم","label":"اعلان‌ها","mode":"read_write"},
    {"code":"audit_logs","group":"سیستم","label":"لاگ‌های سیستم","mode":"read_write"},
    {"code":"activities","group":"سیستم","label":"فعالیت کاربران","mode":"read_write"},
    {"code":"security","group":"سیستم","label":"امنیت","mode":"read_write"},
    {"code":"settings","group":"سیستم","label":"تنظیمات سیستم (فقط مدیران)","mode":"read_write"},
]

def _ensure_permission_catalog(cursor):
    """Register catalog entries using the actual deployed table schema."""
    cursor.execute("SHOW COLUMNS FROM permissions")
    columns = cursor.fetchall()
    by_name = {column["Field"]: column for column in columns}
    if "code" not in by_name:
        raise RuntimeError("جدول permissions ستون code ندارد")
    cursor.execute("SELECT code FROM permissions")
    existing = {row["code"] for row in cursor.fetchall()}
    inserted = 0
    for item in PERMISSION_CATALOG:
        code = item["code"]
        if code in existing:
            continue
        values = {"code": code}
        for field, value in (
            ("name", item["label"]), ("label", item["label"]),
            ("title", item["label"]), ("description", item["label"]),
            ("group", item["group"]), ("category", item["group"]),
            ("is_active", 1),
        ):
            if field in by_name:
                values[field] = value
        missing = []
        for column in columns:
            name = column["Field"]
            if name in values or "auto_increment" in (column.get("Extra") or "").lower():
                continue
            if column.get("Null") == "YES" or column.get("Default") is not None:
                continue
            missing.append(name)
        if missing:
            raise RuntimeError(
                "ستون‌های اجباری ناشناخته در جدول permissions: " + ", ".join(missing)
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
    return inserted


def require_permission_admin(request: Request):
    user = getattr(request.state, "user", None)
    if not isinstance(user, dict) or not user.get("id"):
        raise HTTPException(status_code=401, detail="ابتدا وارد حساب کاربری شوید")
    if not user.get("is_active") or int(user.get("access_level") or 0) != 3:
        raise HTTPException(status_code=403, detail="مدیریت مجوزها فقط در اختیار مدیران است")
    return user

router = APIRouter(
    prefix="/api/admin/permissions",
    tags=["Permission management"],
    dependencies=[Depends(require_permission_admin)],
)

class PermissionChange(BaseModel):
    code: str = Field(min_length=1, max_length=128)
    can_read: bool = False
    can_write: bool = False

class SavePermissionsRequest(BaseModel):
    permissions: list[PermissionChange]

@router.get("/catalog")
def get_catalog():
    db = get_connection()
    cursor = db.cursor(dictionary=True)
    try:
        _ensure_permission_catalog(cursor)
        db.commit()
        cursor.execute("SELECT code FROM permissions")
        existing = {row["code"] for row in cursor.fetchall()}
        return {
            "success": True,
            "permissions": [
                {**item, "registered": item["code"] in existing}
                for item in PERMISSION_CATALOG
            ]
        }
    except Exception:
        db.rollback()
        raise
    finally:
        cursor.close()
        db.close()


class CreateRoleRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    label: str = Field(min_length=2, max_length=150)
    description: str = Field(default="", max_length=1000)
    level: int = Field(default=1, ge=1, le=2)
    color: str = Field(default="#64748b", min_length=7, max_length=7)


class SaveRolePermissionsRequest(BaseModel):
    permissions: list[str]


def _role_table_rows(cursor):
    cursor.execute("SHOW COLUMNS FROM roles")
    columns = cursor.fetchall()
    names = {column["Field"] for column in columns}
    if "id" not in names:
        raise RuntimeError("جدول roles ستون id ندارد")
    cursor.execute("SELECT * FROM roles ORDER BY id")
    raw_roles = cursor.fetchall()
    cursor.execute("""
        SELECT rp.role_id, p.code
        FROM role_permissions rp
        JOIN permissions p ON p.id=rp.permission_id
    """)
    role_permissions = {}
    for row in cursor.fetchall():
        role_permissions.setdefault(str(row["role_id"]), []).append(row["code"])
    cursor.execute("SELECT role_id, COUNT(*) AS user_count FROM users GROUP BY role_id")
    counts = {str(row["role_id"]): int(row["user_count"]) for row in cursor.fetchall()}
    result = []
    for row in raw_roles:
        role_id = row.get("id")
        role_key = str(role_id)
        name = row.get("name") or row.get("code") or row.get("label") or f"Role {role_id}"
        result.append({
            "id": role_id,
            "name": str(name),
            "label": str(row.get("label") or row.get("title") or name),
            "level": int(row.get("level") or row.get("access_level") or 1),
            "description": str(row.get("description") or ""),
            "color": str(row.get("color") or "#64748b"),
            "userCount": counts.get(role_key, 0),
            "permissions": sorted(set(role_permissions.get(role_key, []))),
            "isSystem": bool(row.get("is_system", row.get("is_system_role", 0))),
        })
    return result


@router.post("/roles")
def create_database_role(body: CreateRoleRequest):
    if not (body.color.startswith("#") and all(ch in "0123456789abcdefABCDEF" for ch in body.color[1:])):
        raise HTTPException(status_code=400, detail="رنگ نقش باید به قالب #RRGGBB باشد")
    db = get_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SHOW COLUMNS FROM roles")
        columns = cursor.fetchall()
        by_name = {column["Field"]: column for column in columns}
        values = {}
        for field, value in (
            ("name", body.name.strip()), ("code", body.name.strip().lower().replace(" ", "_")),
            ("label", body.label.strip()), ("title", body.label.strip()),
            ("description", body.description.strip()), ("level", body.level),
            ("access_level", body.level), ("color", body.color),
            ("is_system", 0), ("is_system_role", 0),
        ):
            if field in by_name and field not in values:
                values[field] = value
        for column in columns:
            name = column["Field"]
            if name in values or "auto_increment" in (column.get("Extra") or "").lower():
                continue
            if column.get("Null") == "YES" or column.get("Default") is not None:
                continue
            raise HTTPException(
                status_code=400,
                detail=f"ستون اجباری «{name}» در جدول roles باید برای ساخت نقش نگاشت شود",
            )
        if not values:
            raise HTTPException(status_code=500, detail="ساختار جدول roles معتبر نیست")
        names = list(values)
        cursor.execute(
            "INSERT INTO roles (" + ", ".join("`" + name.replace("`", "``") + "`" for name in names) +
            ") VALUES (" + ", ".join(["%s"] * len(names)) + ")",
            tuple(values[name] for name in names),
        )
        db.commit()
        return {"success": True, "id": cursor.lastrowid, "message": "نقش جدید ایجاد شد"}
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="ایجاد نقش در دیتابیس ناموفق بود")
    finally:
        cursor.close()
        db.close()


@router.get("/roles")
def get_database_roles():
    db = get_connection()
    cursor = db.cursor(dictionary=True)
    try:
        _ensure_permission_catalog(cursor)
        db.commit()
        return {"success": True, "roles": _role_table_rows(cursor)}
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="دریافت نقش‌ها از دیتابیس ناموفق بود")
    finally:
        cursor.close()
        db.close()


@router.put("/roles/{role_id}")
def save_database_role_permissions(role_id: int, body: SaveRolePermissionsRequest):
    allowed = {item["code"] for item in PERMISSION_CATALOG}
    if any(code not in allowed for code in body.permissions):
        raise HTTPException(status_code=400, detail="کد مجوز نقش نامعتبر است")
    if len(set(body.permissions)) != len(body.permissions):
        raise HTTPException(status_code=400, detail="مجوز تکراری در درخواست وجود دارد")
    db = get_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM roles WHERE id=%s", (role_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="نقش پیدا نشد")
        _ensure_permission_catalog(cursor)
        cursor.execute("SELECT id, code FROM permissions")
        ids = {row["code"]: row["id"] for row in cursor.fetchall()}
        selected_ids = [ids[code] for code in body.permissions if code in ids]
        cursor.execute("DELETE FROM role_permissions WHERE role_id=%s", (role_id,))
        for permission_id in selected_ids:
            cursor.execute(
                "INSERT INTO role_permissions (role_id, permission_id) VALUES (%s,%s)",
                (role_id, permission_id),
            )
        db.commit()
        return {"success": True, "message": "مجوزهای نقش در دیتابیس ذخیره شد"}
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="ذخیره مجوزهای نقش ناموفق بود")
    finally:
        cursor.close()
        db.close()


@router.get("/users")
def get_users_for_permissions():
    db = get_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT id, first_name, last_name, username, access_level, is_active
            FROM users
            ORDER BY first_name, last_name, id
        """)
        return {"success": True, "users": cursor.fetchall()}
    finally:
        cursor.close()
        db.close()

@router.get("/users/{user_id}")
def get_user_permission_settings(user_id: int):
    db = get_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, role_id FROM users WHERE id=%s", (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="کاربر پیدا نشد")
        cursor.execute("""
            SELECT p.code,
                   MAX(COALESCE(up.can_read, 0)) AS personal_read,
                   MAX(COALESCE(up.can_write, 0)) AS personal_write,
                   MAX(CASE WHEN rp.id IS NOT NULL THEN 1 ELSE 0 END) AS role_granted
            FROM permissions p
            LEFT JOIN user_permissions up
              ON up.permission_id=p.id AND up.user_id=%s
            LEFT JOIN role_permissions rp
              ON rp.permission_id=p.id AND rp.role_id=%s
            GROUP BY p.id, p.code
        """, (user_id, user["role_id"]))
        rows = {row["code"]: row for row in cursor.fetchall()}
        return {
            "success": True,
            "user_id": user_id,
            "permissions": [
                {
                    **item,
                    "can_read": bool(rows.get(item["code"], {}).get("personal_read")),
                    "can_write": bool(rows.get(item["code"], {}).get("personal_write")),
                    "personal_grant": bool(
                        rows.get(item["code"], {}).get("personal_read")
                        or rows.get(item["code"], {}).get("personal_write")
                    ),
                    "role_granted": bool(rows.get(item["code"], {}).get("role_granted")),
                    "registered": item["code"] in rows,
                }
                for item in PERMISSION_CATALOG
            ]
        }
    finally:
        cursor.close()
        db.close()

@router.put("/users/{user_id}")
def save_user_permission_settings(user_id: int, body: SavePermissionsRequest):
    allowed = {item["code"] for item in PERMISSION_CATALOG}
    if any(item.code not in allowed for item in body.permissions):
        raise HTTPException(status_code=400, detail="کد مجوز نامعتبر است")
    if len({item.code for item in body.permissions}) != len(body.permissions):
        raise HTTPException(status_code=400, detail="کد مجوز تکراری در درخواست وجود دارد")

    db = get_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM users WHERE id=%s", (user_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="کاربر پیدا نشد")

        _ensure_permission_catalog(cursor)
        cursor.execute("SELECT id, code FROM permissions")
        ids = {row["code"]: row["id"] for row in cursor.fetchall()}
        missing = [item.code for item in body.permissions if item.code not in ids]
        if missing:
            raise HTTPException(status_code=409, detail={"message": "ثبت مجوزها ناموفق بود", "missing": missing})

        for item in body.permissions:
            permission_id = ids[item.code]
            # Remove any legacy duplicates. Unchecked means "no personal grant",
            # not an explicit deny; role grants remain effective.
            cursor.execute(
                "DELETE FROM user_permissions WHERE user_id=%s AND permission_id=%s",
                (user_id, permission_id),
            )
            if item.can_read or item.can_write:
                cursor.execute("""
                    INSERT INTO user_permissions (user_id, permission_id, can_read, can_write)
                    VALUES (%s, %s, %s, %s)
                """, (user_id, permission_id, int(item.can_read), int(item.can_write)))
        db.commit()
        return {"success": True, "message": "مجوزهای شخصی کاربر ذخیره شد"}
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="ذخیره مجوزها انجام نشد")
    finally:
        cursor.close()
        db.close()

