from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from API.database import get_connection
from passlib.context import CryptContext

import requests
import hashlib
import secrets
from datetime import datetime, timedelta, timezone


router = APIRouter(
    prefix="/api/auth",
    tags=["Auth"]
)


pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

# =========================================================
# CONFIG
# =========================================================

SESSION_EXPIRE_MINUTES = 480

N8N_TOKEN_WEBHOOK = "https://n8n.sepehrsalamati.ir/webhook/Token"
N8N_RESEND_OTP_WEBHOOK = "https://n8n.sepehrsalamati.ir/webhook/Token"


# =========================================================
# REQUEST MODELS
# =========================================================

class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    username: str
    password: str
    organizational_position: str | None = None
    requested_access_level: int = 1


class LoginRequest(BaseModel):
    username: str
    password: str


class VerifyOTPRequest(BaseModel):
    username: str
    otp: str
    request_id: int


class ResendOTPRequest(BaseModel):
    username: str
    request_id: int | None = None


# =========================================================
# HELPER - GET USER
# =========================================================

def get_user_by_username(username: str):

    db = get_connection()
    cursor = db.cursor(dictionary=True)

    try:

        cursor.execute(
            """
            SELECT
                id,
                first_name,
                last_name,
                username,
                password_hash,
                organizational_position,
                access_level,
                is_active
            FROM users
            WHERE username = %s
            LIMIT 1
            """,
            (username,)
        )

        return cursor.fetchone()

    finally:

        cursor.close()
        db.close()


# =========================================================
# HELPER - GET BALE ACCOUNT
# =========================================================

def get_bale_account(user_id: int):

    db = get_connection()
    cursor = db.cursor(dictionary=True)

    try:

        cursor.execute(
            """
            SELECT
                id,
                user_id,
                bale_user_id,
                bale_first_name,
                bale_last_name,
                is_active
            FROM bale_accounts
            WHERE user_id = %s
            LIMIT 1
            """,
            (user_id,)
        )

        return cursor.fetchone()

    finally:

        cursor.close()
        db.close()


# =========================================================
# REGISTER
# =========================================================

@router.post("/register")
def register(data: RegisterRequest):

    password_hash = pwd_context.hash(data.password)

    db = get_connection()
    cursor = db.cursor()

    try:

        sql = """
        INSERT INTO registration_requests
        (
            first_name,
            last_name,
            username,
            password_hash,
            organizational_position,
            requested_access_level
        )
        VALUES
        (%s, %s, %s, %s, %s, %s)
        """

        values = (
            data.first_name,
            data.last_name,
            data.username,
            password_hash,
            data.organizational_position,
            data.requested_access_level
        )

        cursor.execute(sql, values)
        db.commit()

        return {
            "success": True,
            "message": "درخواست ثبت شد"
        }

    except Exception as e:

        db.rollback()

        print("REGISTER ERROR:", str(e))

        return {
            "success": False,
            "message": "خطا در ثبت درخواست"
        }

    finally:

        cursor.close()
        db.close()


# =========================================================
# LOGIN
# =========================================================

@router.post("/login")
def login(data: LoginRequest, request: Request):

    db = get_connection()
    cursor = db.cursor(dictionary=True)

    try:

        # -------------------------------------------------
        # Find user
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                first_name,
                last_name,
                username,
                password_hash,
                organizational_position,
                access_level,
                is_active
            FROM users
            WHERE username = %s
            LIMIT 1
            """,
            (data.username,)
        )

        user = cursor.fetchone()

        # -------------------------------------------------
        # User not found
        # -------------------------------------------------

        if not user:

            return {
                "success": False,
                "message": "نام کاربری یا رمز عبور اشتباه است"
            }

        # -------------------------------------------------
        # Check active
        # -------------------------------------------------

        if user["is_active"] != 1:

            return {
                "success": False,
                "message": "حساب کاربری غیرفعال است"
            }

        # -------------------------------------------------
        # Check password
        # -------------------------------------------------

        try:

            password_valid = pwd_context.verify(
                data.password,
                user["password_hash"]
            )

        except Exception as e:

            print("PASSWORD VERIFY ERROR:", str(e))

            return {
                "success": False,
                "message": "خطا در بررسی رمز عبور"
            }

        if not password_valid:

            return {
                "success": False,
                "message": "نام کاربری یا رمز عبور اشتباه است"
            }

        # -------------------------------------------------
        # Find Bale account
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                bale_user_id,
                bale_first_name,
                bale_last_name,
                is_active
            FROM bale_accounts
            WHERE user_id = %s
            LIMIT 1
            """,
            (user["id"],)
        )

        bale_account = cursor.fetchone()

        if not bale_account:

            return {
                "success": False,
                "message": "حساب بله برای این کاربر ثبت نشده است"
            }

        if bale_account["is_active"] != 1:

            return {
                "success": False,
                "message": "حساب بله کاربر غیرفعال است"
            }

        # -------------------------------------------------
        # Client information
        # -------------------------------------------------

        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        # -------------------------------------------------
        # Create Login Log
        # -------------------------------------------------

        cursor.execute(
            """
            INSERT INTO login_logs
            (
                user_id,
                username,
                login_status,
                otp_status,
                ip_address,
                user_agent,
                failure_reason
            )
            VALUES
            (%s, %s, 'success', 'pending', %s, %s, NULL)
            """,
            (
                user["id"],
                user["username"],
                client_ip,
                user_agent
            )
        )

        db.commit()

        # -------------------------------------------------
        # Prepare N8N data
        # -------------------------------------------------

        webhook_data = {
            "username": user["username"],
            "bale_user_id": bale_account["bale_user_id"],
            "first_name": (
                bale_account["bale_first_name"]
                or user["first_name"]
            ),
            "last_name": (
                bale_account["bale_last_name"]
                or user["last_name"]
            )
        }

        print("========================================")
        print("Sending OTP request to n8n:")
        print(webhook_data)
        print("========================================")

        # -------------------------------------------------
        # Send OTP
        # -------------------------------------------------

        try:

            webhook_response = requests.post(
                N8N_TOKEN_WEBHOOK,
                json=webhook_data,
                timeout=15
            )

        except requests.RequestException as e:

            print("N8N CONNECTION ERROR:", str(e))

            cursor.execute(
                """
                UPDATE login_logs
                SET
                    otp_status = 'failed',
                    failure_reason = %s
                WHERE
                    user_id = %s
                    AND username = %s
                    AND login_status = 'success'
                    AND otp_status = 'pending'
                ORDER BY id DESC
                LIMIT 1
                """,
                (
                    "ارتباط با سرویس OTP برقرار نشد",
                    user["id"],
                    user["username"]
                )
            )

            db.commit()

            return {
                "success": False,
                "message": "ارتباط با سرویس ارسال OTP برقرار نشد"
            }

        # -------------------------------------------------
        # N8N HTTP error
        # -------------------------------------------------

        if not 200 <= webhook_response.status_code < 300:

            print(
                "N8N ERROR:",
                webhook_response.status_code,
                webhook_response.text
            )

            cursor.execute(
                """
                UPDATE login_logs
                SET
                    otp_status = 'failed',
                    failure_reason = %s
                WHERE
                    user_id = %s
                    AND username = %s
                    AND login_status = 'success'
                    AND otp_status = 'pending'
                ORDER BY id DESC
                LIMIT 1
                """,
                (
                    "خطا از سرویس OTP",
                    user["id"],
                    user["username"]
                )
            )

            db.commit()

            return {
                "success": False,
                "message": "خطا در ارسال کد تایید"
            }

        # -------------------------------------------------
        # Parse N8N response
        # -------------------------------------------------

        try:

            n8n_data = webhook_response.json()

        except Exception:

            print(
                "N8N INVALID JSON:",
                webhook_response.text
            )

            return {
                "success": False,
                "message": "پاسخ نامعتبر از سرویس OTP"
            }

        print("N8N RESPONSE:")
        print(n8n_data)

        # -------------------------------------------------
        # Request ID
        # -------------------------------------------------

        request_id = n8n_data.get("request_id")

        if not request_id:

            return {
                "success": False,
                "message": "شناسه درخواست OTP دریافت نشد"
            }

        # -------------------------------------------------
        # Final login response
        # -------------------------------------------------

        return {
            "success": True,
            "message": "کد تایید ارسال شد",

            "request_id": request_id,

            "user": {
                "id": user["id"],
                "username": user["username"],
                "first_name": user["first_name"],
                "last_name": user["last_name"],
                "organizational_position": user[
                    "organizational_position"
                ],
                "access_level": user["access_level"],
                "is_active": user["is_active"],
                "permissions": get_user_permissions(user["id"])
            },

            "bale_account": {
                "bale_user_id": bale_account["bale_user_id"],
                "bale_first_name": bale_account["bale_first_name"],
                "bale_last_name": bale_account["bale_last_name"]
            }
        }

    except Exception as e:

        db.rollback()

        print("LOGIN ERROR:", str(e))

        return {
            "success": False,
            "message": "خطا در ورود"
        }

    finally:
        print("ME USER DATA:", user)
        cursor.close()
        db.close()


# =========================================================
# VERIFY OTP
# =========================================================

@router.post("/verify-otp")
def verify_otp(data: VerifyOTPRequest, request: Request):

    db = get_connection()
    cursor = db.cursor(dictionary=True)

    try:

        print("========================================")
        print("VERIFY OTP REQUEST")
        print("username:", data.username)
        print("request_id:", data.request_id)
        print("========================================")

        # -------------------------------------------------
        # Find OTP
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                username,
                bale_user_id,
                otp_hash,
                expires_at,
                is_used
            FROM otp_codes
            WHERE id = %s
              AND username = %s
            LIMIT 1
            """,
            (
                data.request_id,
                data.username
            )
        )

        otp_record = cursor.fetchone()

        if not otp_record:

            print("OTP RECORD NOT FOUND")

            return {
                "success": False,
                "error": "INVALID_OTP",
                "message": "درخواست OTP معتبر نیست"
            }

        # -------------------------------------------------
        # Check used
        # -------------------------------------------------

        if otp_record["is_used"] == 1:

            return {
                "success": False,
                "error": "OTP_EXPIRED",
                "message": "این کد قبلاً استفاده شده است"
            }

        # -------------------------------------------------
        # Check expiration
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT NOW() < %s AS is_valid
            """,
            (otp_record["expires_at"],)
        )

        expiration = cursor.fetchone()

        if not expiration["is_valid"]:

            # Update login log
            cursor.execute(
                """
                UPDATE login_logs
                SET
                    otp_status = 'expired',
                    failure_reason = 'OTP expired'
                WHERE
                    user_id = (
                        SELECT id
                        FROM users
                        WHERE username = %s
                        LIMIT 1
                    )
                    AND username = %s
                    AND login_status = 'success'
                    AND otp_status = 'pending'
                ORDER BY id DESC
                LIMIT 1
                """,
                (
                    data.username,
                    data.username
                )
            )

            db.commit()

            return {
                "success": False,
                "error": "OTP_EXPIRED",
                "message": "کد تأیید منقضی شده است"
            }

        # -------------------------------------------------
        # Hash submitted OTP
        # -------------------------------------------------

        submitted_hash = hashlib.sha256(
            data.otp.encode("utf-8")
        ).hexdigest()

        print("========================================")
        print("OTP HASH DEBUG")
        print("CALCULATED HASH:", submitted_hash)
        print("DATABASE HASH:", otp_record["otp_hash"])
        print(
            "HASH MATCH:",
            submitted_hash == otp_record["otp_hash"]
        )
        print("========================================")

        # -------------------------------------------------
        # Invalid OTP
        # -------------------------------------------------

        if submitted_hash != otp_record["otp_hash"]:

            cursor.execute(
                """
                UPDATE login_logs
                SET
                    otp_status = 'failed',
                    failure_reason = 'Invalid OTP'
                WHERE
                    user_id = (
                        SELECT id
                        FROM users
                        WHERE username = %s
                        LIMIT 1
                    )
                    AND username = %s
                    AND login_status = 'success'
                    AND otp_status = 'pending'
                ORDER BY id DESC
                LIMIT 1
                """,
                (
                    data.username,
                    data.username
                )
            )

            db.commit()

            return {
                "success": False,
                "error": "INVALID_OTP",
                "message": "کد تأیید صحیح نیست"
            }

        # -------------------------------------------------
        # Find user
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                first_name,
                last_name,
                username,
                organizational_position,
                access_level,
                is_active
            FROM users
            WHERE username = %s
            LIMIT 1
            """,
            (data.username,)
        )

        user = cursor.fetchone()

        if not user:

            db.rollback()

            return {
                "success": False,
                "message": "کاربر پیدا نشد"
            }

        if user["is_active"] != 1:

            db.rollback()

            return {
                "success": False,
                "message": "حساب کاربری غیرفعال است"
            }

        # -------------------------------------------------
        # Mark OTP as used
        # -------------------------------------------------

        cursor.execute(
            """
            UPDATE otp_codes
            SET is_used = 1
            WHERE
                id = %s
                AND username = %s
                AND is_used = 0
            """,
            (
                otp_record["id"],
                data.username
            )
        )

        if cursor.rowcount != 1:

            db.rollback()

            return {
                "success": False,
                "error": "OTP_EXPIRED",
                "message": "این کد قبلاً استفاده شده است"
            }

        # -------------------------------------------------
        # Create raw session token
        # -------------------------------------------------

        raw_token = secrets.token_urlsafe(64)

        # -------------------------------------------------
        # Hash session token
        # -------------------------------------------------

        token_hash = hashlib.sha256(
            raw_token.encode("utf-8")
        ).hexdigest()

        # -------------------------------------------------
        # Session expiration
        # -------------------------------------------------

        expires_at = datetime.now(timezone.utc).replace(
            tzinfo=None
        ) + timedelta(
            minutes=SESSION_EXPIRE_MINUTES
        )

        # -------------------------------------------------
        # Client information
        # -------------------------------------------------

        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        # -------------------------------------------------
        # Disable previous sessions
        # -------------------------------------------------

        cursor.execute(
            """
            UPDATE login_sessions
            SET is_active = 0
            WHERE user_id = %s
              AND is_active = 1
            """,
            (user["id"],)
        )

        # -------------------------------------------------
        # Insert new session
        # -------------------------------------------------

        cursor.execute(
            """
            INSERT INTO login_sessions
            (
                user_id,
                session_token_hash,
                ip_address,
                user_agent,
                is_active,
                expires_at
            )
            VALUES
            (%s, %s, %s, %s, 1, %s)
            """,
            (
                user["id"],
                token_hash,
                client_ip,
                user_agent,
                expires_at
            )
        )

        # -------------------------------------------------
        # Update login log
        # -------------------------------------------------

        cursor.execute(
            """
            UPDATE login_logs
            SET
                otp_status = 'success',
                failure_reason = NULL
            WHERE
                user_id = %s
                AND username = %s
                AND login_status = 'success'
                AND otp_status = 'pending'
            ORDER BY id DESC
            LIMIT 1
            """,
            (
                user["id"],
                user["username"]
            )
        )

        # -------------------------------------------------
        # Commit everything
        # -------------------------------------------------

        db.commit()

        print("========================================")
        print("OTP VERIFIED SUCCESSFULLY")
        print("SESSION CREATED")
        print("USER:", user["username"])
        print("SESSION COOKIE WILL BE SET")
        print("========================================")

        # -------------------------------------------------
        # Create response
        # -------------------------------------------------

        response = JSONResponse(
            content={
                "success": True,
                "message": "تأیید هویت با موفقیت انجام شد",
                "redirect": "/dashboard/index.html",
                "access_token": raw_token,
                "token_type": "Bearer",
                "expires_in": SESSION_EXPIRE_MINUTES * 60,

                "user": {
                    "id": user["id"],
                    "username": user["username"],
                    "first_name": user["first_name"],
                    "last_name": user["last_name"],
                    "organizational_position": user[
                        "organizational_position"
                    ],
                    "access_level": user["access_level"],
                    "is_active": user["is_active"],
                    "permissions": get_user_permissions(user["id"])
                }
            }
        )

        # -------------------------------------------------
        # Set Session Cookie
        # -------------------------------------------------

        response.set_cookie(
            key="session_token",
            value=raw_token,
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=SESSION_EXPIRE_MINUTES * 60,
            path="/"
        )

        print("========================================")
        print("SESSION COOKIE SET")
        print("COOKIE NAME: session_token")
        print("HTTPONLY: True")
        print("SECURE: False")
        print("SAMESITE: lax")
        print("MAX AGE:", SESSION_EXPIRE_MINUTES * 60)
        print("========================================")

        return response

    except Exception as e:

        db.rollback()

        print("VERIFY OTP ERROR:", str(e))

        return {
            "success": False,
            "message": "خطا در بررسی کد تأیید"
        }

    finally:

        cursor.close()
        db.close()


# =========================================================
# RESEND OTP
# =========================================================

@router.post("/resend-otp")
def resend_otp(data: ResendOTPRequest):

    db = get_connection()
    cursor = db.cursor(dictionary=True)

    try:

        # -------------------------------------------------
        # User
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                username,
                first_name,
                last_name,
                is_active
            FROM users
            WHERE username = %s
            LIMIT 1
            """,
            (data.username,)
        )

        user = cursor.fetchone()

        if not user:

            return {
                "success": False,
                "message": "کاربر پیدا نشد"
            }

        if user["is_active"] != 1:

            return {
                "success": False,
                "message": "حساب کاربری غیرفعال است"
            }

        # -------------------------------------------------
        # Bale account
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                bale_user_id,
                bale_first_name,
                bale_last_name,
                is_active
            FROM bale_accounts
            WHERE user_id = %s
            LIMIT 1
            """,
            (user["id"],)
        )

        bale_account = cursor.fetchone()

        if not bale_account:

            return {
                "success": False,
                "message": "حساب بله برای این کاربر ثبت نشده است"
            }

        if bale_account["is_active"] != 1:

            return {
                "success": False,
                "message": "حساب بله کاربر غیرفعال است"
            }

        # -------------------------------------------------
        # N8N
        # -------------------------------------------------

        webhook_data = {
            "username": user["username"],
            "bale_user_id": bale_account["bale_user_id"],
            "first_name": (
                bale_account["bale_first_name"]
                or user["first_name"]
            ),
            "last_name": (
                bale_account["bale_last_name"]
                or user["last_name"]
            ),
            "resend": True
        }

        print("========================================")
        print("RESEND OTP -> N8N")
        print(webhook_data)
        print("========================================")

        try:

            webhook_response = requests.post(
                N8N_RESEND_OTP_WEBHOOK,
                json=webhook_data,
                timeout=15
            )

        except requests.RequestException as e:

            print("N8N RESEND ERROR:", str(e))

            return {
                "success": False,
                "message": "ارتباط با سرویس ارسال OTP برقرار نشد"
            }

        # -------------------------------------------------
        # HTTP error
        # -------------------------------------------------

        if not 200 <= webhook_response.status_code < 300:

            print(
                "N8N RESEND HTTP ERROR:",
                webhook_response.status_code,
                webhook_response.text
            )

            return {
                "success": False,
                "message": "خطا در ارسال مجدد کد"
            }

        # -------------------------------------------------
        # Parse response
        # -------------------------------------------------

        try:

            n8n_data = webhook_response.json()

        except Exception:

            print(
                "N8N RESEND INVALID JSON:",
                webhook_response.text
            )

            return {
                "success": False,
                "message": "پاسخ نامعتبر از سرویس OTP"
            }

        print("N8N RESEND RESPONSE:")
        print(n8n_data)

        request_id = n8n_data.get("request_id")

        if not request_id:

            return {
                "success": False,
                "message": "شناسه درخواست OTP دریافت نشد"
            }

        # -------------------------------------------------
        # Update login log
        # -------------------------------------------------

        cursor.execute(
            """
            UPDATE login_logs
            SET
                otp_status = 'pending',
                failure_reason = NULL
            WHERE
                user_id = %s
                AND username = %s
                AND login_status = 'success'
                AND otp_status IN (
                    'failed',
                    'expired',
                    'pending'
                )
            ORDER BY id DESC
            LIMIT 1
            """,
            (
                user["id"],
                user["username"]
            )
        )

        db.commit()

        return {
            "success": True,
            "message": "کد تأیید مجدداً ارسال شد",
            "request_id": request_id,
            "countdown": 60
        }

    except Exception as e:

        db.rollback()

        print("RESEND OTP ERROR:", str(e))

        return {
            "success": False,
            "message": "خطا در ارسال مجدد کد"
        }

    finally:

        cursor.close()
        db.close()


# =========================================================
# GET USER FROM SESSION
# =========================================================

def get_user_from_session(request: Request):

    token = request.cookies.get("session_token")
    if not token:
        authorization = request.headers.get("Authorization", "")
        scheme, _, bearer_token = authorization.partition(" ")
        if scheme.lower() == "bearer" and bearer_token.strip():
            token = bearer_token.strip()

    if not token:
        return None

    token_hash = hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()

    db = get_connection()
    cursor = db.cursor(dictionary=True)

    try:

        cursor.execute(
            """
            SELECT
                s.id AS session_id,
                s.user_id,
                s.expires_at,
                s.last_activity_at,

                u.id,
                u.first_name,
                u.last_name,
                u.username,
                u.organizational_position,
                u.access_level,
                u.is_active

            FROM login_sessions s

            INNER JOIN users u
                ON u.id = s.user_id

            WHERE
                s.session_token_hash = %s
                AND s.is_active = 1
                AND s.expires_at > UTC_TIMESTAMP()
                AND u.is_active = 1

            LIMIT 1
            """,
            (token_hash,)
        )

        user = cursor.fetchone()

        if not user:

            print("SESSION CHECK: INVALID SESSION")

            return None

        # -------------------------------------------------
        # Update last activity
        # -------------------------------------------------

        cursor.execute(
            """
            UPDATE login_sessions
            SET last_activity_at = CURRENT_TIMESTAMP
            WHERE id = %s
            """,
            (user["session_id"],)
        )

        db.commit()

        print("SESSION CHECK: VALID")
        print("USER:", user["username"])

        return user

    finally:

        cursor.close()
        db.close()


# =========================================================
# CURRENT USER / ME
# =========================================================
def get_user_permissions(user_id: int):

    db = get_connection()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                p.code,
                rp.id IS NOT NULL AS role_permission,
                up.can_read,
                up.can_write
            FROM permissions p

            LEFT JOIN role_permissions rp
                ON rp.permission_id = p.id

            LEFT JOIN user_permissions up
                ON up.permission_id = p.id
                AND up.user_id = %s

            ORDER BY p.id
        """, (user_id,))

        rows = cursor.fetchall()

        permissions = {}

        for row in rows:
            code = row["code"]

            permissions[code] = {
                "read": bool(row["role_permission"]) or bool(row["can_read"]),
                "write": bool(row["can_write"])
            }

        return permissions

    finally:
        cursor.close()
        db.close()

@router.get("/me")
def get_current_user(request: Request):

    user = get_user_from_session(request)

    if not user:

        return {
            "success": False,
            "authenticated": False,
            "message": "جلسه کاربری معتبر نیست"
        }

    return {
        "success": True,
        "authenticated": True,

        "user": {
            "id": user["id"],
            "username": user["username"],
            "first_name": user["first_name"],
            "last_name": user["last_name"],
            "organizational_position": user[
                "organizational_position"
            ],
            "access_level": user["access_level"],
            "is_active": user["is_active"],
            "permissions": get_user_permissions(user["id"])
        },

        "session": {
            "id": user["session_id"],
            "expires_at": user["expires_at"],
            "last_activity_at": user["last_activity_at"]
        }
    }


# =========================================================
# LOGOUT
# =========================================================

@router.post("/logout")
def logout(request: Request):

    token = request.cookies.get("session_token")
    if not token:
        authorization = request.headers.get("Authorization", "")
        scheme, _, bearer_token = authorization.partition(" ")
        if scheme.lower() == "bearer" and bearer_token.strip():
            token = bearer_token.strip()

    response = JSONResponse(
        content={
            "success": True,
            "message": "با موفقیت خارج شدید",
            "redirect": "/login"
        }
    )

    if not token:

        response.delete_cookie(
            key="session_token",
            path="/"
        )

        return response

    token_hash = hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()

    db = get_connection()
    cursor = db.cursor()

    try:

        cursor.execute(
            """
            UPDATE login_sessions
            SET is_active = 0
            WHERE session_token_hash = %s
            """,
            (token_hash,)
        )

        db.commit()

        print("========================================")
        print("LOGOUT SUCCESS")
        print("SESSION INVALIDATED")
        print("========================================")

    except Exception as e:

        db.rollback()

        print("LOGOUT ERROR:", str(e))

    finally:

        cursor.close()
        db.close()

    # -----------------------------------------------------
    # Delete browser cookie
    # -----------------------------------------------------

    response.delete_cookie(
        key="session_token",
        path="/"
    )
    response.headers["Cache-Control"] = "no-store"

    return response
#---------------------------------
# chang pass
#---------------------------------
@router.post("/change-password")
def change_password(
    data: dict,
    request: Request
):

    # گرفتن کاربر از Session
    user = get_user_from_session(request)


    if not user:

        return {
            "success": False,
            "message": "Session expired"
        }



    old_password = data.get("old_password")
    new_password = data.get("new_password")



    if not old_password or not new_password:

        return {
            "success": False,
            "message": "اطلاعات ناقص است"
        }



    # اتصال دیتابیس

    conn = get_connection()

    cursor = conn.cursor(
        dictionary=True
    )


    # گرفتن Hash فعلی

    cursor.execute(
        """
        SELECT
            password_hash
        FROM users
        WHERE id=%s
        """,
        (
            user["id"],
        )
    )


    db_user = cursor.fetchone()



    if not db_user:

        cursor.close()
        conn.close()

        return {
            "success":False,
            "message":"User not found"
        }




    # بررسی رمز فعلی

    if not pwd_context.verify(
        old_password,
        db_user["password_hash"]
    ):

        cursor.close()
        conn.close()

        return {

            "success":False,

            "message":
            "رمز فعلی اشتباه است"

        }




    # Hash رمز جدید

    new_hash = pwd_context.hash(
        new_password
    )



    # Update

    cursor.execute(
        """
        UPDATE users
        SET password_hash=%s
        WHERE id=%s
        """,
        (
            new_hash,
            user["id"]
        )
    )


    conn.commit()



    cursor.close()

    conn.close()



    return {

        "success":True,

        "message":
        "رمز عبور با موفقیت تغییر کرد"

    }



#-----------------------------
#list karbaran 
#-----------------------------
@router.get("/users")
def get_users(request: Request):

    user = get_user_from_session(request)

    if not user:
        return {
            "success": False,
            "message": "Session expired"
        }


    conn = get_connection()
    cursor = conn.cursor(dictionary=True)


    cursor.execute("""
        SELECT
            id,
            first_name,
            last_name,
            username,
            organizational_position,
            access_level,
            is_active,
            created_at
        FROM users
        ORDER BY id DESC
    """)


    users = cursor.fetchall()


    cursor.close()
    conn.close()


    result = []

    for u in users:

        result.append({

            "id": u["id"],

            "firstName": u["first_name"],

            "lastName": u["last_name"],

            "username": u["username"],

            "status":
                "active"
                if u["is_active"]
                else "inactive",

            "level":
                u["access_level"],

            "role":
                u["organizational_position"]
                or "-",

            "createdAt":
                str(u["created_at"]),

            "lastLogin":
                "-"

        })


    return {
        "success": True,
        "users": result
    }
