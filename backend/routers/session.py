"""Ephemeral Session Management Endpoints."""
import time
from fastapi import APIRouter, Request, Response
from security import get_client_ip, create_session_token, verify_session_active
from config import SESSION_TTL, IS_PRODUCTION
from services.cache import cache

router = APIRouter(tags=["session"])


@router.get("/api/v1/session/init")
@router.post("/api/v1/session/init")
@router.get("/api/session/init")
@router.post("/api/session/init")
async def init_session(request: Request, response: Response):
    """
    Handshake endpoint: generates ephemeral session token without requiring login.
    Saves session into dual-mode cache (Redis/TTLCache), sets HttpOnly cookie, and returns JSON token.
    """
    client_ip = get_client_ip(request)
    token, expires_at = create_session_token(client_ip)

    # Store session in cache with TTL
    await cache.set(
        f"session:{token}",
        {
            "ip": client_ip,
            "created_at": time.time(),
            "expires_at": expires_at,
        },
        ttl=SESSION_TTL,
    )

    # Set secure HttpOnly cookie
    response.set_cookie(
        key="tsufu_session",
        value=token,
        max_age=SESSION_TTL,
        httponly=True,
        samesite="lax",
        secure=IS_PRODUCTION,
        path="/",
    )

    return {
        "status": "success",
        "session_token": token,
        "expires_at": expires_at,
        "ttl": SESSION_TTL,
    }


@router.get("/api/v1/session/verify")
@router.get("/api/session/verify")
async def verify_session(request: Request):
    """Verify if the current session token or cookie is valid in cache / HMAC."""
    token = request.cookies.get("tsufu_session") or request.headers.get("x-session-token")
    client_ip = get_client_ip(request)
    valid = await verify_session_active(token, client_ip) if token else False
    return {
        "status": "success" if valid else "invalid",
        "valid": valid,
    }
