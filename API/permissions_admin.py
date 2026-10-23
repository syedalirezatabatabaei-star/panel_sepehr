from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from API.database import get_connection

router = APIRouter(
    prefix="/api/admin/permissions",
    tags=["Permission management"],
    dependencies=[Depends(require_permission_admin)],
)

# Stable permission codes. Read/write controls are stored in user_permissions.
PERMISSION_CATALOG = [
    {"code":"bale.personal_message","group":"پیام‌رسانی","label":"استفاده از ارسال پیام شخصی بله","mode":"toggle"},
    {"code":"eitaa.personal_message","group":"پیام‌رسانی","label":"استفاده از ارسال پیام شخصی ایتا","mode":"toggle"},
    {"code":"rubika.personal_message","group":"پیام‌رسانی","label":"استفاده از ارسال پیام شخصی روبیکا","mode":"toggle"},
    {"code":"bale.chats","group":"چت‌ها","label":"صفحه چت‌های بله","mode":"read_write"},
    {"code":"eitaa.chats","group":"چت‌ها","label":"صفحه چت‌های ایتا","mode":"read_write"},
    {"code":"dashboard","group":"عمومی","label":"داشبورد","mode":"read_write"},
    {"code":"users","group":"مدیریت","label":"مدیریت کاربران","mode":"read_write"},
    {"code":"registration_requests","group":"مدیریت","label":"درخواست‌های ثبت‌نام","mode":"read_write"},
    {"code":"roles","group":"مدیریت","label":"مدیریت نقش‌ها","mode":"read_write"},
    {"code":"notifications","group":"سیستم","label":"اعلان‌ها","mode":"read_write"},
    {"code":"audit_logs","group":"سیستم","label":"لاگ‌های سیستم","mode":"read_write"},
    {"code":"activities","group":"سیستم","label":"فعالیت کاربران","mode":"read_write"},
    {"code":"security","group":"سیستم","label":"امنیت","mode":"read_write"},
    {"code":"settings","group":"سیستم","label":"تنظیمات سیستم (فقط مدیران)","mode":"read_write"},
]

def require_permission_admin(request: Request):
    user = getattr(request.state, "user", None)
    if not isinstance(user, dict) or not user.get("id"):
        raise HTTPException(status_code=401, detail="ابتدا وارد حساب کاربری شوید")
    if not user.get("is_active") or int(user.get("access_level") or 0) != 3:
        raise HTTPException(status_code=403, detail="مدیریت مجوزها فقط در اختیار مدیران است")
    return user

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
        cursor.execute("SELECT code FROM permissions")
        existing = {row["code"] for row in cursor.fetchall()}
        return {
            "success": True,
            "permissions": [
                {**item, "registered": item["code"] in existing}
                for item in PERMISSION_CATALOG
            ]
        }
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
        cursor.execute("SELECT id FROM users WHERE id=%s", (user_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="کاربر پیدا نشد")
        cursor.execute("""
            SELECT p.code, up.can_read, up.can_write
            FROM permissions p
            LEFT JOIN user_permissions up
              ON up.permission_id = p.id AND up.user_id = %s
        """, (user_id,))
        rows = {r["code"]: {"can_read": bool(r["can_read"]), "can_write": bool(r["can_write"])} for r in cursor.fetchall()}
        return {
            "success": True,
            "user_id": user_id,
            "permissions": [
                {**item, **rows.get(item["code"], {"can_read": False, "can_write": False}),
                 "registered": item["code"] in rows}
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
    db = get_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM users WHERE id=%s", (user_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="کاربر پیدا نشد")
        cursor.execute("SELECT id, code FROM permissions")
        ids = {r["code"]: r["id"] for r in cursor.fetchall()}
        missing = [p.code for p in body.permissions if p.code not in ids]
        if missing:
            raise HTTPException(
                status_code=409,
                detail={"message":"مجوزهای این بخش هنوز در جدول permissions ثبت نشده‌اند؛ ابتدا migration را اجرا کنید.", "missing":missing}
            )
        for item in body.permissions:
            permission_id = ids[item.code]
            cursor.execute("""
                SELECT id FROM user_permissions
                WHERE user_id=%s AND permission_id=%s
                LIMIT 1
            """, (user_id, permission_id))
            existing = cursor.fetchone()
            if existing:
                cursor.execute("""
                    UPDATE user_permissions
                    SET can_read=%s, can_write=%s
                    WHERE id=%s
                """, (int(item.can_read), int(item.can_write), existing["id"]))
            else:
                cursor.execute("""
                    INSERT INTO user_permissions (user_id, permission_id, can_read, can_write)
                    VALUES (%s, %s, %s, %s)
                """, (user_id, permission_id, int(item.can_read), int(item.can_write)))
        db.commit()
        return {"success": True, "message": "مجوزهای کاربر ذخیره شد"}
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="ذخیره مجوزها انجام نشد")
    finally:
        cursor.close()
        db.close()
