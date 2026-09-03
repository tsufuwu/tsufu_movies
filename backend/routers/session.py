"""Ephemeral Session Management Endpoints."""
from fastapi import APIRouter, Request, Response
from security import get_client_ip, create_session_token, verify_session_token
from config import SESSION_TTL, IS_PRODUCTION

router = APIRouter(tags=["session"])


@router.get("/api/v1/session/init")
@router.post("/api/v1/session/init")
@router.get("/api/session/init")
@router.post("/api/session/init")
async def init_session(request: Request, response: Response):
    """
    Handshake endpoint: generates ephemeral session token without requiring login.
    Sets HttpOnly cookie and returns JSON token fallback.
    """
    client_ip = get_client_ip(request)
    token, expires_at = create_session_token(client_ip)

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
    """Verify if the current session token or cookie is valid."""
    token = request.cookies.get("tsufu_session") or request.headers.get("x-session-token")
    client_ip = get_client_ip(request)
    valid = verify_session_token(token, client_ip) if token else False
    return {
        "status": "success" if valid else "invalid",
        "valid": valid,
    }
