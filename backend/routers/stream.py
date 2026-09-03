from fastapi import APIRouter, Query, HTTPException, Response
from fastapi.responses import HTMLResponse, StreamingResponse
from services.embed_extractor import resolve_stream, get_proxy_html
from config import ALLOWED_PROXY_DOMAINS, STREAMC_BASE

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

@router.get("/fetch")
async def fetch_proxy(url: str = Query(...)):
    """Proxy fetch requests to bypass Referer/CORS block from streamc.xyz"""
    import httpx
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": f"{STREAMC_BASE}/"
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
            headers=resp_headers
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

