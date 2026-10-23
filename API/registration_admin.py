# registration_admin.py
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import Optional

from API.database import get_connection
from API.permissions import require_admin

router = APIRouter(prefix="/api/admin", tags=["admin-registration"])


class ApproveBody(BaseModel):
    access_level: Optional[int] = None


class RejectBody(BaseModel):
    reason: Optional[str] = None


def _admin_id(request: Request) -> int:
    user = getattr(request.state, "user", None)
    if isinstance(user, dict) and user.get("id"):
        return int(user["id"])
    return 1


@router.get("/registration-requests")
def list_registration_requests(status: Optional[str] = None):
    db = get_connection()
    cursor = db.cursor(dictionary=True)
    try:
        if status in ("pending", "approved", "rejected"):
            cursor.execute(
                """
                SELECT
                    id, first_name, last_name, username,
                    organizational_position, requested_access_level,
                    status, created_at, reviewed_at, reviewed_by
                FROM registration_requests
                WHERE status = %s
                ORDER BY created_at DESC
                """,
                (status,),
            )
        else:
            cursor.execute(
                """
                SELECT
                    id, first_name, last_name, username,
                    organizational_position, requested_access_level,
                    status, created_at, reviewed_at, reviewed_by
                FROM registration_requests
                ORDER BY created_at DESC
                """
            )
        return {"success": True, "requests": cursor.fetchall()}
    finally:
        cursor.close()
        db.close()


@router.get("/registration-requests/{request_id}")
def get_registration_request(request_id: int):
    db = get_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT
                id, first_name, last_name, username,
                organizational_position, requested_access_level,
                status, created_at, reviewed_at, reviewed_by
            FROM registration_requests
            WHERE id = %s
            """,
            (request_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="درخواست پیدا نشد")
        return {"success": True, "request": row}
    finally:
        cursor.close()
        db.close()


@router.post("/registration-requests/{request_id}/approve")
def approve_registration(request_id: int, body: ApproveBody, request: Request):
    admin_id = _admin_id(request)
    db = get_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT *
            FROM registration_requests
            WHERE id = %s AND status = 'pending'
            """,
            (request_id,),
        )
        req = cursor.fetchone()
        if not req:
            raise HTTPException(
                status_code=404,
                detail="درخواست پیدا نشد یا قبلاً بررسی شده",
            )

        level = body.access_level
        if level is None:
            level = int(req.get("requested_access_level") or 1)
        level = max(1, min(3, int(level)))
        actor = getattr(request.state, "user", {}) or {}
        if level > int(actor.get("access_level") or 0) and int(actor.get("access_level") or 0) != 3:
            raise HTTPException(403, "نمی‌توانید کاربری با سطح دسترسی بالاتر از خود ایجاد کنید")

        cursor.execute(
            "SELECT id FROM users WHERE username = %s",
            (req["username"],),
        )
        if cursor.fetchone():
            raise HTTPException(
                status_code=400,
                detail="این نام کاربری از قبل وجود دارد",
            )

        cursor.execute(
            """
            INSERT INTO users (
                first_name, last_name, username, password_hash,
                organizational_position, access_level, is_active
            )
            VALUES (%s, %s, %s, %s, %s, %s, 1)
            """,
            (
                req["first_name"],
                req["last_name"],
                req["username"],
                req["password_hash"],
                req.get("organizational_position"),
                level,
            ),
        )

        cursor.execute(
            """
            UPDATE registration_requests
            SET status = 'approved',
                reviewed_at = NOW(),
                reviewed_by = %s
            WHERE id = %s
            """,
            (admin_id, request_id),
        )
        db.commit()
        return {
            "success": True,
            "message": "درخواست تایید و کاربر ساخته شد",
            "access_level": level,
        }
    except HTTPException:
        db.close()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        db.close()


@router.post("/registration-requests/{request_id}/reject")
def reject_registration(request_id: int, body: RejectBody, request: Request):
    admin_id = _admin_id(request)
    db = get_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            UPDATE registration_requests
            SET status = 'rejected',
                reviewed_at = NOW(),
                reviewed_by = %s
            WHERE id = %s AND status = 'pending'
            """,
            (admin_id, request_id),
        )
        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="درخواست پیدا نشد یا قبلاً بررسی شده",
            )
        db.commit()
        return {
            "success": True,
            "message": "درخواست رد شد",
            "reason": body.reason or "",
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        db.close()
