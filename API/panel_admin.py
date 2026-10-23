"""Persistent panel announcements and system settings API.

The tables are managed by the idempotent SQL migration under migrations/.
Public announcements are visible to all active users, while private announcements
are visible only to their recipient and administrators.
"""
import json

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from API.database import get_connection

router = APIRouter(tags=["Panel administration"])


# Database schema is managed by the idempotent SQL migration in migrations/.
# Runtime API requests must not require CREATE privileges on the application DB user.

def _user(request: Request):
    user = getattr(request.state, "user", None)
    if not isinstance(user, dict) or not user.get("id") or not user.get("is_active"):
        raise HTTPException(401, "ابتدا وارد حساب کاربری شوید")
    return user


def _admin(user):
    if int(user.get("access_level") or 0) != 3:
        raise HTTPException(403, "این عملیات فقط برای مدیران مجاز است")


class AnnouncementInput(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1, max_length=10000)
    visibility: str = "public"
    recipient_user_id: int | None = None
    is_active: bool = True


class SettingsInput(BaseModel):
    settings: dict[str, str | int | float | bool | None]


@router.get("/api/notifications")
def list_visible_announcements(request: Request):
    user = _user(request)
    db = get_connection()
    cursor = db.cursor(dictionary=True)
    try:

        cursor.execute("""
            SELECT id, title, message, visibility, recipient_user_id,
                   created_by, created_at, updated_at
            FROM panel_announcements
            WHERE is_active=1
              AND (visibility='public' OR recipient_user_id=%s OR %s=3)
            ORDER BY created_at DESC
            LIMIT 200
        """, (int(user["id"]), int(user.get("access_level") or 0)))
        return {"success": True, "notifications": cursor.fetchall()}
    finally:
        cursor.close()
        db.close()


@router.get("/api/admin/notifications")
def list_announcements_for_admin(request: Request):
    user = _user(request)
    _admin(user)
    db = get_connection()
    cursor = db.cursor(dictionary=True)
    try:

        cursor.execute("""
            SELECT n.id, n.title, n.message, n.visibility, n.recipient_user_id,
                   n.created_by, n.created_at, n.updated_at, n.is_active,
                   u.username AS recipient_username
            FROM panel_announcements n
            LEFT JOIN users u ON u.id=n.recipient_user_id
            ORDER BY n.created_at DESC
            LIMIT 500
        """)
        return {"success": True, "notifications": cursor.fetchall()}
    finally:
        cursor.close()
        db.close()


@router.post("/api/admin/notifications")
def create_announcement(payload: AnnouncementInput, request: Request):
    user = _user(request)
    _admin(user)
    visibility = payload.visibility.strip().lower()
    if visibility not in {"public", "private"}:
        raise HTTPException(400, "نوع اعلان باید عمومی یا خصوصی باشد")
    if visibility == "private" and not payload.recipient_user_id:
        raise HTTPException(400, "برای اعلان خصوصی، انتخاب کاربر الزامی است")
    if visibility == "public":
        recipient = None
    else:
        recipient = int(payload.recipient_user_id)
    db = get_connection()
    cursor = db.cursor(dictionary=True)
    try:

        if recipient is not None:
            cursor.execute("SELECT id FROM users WHERE id=%s AND is_active=1", (recipient,))
            if not cursor.fetchone():
                raise HTTPException(404, "کاربر مقصد فعال پیدا نشد")
        cursor.execute("""
            INSERT INTO panel_announcements
                (title, message, visibility, recipient_user_id, created_by, is_active)
            VALUES (%s,%s,%s,%s,%s,%s)
        """, (payload.title.strip(), payload.message.strip(), visibility, recipient,
              int(user["id"]), int(payload.is_active)))
        db.commit()
        return {"success": True, "id": cursor.lastrowid, "message": "اعلان در دیتابیس ذخیره شد"}
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(500, "ذخیره اعلان انجام نشد")
    finally:
        cursor.close()
        db.close()


@router.delete("/api/admin/notifications/{notification_id}")
def deactivate_announcement(notification_id: int, request: Request):
    user = _user(request)
    _admin(user)
    db = get_connection()
    cursor = db.cursor()
    try:

        cursor.execute(
            "UPDATE panel_announcements SET is_active=0 WHERE id=%s",
            (notification_id,),
        )
        if cursor.rowcount == 0:
            raise HTTPException(404, "اعلان پیدا نشد")
        db.commit()
        return {"success": True, "message": "اعلان غیرفعال شد"}
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(500, "غیرفعال‌سازی اعلان انجام نشد")
    finally:
        cursor.close()
        db.close()


@router.get("/api/admin/system-settings")
def get_system_settings(request: Request):
    user = _user(request)
    _admin(user)
    db = get_connection()
    cursor = db.cursor(dictionary=True)
    try:

        cursor.execute("SELECT setting_key, setting_value, updated_at FROM panel_system_settings ORDER BY setting_key")
        settings = {}
        for row in cursor.fetchall():
            try:
                settings[row["setting_key"]] = json.loads(row["setting_value"])
            except (TypeError, ValueError):
                settings[row["setting_key"]] = row["setting_value"]
        return {"success": True, "settings": settings}
    finally:
        cursor.close()
        db.close()


@router.put("/api/admin/system-settings")
def save_system_settings(payload: SettingsInput, request: Request):
    user = _user(request)
    _admin(user)
    if len(payload.settings) > 100:
        raise HTTPException(400, "تعداد تنظیمات بیش از حد مجاز است")
    db = get_connection()
    cursor = db.cursor()
    try:

        for key, value in payload.settings.items():
            if not key or len(key) > 120 or key.startswith("secret.") or "password" in key.lower() or "token" in key.lower():
                raise HTTPException(400, "کلید تنظیمات نامعتبر است؛ اسرار را در تنظیمات عمومی ذخیره نکنید")
            encoded = json.dumps(value, ensure_ascii=False)
            cursor.execute("""
                INSERT INTO panel_system_settings (setting_key, setting_value, updated_by)
                VALUES (%s,%s,%s)
                ON DUPLICATE KEY UPDATE
                    setting_value=VALUES(setting_value), updated_by=VALUES(updated_by)
            """, (key, encoded, int(user["id"])))
        db.commit()
        return {"success": True, "message": "تنظیمات ذخیره شد"}
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(500, "ذخیره تنظیمات انجام نشد")
    finally:
        cursor.close()
        db.close()


@router.get("/api/admin/audit-logs")
def get_panel_audit_logs(request: Request, limit: int = 200):
    user = _user(request)
    _admin(user)
    limit = max(1, min(int(limit), 500))
    db = get_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT id, user_id, username, login_status, otp_status,
                   ip_address, user_agent, failure_reason, created_at
            FROM login_logs
            ORDER BY id DESC
            LIMIT %s
            """,
            (limit,),
        )
        rows = cursor.fetchall()
        return {"success": True, "logs": rows}
    finally:
        cursor.close()
        db.close()


@router.get("/api/admin/activities")
def get_panel_activities(request: Request, limit: int = 200):
    # Login activity is backed by the same persistent audit source; this endpoint
    # does not invent synthetic activity records.
    result = get_panel_audit_logs(request, limit)
    return {"success": True, "activities": result["logs"]}

