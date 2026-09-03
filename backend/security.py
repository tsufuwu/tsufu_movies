"""Security and anti-bot hardening module."""
import hmac
import hashlib
import secrets
import time
from urllib.parse import urlparse
from fastapi import Request, HTTPException, Query
from config import (
    SESSION_SECRET,
    SESSION_TTL,
    ENABLE_SESSION_CHECK,
    STREAM_SECRET_KEY,
    STREAM_TOKEN_TTL,
    ENABLE_STREAM_SIGNATURE,
    ENFORCE_REFERER_CHECK,
    IS_PRODUCTION,
    CORS_ORIGINS,
)


def get_client_ip(request: Request) -> str:
    """Extract real client IP address respecting reverse proxies."""
    # Nginx reverse proxy transmits X-Forwarded-For: <client>, <proxy1>, ...
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


def _get_ip_prefix(client_ip: str) -> str:
    """
    Extract network prefix (/16 for IPv4) to allow graceful mobile carrier IP hops
    while preventing cross-network token hijacking.
    """
    if not client_ip or client_ip in ("127.0.0.1", "localhost", "::1", "testclient"):
        return "local"
    if "." in client_ip:
        parts = client_ip.split(".")
        if len(parts) >= 2:
            return f"{parts[0]}.{parts[1]}"
    return client_ip[:8]


# ── 1. Ephemeral Session Token ────────────────────────────────────────────────

def create_session_token(client_ip: str) -> tuple[str, int]:
    """Generate a lightweight HMAC-signed ephemeral session token."""
    session_id = secrets.token_urlsafe(16)
    issued_at = int(time.time())
    expires_at = issued_at + SESSION_TTL
    ip_prefix = _get_ip_prefix(client_ip)

    payload = f"{session_id}:{expires_at}:{ip_prefix}"
    sig = hmac.new(SESSION_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()[:32]
    token = f"{session_id}.{expires_at}.{sig}"
    return token, expires_at


def verify_session_token(token: str, client_ip: str) -> bool:
    """Verify session token validity, expiration, and signature."""
    if not ENABLE_SESSION_CHECK:
        return True
    if not token or "." not in token:
        return False

    parts = token.split(".")
    if len(parts) != 3:
        return False

    session_id, exp_str, sig = parts
    try:
        expires_at = int(exp_str)
    except ValueError:
        return False

    if time.time() > expires_at:
        return False

    # Check HMAC with client IP prefix
    ip_prefix = _get_ip_prefix(client_ip)
    payload = f"{session_id}:{expires_at}:{ip_prefix}"
    expected_sig = hmac.new(SESSION_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()[:32]

    if hmac.compare_digest(sig, expected_sig):
        return True

    # Tolerant fallback: check with 'local' prefix if running dev or reverse proxy local loop
    fallback_payload = f"{session_id}:{expires_at}:local"
    fallback_sig = hmac.new(SESSION_SECRET.encode(), fallback_payload.encode(), hashlib.sha256).hexdigest()[:32]
    return hmac.compare_digest(sig, fallback_sig)


async def require_session(request: Request) -> bool:
    """FastAPI dependency to enforce active ephemeral session."""
    if not ENABLE_SESSION_CHECK:
        return True

    # 1. Cookie check
    token = request.cookies.get("tsufu_session")
    # 2. Header fallback
    if not token:
        token = request.headers.get("x-session-token")

    client_ip = get_client_ip(request)
    if not token or not verify_session_token(token, client_ip):
        raise HTTPException(
            status_code=401,
            detail="Session invalid or expired. Handshake required at /api/v1/session/init"
        )
    return True


# ── 2. Signed Stream URLs ─────────────────────────────────────────────────────

def sign_stream_url(url: str) -> dict:
    """Generate time-limited HMAC signature for stream URLs."""
    expires_at = int(time.time()) + STREAM_TOKEN_TTL
    payload = f"{url}|{expires_at}"
    sig = hmac.new(STREAM_SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()[:32]
    return {
        "exp": expires_at,
        "sig": sig,
    }


def verify_stream_signature(url: str, exp: int | None, sig: str | None) -> bool:
    """Verify HMAC signature and timestamp for stream URLs."""
    if not ENABLE_STREAM_SIGNATURE:
        return True
    if not exp or not sig:
        return False
    if time.time() > exp:
        return False

    payload = f"{url}|{exp}"
    expected_sig = hmac.new(STREAM_SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()[:32]
    return hmac.compare_digest(sig, expected_sig)


# ── 3. Sec-Fetch-Site & Referer Validation ────────────────────────────────────

def validate_referer_and_fetch_site(request: Request) -> bool:
    """Block cross-site leeching via Fetch Metadata and Referer headers."""
    if not ENFORCE_REFERER_CHECK:
        return True

    # 1. Modern browser Sec-Fetch-Site check
    sec_fetch_site = request.headers.get("sec-fetch-site", "").lower()
    if sec_fetch_site == "cross-site":
        return False

    # 2. Referer / Origin domain verification
    check_url = request.headers.get("origin") or request.headers.get("referer")
    if check_url:
        try:
            parsed = urlparse(check_url)
            host = parsed.netloc.split(":")[0].lower()

            # Allow localhost / dev environments
            if not IS_PRODUCTION and host in ("localhost", "127.0.0.1"):
                return True

            # Allowed host list
            allowed_hosts = set()
            if request.base_url.hostname:
                allowed_hosts.add(request.base_url.hostname.lower())
            for orig in CORS_ORIGINS:
                try:
                    p = urlparse(orig)
                    if p.netloc:
                        allowed_hosts.add(p.netloc.split(":")[0].lower())
                except Exception:
                    pass

            if host not in allowed_hosts:
                return False
        except Exception:
            return False

    return True
