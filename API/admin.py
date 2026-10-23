from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from API.database import get_connection
from fastapi import Depends
from API.permissions import require_permission, require_admin
from API.database import get_connection
from typing import Optional

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"]
)
class UpdateUserRequest(BaseModel):
    first_name: str
    last_name: str
    username: str
    new_password: str | None = None
    organizational_position: str | None = None
    access_level: int = 1
    is_active: int = 1

class LinkBaleAccountRequest(BaseModel):
    user_id: int
    bale_user_id: str

class CreateUserRequest(BaseModel):
    first_name: str
    last_name: str
    username: str
    password: str
    organizational_position: str | None = None
    access_level: int = 1
class ApproveBody(BaseModel):
    access_level: Optional[int] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None
    organizational_position: Optional[str] = None
    bale_user_id: Optional[int] = None
    bale_first_name: Optional[str] = None
    bale_last_name: Optional[str] = None
#help fun
def _admin_id(request: Request) -> int:
    user = getattr(request.state, "user", None)
    if isinstance(user, dict) and user.get("id"):
        return int(user["id"])
    return 1
@router.post("/registration-requests/{request_id}/approve")
def approve_registration(request_id: int, body: ApproveBody, request: Request):
    admin_id = _admin_id(request)
    db = get_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT * FROM registration_requests WHERE id=%s AND status='pending'",
            (request_id,),
        )
        req = cursor.fetchone()
        if not req:
            raise HTTPException(404, "درخواست پیدا نشد یا قبلاً بررسی شده")

        if not body.bale_user_id:
            raise HTTPException(400, "bale_user_id الزامی است")

        first_name = body.first_name or req["first_name"]
        last_name = body.last_name or req["last_name"]
        username = body.username or req["username"]
        position = (
            body.organizational_position
            if body.organizational_position is not None
            else req.get("organizational_position")
        )
        level = body.access_level
        if level is None:
            level = int(req.get("requested_access_level") or 1)
        level = max(1, min(3, int(level)))
        actor = getattr(request.state, "user", {}) or {}
        if level == 3 and int(actor.get("access_level") or 0) != 3:
            raise HTTPException(403, "فقط مدیر می‌تواند کاربر مدیر ایجاد کند")

        cursor.execute("SELECT id FROM users WHERE username=%s", (username,))
        if cursor.fetchone():
            raise HTTPException(400, "نام کاربری تکراری است")

        cursor.execute(
            "SELECT id FROM bale_accounts WHERE bale_user_id=%s",
            (body.bale_user_id,),
        )
        if cursor.fetchone():
            raise HTTPException(400, "این آیدی بله قبلاً ثبت شده")

        cursor.execute(
            """
            INSERT INTO users
            (first_name, last_name, username, password_hash,
             organizational_position, access_level, is_active)
            VALUES (%s,%s,%s,%s,%s,%s,1)
            """,
            (
                first_name,
                last_name,
                username,
                req["password_hash"],
                position,
                level,
            ),
        )
        user_id = cursor.lastrowid

        cursor.execute(
            """
            INSERT INTO bale_accounts
            (user_id, bale_user_id, bale_first_name, bale_last_name, is_active)
            VALUES (%s,%s,%s,%s,1)
            """,
            (
                user_id,
                body.bale_user_id,
                body.bale_first_name or first_name,
                body.bale_last_name or last_name,
            ),
        )

        cursor.execute(
            """
            UPDATE registration_requests
            SET status='approved', reviewed_at=NOW(), reviewed_by=%s
            WHERE id=%s
            """,
            (admin_id, request_id),
        )
        db.commit()
        return {
            "success": True,
            "message": "تأیید شد",
            "user_id": user_id,
            "bale_user_id": body.bale_user_id,
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))
    finally:
        cursor.close()
        db.close()
@router.delete("/users/{user_id}")
def delete_user(user_id: int, request: Request):

    db = get_connection()
    cursor = db.cursor()

    try:
        cursor.execute(
            "SELECT id, access_level FROM users WHERE id = %s LIMIT 1",
            (user_id,)
        )

        target_user = cursor.fetchone()
        if not target_user:
            raise HTTPException(
                status_code=404,
                detail="کاربر پیدا نشد"
            )
        actor = getattr(request.state, "user", {}) or {}
        if int(target_user.get("access_level") or 0) == 3 and int(actor.get("access_level") or 0) != 3:
            raise HTTPException(403, "حذف حساب مدیر فقط توسط مدیر دیگر مجاز است")

        cursor.execute(
            "DELETE FROM users WHERE id = %s",
            (user_id,)
        )

        db.commit()

        return {
            "success": True,
            "message": "کاربر با موفقیت حذف شد"
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as e:
        db.rollback()

        print("DELETE USER ERROR:", e)

        raise HTTPException(
            status_code=500,
            detail="خطا در حذف کاربر"
        )

    finally:
        cursor.close()
        db.close()

@router.put("/users/{user_id}")
def update_user(user_id: int, data: UpdateUserRequest, request: Request):

    db = get_connection()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT id FROM users WHERE id = %s LIMIT 1",
            (user_id,)
        )

        target_user = cursor.fetchone()
        if not target_user:
            raise HTTPException(
                status_code=404,
                detail="کاربر پیدا نشد"
            )
        actor = getattr(request.state, "user", {}) or {}
        is_admin_actor = int(actor.get("access_level") or 0) == 3
        if not is_admin_actor and (
            int(data.access_level or 0) == 3
            or int(target_user.get("access_level") or 0) == 3
            or int(data.is_active or 0) == 0
        ):
            raise HTTPException(403, "تغییر سطح مدیر یا غیرفعال‌سازی حساب‌ها فقط برای مدیران مجاز است")
        if int(data.access_level or 0) not in (1, 2, 3):
            raise HTTPException(400, "سطح دسترسی نامعتبر است")

        cursor.execute("""
            SELECT id
            FROM users
            WHERE username = %s
              AND id != %s
            LIMIT 1
        """, (data.username, user_id))

        if cursor.fetchone():
            raise HTTPException(
                status_code=409,
                detail="این نام کاربری قبلاً استفاده شده است"
            )

        # اگر رمز جدید وارد شده باشد
        if data.new_password and data.new_password.strip():

            from API.auth import pwd_context

            password_hash = pwd_context.hash(
                data.new_password
            )

            cursor.execute("""
                UPDATE users
                SET
                    first_name = %s,
                    last_name = %s,
                    username = %s,
                    password_hash = %s,
                    organizational_position = %s,
                    access_level = %s,
                    is_active = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (
                data.first_name,
                data.last_name,
                data.username,
                password_hash,
                data.organizational_position,
                data.access_level,
                data.is_active,
                user_id
            ))

        else:

            cursor.execute("""
                UPDATE users
                SET
                    first_name = %s,
                    last_name = %s,
                    username = %s,
                    organizational_position = %s,
                    access_level = %s,
                    is_active = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (
                data.first_name,
                data.last_name,
                data.username,
                data.organizational_position,
                data.access_level,
                data.is_active,
                user_id
            ))

        db.commit()

        return {
            "success": True,
            "message": "اطلاعات کاربر با موفقیت به‌روزرسانی شد"
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as e:
        db.rollback()

        print("UPDATE USER ERROR:", e)

        raise HTTPException(
            status_code=500,
            detail="خطا در به‌روزرسانی کاربر"
        )

    finally:
        cursor.close()
        db.close()

@router.post("/users")
def create_user(data: CreateUserRequest, request: Request):

    db = get_connection()
    cursor = db.cursor(dictionary=True)

    try:
        actor = getattr(request.state, "user", {}) or {}
        if int(data.access_level or 0) not in (1, 2, 3):
            raise HTTPException(400, "سطح دسترسی نامعتبر است")
        if int(data.access_level or 0) == 3 and int(actor.get("access_level") or 0) != 3:
            raise HTTPException(403, "فقط مدیر می‌تواند کاربر مدیر ایجاد کند")
        cursor.execute(
            "SELECT id FROM users WHERE username = %s LIMIT 1",
            (data.username,)
        )

        if cursor.fetchone():
            raise HTTPException(
                status_code=409,
                detail="این نام کاربری قبلاً استفاده شده است"
            )

        # استفاده از همان bcrypt پروژه
        from API.auth import pwd_context

        password_hash = pwd_context.hash(data.password)

        cursor.execute("""
            INSERT INTO users (
                first_name,
                last_name,
                username,
                password_hash,
                organizational_position,
                access_level,
                is_active
            )
            VALUES (%s, %s, %s, %s, %s, %s, 1)
        """, (
            data.first_name,
            data.last_name,
            data.username,
            password_hash,
            data.organizational_position,
            data.access_level
        ))

        db.commit()

        return {
            "success": True,
            "message": "کاربر با موفقیت ایجاد شد",
            "user": {
                "id": cursor.lastrowid,
                "first_name": data.first_name,
                "last_name": data.last_name,
                "username": data.username,
                "organizational_position": data.organizational_position,
                "access_level": data.access_level,
                "is_active": 1
            }
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as e:
        db.rollback()
        print("CREATE USER ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail="خطا در ایجاد کاربر"
        )

    finally:
        cursor.close()
        db.close()
@router.post("/users/link-bale")
def link_bale_account(data: LinkBaleAccountRequest):

    db = get_connection()
    cursor = db.cursor(dictionary=True)

    try:

        # بررسی وجود کاربر
        cursor.execute("""
            SELECT
                id,
                first_name,
                last_name,
                username
            FROM users
            WHERE id = %s
            LIMIT 1
        """, (data.user_id,))

        user = cursor.fetchone()

        if not user:
            raise HTTPException(
                status_code=404,
                detail="کاربر پیدا نشد"
            )


        # بررسی اینکه این کاربر قبلاً حساب بله دارد یا نه
        cursor.execute("""
            SELECT id
            FROM bale_accounts
            WHERE user_id = %s
            LIMIT 1
        """, (data.user_id,))

        existing = cursor.fetchone()

        if existing:
            raise HTTPException(
                status_code=409,
                detail="این کاربر قبلاً به حساب بله متصل شده است"
            )


        # بررسی تکراری نبودن bale_user_id
        cursor.execute("""
            SELECT id
            FROM bale_accounts
            WHERE bale_user_id = %s
            LIMIT 1
        """, (data.bale_user_id,))

        existing_bale = cursor.fetchone()

        if existing_bale:
            raise HTTPException(
                status_code=409,
                detail="این ID بله قبلاً استفاده شده است"
            )


        # ثبت ارتباط
        cursor.execute("""
            INSERT INTO bale_accounts
            (
                user_id,
                bale_user_id,
                bale_first_name,
                bale_last_name,
                is_active
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                1
            )
        """, (
            data.user_id,
            data.bale_user_id,
            user["first_name"],
            user["last_name"]
        ))


        db.commit()


        bale_account_id = cursor.lastrowid


        return {
            "success": True,
            "message": "حساب بله با موفقیت متصل شد",
            "bale_account": {
                "id": bale_account_id,
                "user_id": data.user_id,
                "bale_user_id": data.bale_user_id,
                "bale_first_name": user["first_name"],
                "bale_last_name": user["last_name"],
                "is_active": 1
            }
        }


    except HTTPException:
        db.rollback()
        raise


    except Exception as e:

        db.rollback()

        print(
            "LINK BALE ACCOUNT ERROR:",
            e
        )

        raise HTTPException(
            status_code=500,
            detail="خطا در اتصال حساب بله"
        )


    finally:

        cursor.close()
        db.close()
@router.get("/registration-requests")
def get_registration_requests(
    permission=Depends(
        require_permission("registration_requests.read")
    )
):
    db = get_connection()
    cursor = db.cursor(dictionary=True)

    cursor.execute("""
        SELECT 
            id,
            first_name,
            last_name,
            username,
            organizational_position,
            requested_access_level,
            status,
            created_at
        FROM registration_requests
        ORDER BY created_at DESC
    """)

    data = cursor.fetchall()

    cursor.close()
    db.close()

    return {
        "success": True,
        "requests": data,
        "data": data,
    }
