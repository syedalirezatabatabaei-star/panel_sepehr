from fastapi import APIRouter, HTTPException, HTTPException
from pydantic import BaseModel
from pydantic import BaseModel
from API.database import get_connection


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
@router.delete("/users/{user_id}")
def delete_user(user_id: int):

    db = get_connection()
    cursor = db.cursor()

    try:
        cursor.execute(
            "SELECT id FROM users WHERE id = %s LIMIT 1",
            (user_id,)
        )

        if not cursor.fetchone():
            raise HTTPException(
                status_code=404,
                detail="کاربر پیدا نشد"
            )

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
def update_user(user_id: int, data: UpdateUserRequest):

    db = get_connection()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT id FROM users WHERE id = %s LIMIT 1",
            (user_id,)
        )

        if not cursor.fetchone():
            raise HTTPException(
                status_code=404,
                detail="کاربر پیدا نشد"
            )

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
def create_user(data: CreateUserRequest):

    db = get_connection()
    cursor = db.cursor(dictionary=True)

    try:
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
def get_registration_requests():

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
        "data": data
    }
