from API.database import get_connection
from fastapi import HTTPException, Request


def require_admin(request: Request):
    user = getattr(request.state, "user", None)
    if not isinstance(user, dict) or not user.get("id"):
        raise HTTPException(status_code=401, detail="کاربر وارد نشده است")
    if not user.get("is_active") or int(user.get("access_level") or 0) != 3:
        raise HTTPException(status_code=403, detail="این بخش فقط برای مدیران مجاز است")
    return user


def require_permission(permission_code: str, action: str | None = None):
    # Support existing decorators that use "feature.read" / "feature.write"
    # while storing a single base permission code in the database.
    if action is None:
        if permission_code.endswith(".read"):
            permission_code, action = permission_code[:-5], "read"
        elif permission_code.endswith(".write"):
            permission_code, action = permission_code[:-6], "write"
        else:
            action = "use"

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
    """Evaluate RBAC as role grants OR explicit per-user grants.

    user_permissions stores additional individual grants. A missing or unchecked
    individual grant must never silently cancel a permission inherited from a role.
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
            SELECT
                COALESCE(MAX(up.can_read), 0) AS personal_read,
                COALESCE(MAX(up.can_write), 0) AS personal_write
            FROM user_permissions up
            JOIN permissions p ON p.id = up.permission_id
            WHERE up.user_id=%s AND p.code=%s
        """, (user_id, permission_code))
        personal = cursor.fetchone() or {}
        if action == "read" and bool(personal.get("personal_read")):
            return True
        if action == "write" and bool(personal.get("personal_write")):
            return True
        if action == "use" and (
            bool(personal.get("personal_read")) or bool(personal.get("personal_write"))
        ):
            return True

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
