"""Stream resolution & proxy endpoints."""
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import HTMLResponse
from services.embed_extractor import resolve_stream, get_proxy_html
from config import ALLOWED_PROXY_DOMAINS

router = APIRouter(prefix="/api/stream", tags=["stream"])


@router.get("/resolve")
async def resolve_embed(url: str = Query(..., description="Embed URL từ nguonc")):
    """
    Cố gắng lấy direct m3u8 từ embed URL.

    Response:
      {
        "m3u8":      str | null,
        "proxy_url": str | null,   # /api/stream/proxy?url=... nếu cần proxy
        "embed_url": str,
        "source":    "m3u8" | "proxy" | "embed"
      }
    """
    if not url:
        raise HTTPException(status_code=400, detail="url is required")

    result = await resolve_stream(url)

    # Nếu source là proxy, build proxy_url hoàn chỉnh
    if result["source"] == "proxy" and result["proxy_url"]:
        import urllib.parse
        result["proxy_url"] = f"/api/stream/proxy?url={urllib.parse.quote(url)}"

    return result


@router.get("/proxy", response_class=HTMLResponse)
async def proxy_embed(url: str = Query(..., description="Embed URL cần proxy")):
    """
    Fetch embed HTML, strip anti-adblock scripts, inject bypass JS.
    Trả về HTML đã được làm sạch để frontend render trong iframe srcdoc.
    """
    if not url:
        raise HTTPException(status_code=400, detail="url is required")

    # Chỉ cho phép các domain được cấu hình để tránh bị dùng như open proxy
    from urllib.parse import urlparse
    parsed = urlparse(url)
    if not any(domain in parsed.netloc for domain in ALLOWED_PROXY_DOMAINS):
        raise HTTPException(status_code=403, detail="Domain không được phép proxy")

    html = await get_proxy_html(url)
    return HTMLResponse(
        content=html,
        headers={
            # Cho phép iframe chạy scripts
            "Content-Security-Policy": (
                "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;"
            ),
            "X-Frame-Options": "SAMEORIGIN",
        },
    )
