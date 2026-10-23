from API.database import get_connection
from fastapi import HTTPException, Request


def require_admin(request: Request):
    user = getattr(request.state, "user", None)
    if not isinstance(user, dict) or not user.get("id"):
        raise HTTPException(status_code=401, detail="کاربر وارد نشده است")
    if not user.get("is_active") or int(user.get("access_level") or 0) != 3:
        raise HTTPException(status_code=403, detail="این بخش فقط برای مدیران مجاز است")
    return user


def require_permission(permission_code: str, action: str = "read"):
    def checker(request: Request):
        user = getattr(request.state, "user", None)
        if not isinstance(user, dict) or not user.get("id"):
            raise HTTPException(status_code=401, detail="کاربر وارد نشده است")
        if not has_permission(int(user["id"]), permission_code, action=action):
            raise HTTPException(
                status_code=403,
                detail={"message": "شما دسترسی لازم برای این عملیات را ندارید."},
            )
        return user
    return checker


def has_permission(user_id: int, permission_code: str, action: str = "use") -> bool:
    """Check a user's explicit grant, then their role grant.

    A user-level row is an override, including an explicit denial. Role grants
    permit both read and write unless overridden for the individual user.
    """
    if action not in {"read", "write", "use"}:
        raise ValueError("action must be read, write, or use")

    connection = get_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT access_level, is_active, role_id FROM users WHERE id=%s",
            (user_id,),
        )
        user = cursor.fetchone()
        if not user or not user.get("is_active"):
            return False
        if int(user.get("access_level") or 0) == 3:
            return True

        cursor.execute("""
            SELECT up.can_read, up.can_write
            FROM user_permissions up
            JOIN permissions p ON p.id = up.permission_id
            WHERE up.user_id=%s AND p.code=%s
            LIMIT 1
        """, (user_id, permission_code))
        override = cursor.fetchone()
        if override is not None:
            if action == "read":
                return bool(override.get("can_read"))
            if action == "write":
                return bool(override.get("can_write"))
            return bool(override.get("can_read") or override.get("can_write"))

        cursor.execute("""
            SELECT rp.id
            FROM role_permissions rp
            JOIN permissions p ON p.id=rp.permission_id
            WHERE rp.role_id=%s AND p.code=%s
            LIMIT 1
        """, (user.get("role_id"), permission_code))
        return cursor.fetchone() is not None
    finally:
        cursor.close()
        connection.close()
