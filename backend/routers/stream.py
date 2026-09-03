"""Video streaming and embed proxy router with anti-leech security."""
import urllib.parse
from urllib.parse import urlparse
import httpx
from fastapi import APIRouter, Query, HTTPException, Request, Depends
from fastapi.responses import HTMLResponse, StreamingResponse
from services.embed_extractor import resolve_stream, get_proxy_html
from config import (
    ALLOWED_PROXY_DOMAINS,
    STREAMC_BASE,
    ENABLE_STREAM_SIGNATURE,
    ENABLE_SESSION_CHECK,
    CACHE_TTL_STREAM,
)
from services.cache import cache
from security import (
    require_session,
    sign_stream_url,
    verify_stream_signature,
    validate_referer_and_fetch_site,
    get_client_ip,
    verify_session_token,
    verify_session_active,
)

router = APIRouter(prefix="/api/stream", tags=["stream"])


@router.get("/resolve")
async def resolve_embed(
    request: Request,
    url: str = Query(..., description="Embed URL từ nguonc"),
    _session: bool = Depends(require_session),
):
    """
    Cố gắng lấy direct m3u8 từ embed URL và ký URL proxy bảo mật.

    Response:
      {
        "m3u8":      str | null,
        "proxy_url": str | null,   # /api/stream/proxy?url=...&exp=...&sig=... nếu cần proxy
        "embed_url": str,
        "source":    "m3u8" | "proxy" | "embed"
      }
    """
    if not url:
        raise HTTPException(status_code=400, detail="url is required")

    cache_key = f"resolve:{url}"
    cached_result = await cache.get(cache_key)
    if cached_result:
        result = dict(cached_result)
    else:
        result = await resolve_stream(url)
        if result and (result.get("m3u8") or result.get("proxy_url")):
            await cache.set(cache_key, result, ttl=CACHE_TTL_STREAM)

    # Nếu source là proxy, build proxy_url hoàn chỉnh và ký HMAC bảo mật
    if result.get("source") == "proxy" and result.get("proxy_url"):
        sig_data = sign_stream_url(url)
        quoted_url = urllib.parse.quote(url)
        if ENABLE_STREAM_SIGNATURE:
            result["proxy_url"] = (
                f"/api/stream/proxy?url={quoted_url}&exp={sig_data['exp']}&sig={sig_data['sig']}"
            )
        else:
            result["proxy_url"] = f"/api/stream/proxy?url={quoted_url}"

    return result


@router.get("/proxy", response_class=HTMLResponse)
async def proxy_embed(
    request: Request,
    url: str = Query(..., description="Embed URL cần proxy"),
    exp: int = Query(None, description="Expiration timestamp"),
    sig: str = Query(None, description="HMAC signature"),
):
    """
    Fetch embed HTML, strip anti-adblock scripts, inject bypass JS.
    Kiểm tra bảo mật: Referer/Sec-Fetch-Site, Signature, Session.
    """
    if not url:
        raise HTTPException(status_code=400, detail="url is required")

    # 1. Chống leech cross-site (Sec-Fetch-Site & Referer)
    if not validate_referer_and_fetch_site(request):
        raise HTTPException(status_code=403, detail="Cross-site embedding is forbidden")

    # 2. Xác thực chữ ký URL stream
    if ENABLE_STREAM_SIGNATURE and not verify_stream_signature(url, exp, sig):
        raise HTTPException(status_code=403, detail="Stream token has expired or is invalid")

    # 3. Xác thực session
    if ENABLE_SESSION_CHECK:
        token = request.cookies.get("tsufu_session") or request.headers.get("x-session-token")
        client_ip = get_client_ip(request)
        if not token or not await verify_session_active(token, client_ip):
            raise HTTPException(status_code=401, detail="Session expired. Please refresh the page.")

    # 4. Kiểm tra domain được phép proxy để tránh open proxy
    parsed = urlparse(url)
    if not any(domain in parsed.netloc for domain in ALLOWED_PROXY_DOMAINS):
        raise HTTPException(status_code=403, detail="Domain không được phép proxy")

    html = await get_proxy_html(url)
    return HTMLResponse(
        content=html,
        headers={
            "Content-Security-Policy": (
                "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;"
            ),
            "X-Frame-Options": "SAMEORIGIN",
        },
    )


@router.get("/fetch")
async def fetch_proxy(
    request: Request,
    url: str = Query(...),
):
    """Proxy fetch requests to bypass Referer/CORS block from streamc.xyz"""
    # Chống leech băng thông từ domain lạ
    if not validate_referer_and_fetch_site(request):
        raise HTTPException(status_code=403, detail="Forbidden: cross-site fetch request")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": f"{STREAMC_BASE}/",
    }
    try:
        client = httpx.AsyncClient(timeout=30.0, follow_redirects=True)
        req = client.build_request("GET", url, headers=headers)
        resp = await client.send(req, stream=True)

        async def stream_content():
            try:
                async for chunk in resp.aiter_bytes():
                    yield chunk
            finally:
                await resp.aclose()
                await client.aclose()

        # Remove content-length to avoid ERR_CONTENT_LENGTH_MISMATCH
        allowed_headers = ["accept-ranges", "content-type", "content-range"]
        resp_headers = {}
        for k, v in resp.headers.items():
            if k.lower() in allowed_headers:
                resp_headers[k] = v

        return StreamingResponse(
            stream_content(),
            status_code=resp.status_code,
            headers=resp_headers,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
