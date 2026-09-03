"""Video streaming and embed proxy router with anti-leech security."""
import asyncio
import urllib.parse
from urllib.parse import urlparse
import httpx
from fastapi import APIRouter, Query, HTTPException, Request, Depends, Response
from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse
from services.embed_extractor import resolve_stream, get_proxy_html, APPLE_USER_AGENT
from services.hls_rewriter import rewrite_m3u8_playlist
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

# ── Connection Pooling for High-Performance Segment Proxying ──────────────────
_stream_client: httpx.AsyncClient | None = None


def get_stream_client() -> httpx.AsyncClient:
    """Singleton AsyncClient with connection pooling, keep-alive, and event loop safety."""
    global _stream_client
    try:
        current_loop = asyncio.get_running_loop()
    except RuntimeError:
        current_loop = None

    client_loop = getattr(_stream_client, "_loop", None)
    if (
        _stream_client is None
        or _stream_client.is_closed
        or client_loop is None
        or client_loop.is_closed()
        or client_loop != current_loop
    ):
        limits = httpx.Limits(
            max_keepalive_connections=50,
            max_connections=200,
            keepalive_expiry=60.0,
        )
        _stream_client = httpx.AsyncClient(
            limits=limits,
            timeout=httpx.Timeout(connect=10.0, read=30.0, write=10.0, pool=30.0),
            follow_redirects=True,
        )
        setattr(_stream_client, "_loop", current_loop)
    return _stream_client


def is_allowed_domain(target_url: str) -> bool:
    """Kiểm tra domain đích có nằm trong danh sách cho phép proxy không."""
    try:
        parsed = urlparse(target_url)
        return any(domain in parsed.netloc for domain in ALLOWED_PROXY_DOMAINS)
    except Exception:
        return False


def _build_upstream_headers(target_url: str, ref: str | None, range_header: str | None = None) -> dict:
    """Build spoofed headers to bypass anti-hotlink on upstream video CDNs."""
    parsed = urlparse(target_url)
    target_origin = f"{parsed.scheme}://{parsed.netloc}"

    if "streamc.xyz" in parsed.netloc:
        upstream_referer = f"{target_origin}/"
        upstream_origin = target_origin
    elif ref and ref.startswith(("http://", "https://")):
        upstream_referer = ref
        p_ref = urlparse(ref)
        upstream_origin = f"{p_ref.scheme}://{p_ref.netloc}"
    else:
        upstream_referer = f"{STREAMC_BASE}/"
        upstream_origin = STREAMC_BASE

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Referer": upstream_referer,
        "Origin": upstream_origin,
        "Accept": "*/*",
    }

    # Nếu gọi manifest trên StreamC, sử dụng Apple Safari User-Agent để lấy plaintext M3U8
    if "streamc.xyz" in parsed.netloc and (".m3u8" in target_url or "/ey" in target_url):
        headers["User-Agent"] = APPLE_USER_AGENT

    if range_header:
        headers["Range"] = range_header

    return headers


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/resolve")
async def resolve_embed(
    request: Request,
    url: str = Query(..., description="Embed URL từ nguonc hoặc direct m3u8 URL"),
    _session: bool = Depends(require_session),
):
    """
    Cố gắng lấy direct m3u8 từ embed URL và ký URL proxy bảo mật.
    Hỗ trợ cả trường hợp URL truyền vào là embed URL lẫn direct m3u8.
    """
    if not url:
        raise HTTPException(status_code=400, detail="url is required")

    # Nếu URL truyền vào vốn đã là một direct .m3u8:
    if ".m3u8" in url.lower():
        quoted_url = urllib.parse.quote(url, safe="")
        quoted_ref = urllib.parse.quote(STREAMC_BASE, safe="")
        if ENABLE_STREAM_SIGNATURE:
            sig_data = sign_stream_url(url)
            proxy_m3u8 = (
                f"/api/stream/playlist.m3u8?url={quoted_url}&ref={quoted_ref}&exp={sig_data['exp']}&sig={sig_data['sig']}"
            )
        else:
            proxy_m3u8 = f"/api/stream/playlist.m3u8?url={quoted_url}&ref={quoted_ref}"

        return {
            "m3u8": proxy_m3u8,
            "raw_m3u8": url,
            "proxy_url": None,
            "embed_url": url,
            "source": "m3u8",
        }

    cache_key = f"resolve:{url}"
    cached_result = await cache.get(cache_key)
    if cached_result:
        result = dict(cached_result)
    else:
        result = await resolve_stream(url)
        if result and (result.get("m3u8") or result.get("proxy_url")):
            await cache.set(cache_key, result, ttl=CACHE_TTL_STREAM)

    # Nếu source là m3u8, chuyển m3u8 gốc thành URL playlist đã rewrite
    if result.get("source") == "m3u8" and result.get("m3u8"):
        raw_m3u8 = result["m3u8"]
        result["raw_m3u8"] = raw_m3u8
        quoted_m3u8 = urllib.parse.quote(raw_m3u8, safe="")
        quoted_ref = urllib.parse.quote(url, safe="")
        if ENABLE_STREAM_SIGNATURE:
            sig_data = sign_stream_url(raw_m3u8)
            result["m3u8"] = (
                f"/api/stream/playlist.m3u8?url={quoted_m3u8}&ref={quoted_ref}&exp={sig_data['exp']}&sig={sig_data['sig']}"
            )
        else:
            result["m3u8"] = f"/api/stream/playlist.m3u8?url={quoted_m3u8}&ref={quoted_ref}"

    # Nếu source là proxy, build proxy_url hoàn chỉnh và ký HMAC bảo mật
    if result.get("source") == "proxy" and result.get("proxy_url"):
        sig_data = sign_stream_url(url)
        quoted_url = urllib.parse.quote(url, safe="")
        if ENABLE_STREAM_SIGNATURE:
            result["proxy_url"] = (
                f"/api/stream/proxy?url={quoted_url}&exp={sig_data['exp']}&sig={sig_data['sig']}"
            )
        else:
            result["proxy_url"] = f"/api/stream/proxy?url={quoted_url}"

    return result


@router.get("/playlist.m3u8")
async def get_playlist_m3u8(
    request: Request,
    url: str = Query(..., description="Target M3U8 URL"),
    ref: str | None = Query(None, description="Original embed referer"),
    exp: int | None = Query(None, description="Expiration timestamp"),
    sig: str | None = Query(None, description="HMAC signature"),
):
    """
    Fetch and rewrite HLS .m3u8 playlist (Master or Media).
    All segments and sub-playlists are rewritten to route through internal proxy.
    """
    if not url:
        raise HTTPException(status_code=400, detail="url is required")

    # 1. Chống leech cross-site
    if not validate_referer_and_fetch_site(request):
        raise HTTPException(status_code=403, detail="Cross-site playlist fetch is forbidden")

    # 2. Xác thực chữ ký nếu bật
    if ENABLE_STREAM_SIGNATURE and not verify_stream_signature(url, exp, sig):
        raise HTTPException(status_code=403, detail="Stream signature invalid or expired")

    # 3. Kiểm tra domain hợp lệ
    if not is_allowed_domain(url):
        raise HTTPException(status_code=403, detail="Domain không được phép proxy")

    headers = _build_upstream_headers(url, ref)
    client = get_stream_client()

    try:
        resp = await client.get(url, headers=headers)
        if resp.status_code != 200:
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"Upstream returned {resp.status_code} for playlist",
            )

        content = resp.text
        if "#EXTM3U" not in content:
            raise HTTPException(status_code=502, detail="Upstream did not return valid M3U8")

        rewritten = rewrite_m3u8_playlist(
            content=content,
            playlist_url=str(resp.url),
            referer=ref or url,
        )

        return Response(
            content=rewritten,
            media_type="application/vnd.apple.mpegurl",
            headers={
                "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Playlist fetch error: {str(e)}")


@router.get("/segment")
async def get_stream_segment(
    request: Request,
    url: str = Query(..., description="Target segment or media URL"),
    ref: str | None = Query(None, description="Original referer URL"),
):
    """
    High-performance streaming proxy for video chunks (.ts, .png disguised, .m4s) and keys.
    Supports Range Requests (HTTP 206 Partial Content) and Chunked Streaming.
    """
    if not validate_referer_and_fetch_site(request):
        raise HTTPException(status_code=403, detail="Cross-site segment fetch is forbidden")

    if not url or not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="Invalid target URL")

    if not is_allowed_domain(url):
        raise HTTPException(status_code=403, detail="Domain không được phép proxy")

    client_range = request.headers.get("range")
    headers = _build_upstream_headers(url, ref, range_header=client_range)

    client = get_stream_client()
    try:
        req = client.build_request("GET", url, headers=headers)
        resp = await client.send(req, stream=True)

        async def stream_content():
            try:
                async for chunk in resp.aiter_bytes(chunk_size=65536):
                    yield chunk
            finally:
                await resp.aclose()

        resp_headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Access-Control-Allow-Headers": "Range, Content-Type, Accept",
            "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
        }

        # Forward crucial streaming headers
        for h in ("content-type", "content-length", "content-range", "accept-ranges", "cache-control", "etag"):
            if h in resp.headers:
                resp_headers[h] = resp.headers[h]

        return StreamingResponse(
            stream_content(),
            status_code=resp.status_code,
            headers=resp_headers,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Segment fetch error: {str(e)}")


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
    if not is_allowed_domain(url):
        raise HTTPException(status_code=403, detail="Domain không được phép proxy")

    html = await get_proxy_html(url)
    return HTMLResponse(
        content=html,
        headers={
            "Content-Security-Policy": (
                "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; "
                "connect-src * data: blob:; "
                "media-src * data: blob:; "
                "script-src * 'unsafe-inline' 'unsafe-eval' data: blob:; "
                "worker-src * data: blob:; "
                "img-src * data: blob:;"
            ),
            "X-Frame-Options": "SAMEORIGIN",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


@router.get("/fetch")
async def fetch_proxy(
    request: Request,
    url: str = Query(..., description="Target media or stream URL to fetch"),
    ref: str | None = Query(None, description="Original referer URL from embed node"),
):
    """Proxy fetch requests to bypass Referer/CORS block from streamc.xyz"""
    # Chống leech băng thông từ domain lạ
    if not validate_referer_and_fetch_site(request):
        raise HTTPException(status_code=403, detail="Forbidden: cross-site fetch request")

    if not url or not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="Invalid or missing URL scheme")

    # Short-circuit JWPlayer license/entitlements checks with 200 OK
    if "entitlements.jwplayer.com" in url or "jwplayer.com/license" in url:
        return JSONResponse(content={}, status_code=200)

    client_range = request.headers.get("range")
    headers = _build_upstream_headers(url, ref, range_header=client_range)
    client = get_stream_client()

    try:
        req = client.build_request("GET", url, headers=headers)
        resp = await client.send(req, stream=True)

        async def stream_content():
            try:
                async for chunk in resp.aiter_bytes(chunk_size=65536):
                    yield chunk
            finally:
                await resp.aclose()

        resp_headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Access-Control-Allow-Headers": "Range, Content-Type, Accept",
            "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
        }
        for h in ("content-type", "content-length", "content-range", "accept-ranges", "cache-control", "etag"):
            if h in resp.headers:
                resp_headers[h] = resp.headers[h]

        return StreamingResponse(
            stream_content(),
            status_code=resp.status_code,
            headers=resp_headers,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
