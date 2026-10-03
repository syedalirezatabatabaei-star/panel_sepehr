from API.database import get_connection
from fastapi import HTTPException, Request
from fastapi import HTTPException, Depends
from API.auth  import get_current_user

def require_permission(permission_code: str):

    def checker(current_user=Depends(get_current_user)):

        if not current_user.get("authenticated"):
            raise HTTPException(
                status_code=401,
                detail="کاربر وارد نشده است"
            )


        user_id = current_user["user"]["id"]


        if not has_permission(
            user_id,
            permission_code
        ):
            raise HTTPException(
                status_code=403,
                detail={
                    "message":
                    "شما صلاحیت لازم برای این صفحه را ندارید. تایید مدیر عامل را بگیرید و سپس برای سطح دسترسی به مسئول واحد تحول دیجیتال مراجعه کنید."
                }
            )


        return current_user


    return checker

def has_permission(user_id: int, permission_code: str) -> bool:
    """
    بررسی دسترسی کاربر
    """

    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    try:

        cursor.execute(
            """
            SELECT access_level
            FROM users
            WHERE id = %s
            """,
            (user_id,)
        )

        user = cursor.fetchone()

        if not user:
            return False


        if user["access_level"] == 3:
            return True


        cursor.execute(
            """
            SELECT rp.id
            FROM users u
            JOIN role_permissions rp 
                ON u.role_id = rp.role_id
            JOIN permissions p
                ON rp.permission_id = p.id
            WHERE u.id = %s
            AND p.code = %s
            """,
            (
                user_id,
                permission_code
            )
        )

        role_permission = cursor.fetchone()


        if role_permission:
            return True


        cursor.execute(
            """
            SELECT up.id
            FROM user_permissions up
            JOIN permissions p
                ON up.permission_id = p.id
            WHERE up.user_id = %s
            AND p.code = %s
            AND up.can_read = 1
            """,
            (
                user_id,
                permission_code
            )
        )


        user_permission = cursor.fetchone()


        if user_permission:
            return True


        return False


    finally:
        cursor.close()
        connection.close()
