"""
Embed extractor service for streamc.xyz.

Chiến lược fallback:
  1. Decode data-obf  → lấy stream path → fetch m3u8 URL (cleanest, no ads)
  2. Proxy HTML       → strip ads.js / devtool-guard, inject popupReady=true (clean iframe)
  3. iframe gốc      → fallback cuối cùng (frontend tự handle)
"""
import base64
import json
import re
import httpx
from bs4 import BeautifulSoup
from functools import lru_cache
from config import STREAMC_BASE, HTTP_TIMEOUT

# ── Constants ────────────────────────────────────────────────────────────────

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
    "Referer": STREAMC_BASE + "/",
}

# Scripts cần xóa khỏi HTML proxy
_STRIP_PATTERNS = [
    # ads.js — nguồn gây blockPlayer khi bị chặn
    r'<script[^>]*src=["\'][^"\']*ads\.js[^"\']*["\'][^>]*(?:onerror=["\'][^"\']*["\'])?[^>]*>\s*</script>',
    # devtool-guard
    r'<script[^>]*src=["\'][^"\']*devtool[^"\']*["\'][^>]*>\s*</script>',
    # waust.at popup script
    r'<script[^>]*src=["\'][^"\']*waust\.at[^"\']*["\'][^>]*>\s*</script>',
    r'<script[^>]*id=["\']_waup[^"\']*["\'][^>]*>[\s\S]*?</script>',
    # cloudflare beacon (không cần thiết)
    r'<script[^>]*cloudflareinsights[^>]*>[\s\S]*?</script>',
]

# JS inject: set popupReady=true ngay lập tức để bypass guard & mock JWPlayer entitlements
_INJECT_JS = """
<script>
  // Disable Web Workers to force HLS.js to use Main Thread.
  // This allows our XHR/Fetch interceptors to catch video segment requests!
  window.Worker = undefined;

  // Injected by proxy: bypass anti-adblock guard
  Object.defineProperty(window, 'popupReady', { get: () => true, set: (v) => {} });
  Object.defineProperty(window, 'popupFailed', { get: () => false, set: (v) => {} });
  Object.defineProperty(window, 'hasShownAds', { get: () => true, set: (v) => {} });
  Object.defineProperty(window, 'playerBlocked', { get: () => false, set: (v) => {} });
  
  // In-memory Blob resolution to completely bypass LiteSpeed CSP connect-src * restriction
  const blobStore = new Map();
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  URL.createObjectURL = function(blob) {
      const url = originalCreateObjectURL.apply(this, arguments);
      if (blob && (blob instanceof Blob || blob instanceof File)) {
          blobStore.set(url, blob);
      }
      return url;
  };

  URL.revokeObjectURL = function(url) {
      if (typeof url === 'string') {
          blobStore.delete(url);
      }
      return originalRevokeObjectURL.apply(this, arguments);
  };

  // Origin của node embed (được inject động từ backend)
  const embedOrigin = "__EMBED_ORIGIN__";

  // Intercept window.streamURL to ensure it always uses embedOrigin
  let _streamURL = '';
  Object.defineProperty(window, 'streamURL', {
      get: () => _streamURL,
      set: (v) => {
          if (typeof v === 'string') {
              if (v.startsWith('/eyJo') || (v.startsWith('/') && !v.startsWith('//'))) {
                  _streamURL = (embedOrigin || window.location.origin) + v;
                  return;
              }
          }
          _streamURL = v;
      },
      configurable: true
  });
  
  // Intercept XHR and Fetch to bypass CORS for streamc.xyz and CDN domains
  const proxyUrl = window.location.origin + '/api/stream/fetch?url=';

  function isJwLicenseOrTelemetry(urlStr) {
      return Boolean(
          urlStr && (
              urlStr.includes('entitlements.jwplayer.com') ||
              urlStr.includes('jwplayer.com/license') ||
              urlStr.includes('ssl.p.jwpcdn.com/telemetry') ||
              urlStr.includes('jwpltx.com')
          )
      );
  }

  function resolveTargetUrl(urlStr) {
      if (!urlStr || typeof urlStr !== 'string') return '';
      let absUrl = '';
      try { absUrl = new URL(urlStr, document.baseURI).href; } catch(e) { return urlStr; }

      // If URL was resolved with window.location.host but has /eyJo (obfuscated stream path),
      // rewrite it to point to embedOrigin!
      if (embedOrigin && absUrl.includes(window.location.host) && absUrl.includes('/eyJo')) {
          absUrl = absUrl.replace(window.location.origin, embedOrigin);
      } else if (embedOrigin && absUrl.startsWith('/') && absUrl.includes('eyJo')) {
          absUrl = embedOrigin + absUrl;
      }
      return absUrl;
  }

  function shouldProxy(url) {
      if (!url || typeof url !== 'string') return false;
      const absUrl = resolveTargetUrl(url);
      if (!absUrl.startsWith('http')) return false;

      // DO NOT proxy license checks, telemetry, analytics, or ads
      if (isJwLicenseOrTelemetry(absUrl) || absUrl.includes('google-analytics') || absUrl.includes('doubleclick')) {
          return false;
      }

      // If it's a streamc / embed / eyJo path, ALWAYS proxy!
      if (absUrl.includes('streamc') || absUrl.includes('hihihoho') || absUrl.includes('/eyJo')) {
          return true;
      }

      // Don't proxy internal app endpoints unless eyJo
      if (absUrl.includes(window.location.host)) return false;

      // Proxy video stream segments and playlists
      try {
          const u = new URL(absUrl);
          const pathname = u.pathname.toLowerCase();
          if (
              pathname.endsWith('.m3u8') ||
              pathname.endsWith('.ts') ||
              pathname.endsWith('.png') ||
              pathname.endsWith('.m4s') ||
              pathname.endsWith('.mp4') ||
              pathname.includes('/stream') ||
              pathname.includes('/hls')
          ) {
              return true;
          }
      } catch(e) {
          return false;
      }

      return false;
  }

  const originalFetch = window.fetch;
  window.fetch = async function() {
      let input = arguments[0];
      let urlStr = typeof input === 'string' ? input : (input && input.url ? input.url : '');
      let absUrl = resolveTargetUrl(urlStr);

      // In-memory Blob resolution: bypass LiteSpeed CSP connect-src *
      if (absUrl.startsWith('blob:')) {
          const blob = blobStore.get(absUrl);
          if (blob) {
              return new Response(blob, {
                  status: 200,
                  statusText: 'OK',
                  headers: { 'Content-Type': blob.type || 'application/octet-stream' }
              });
          }
      }

      // Mock JWPlayer entitlements & telemetry with 200 OK directly in browser
      if (isJwLicenseOrTelemetry(absUrl)) {
          return new Response(JSON.stringify({}), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
          });
      }

      const refParam = '&ref=' + encodeURIComponent(embedOrigin || document.baseURI || window.location.href);
      if (typeof input === 'string' && shouldProxy(absUrl)) {
          arguments[0] = proxyUrl + encodeURIComponent(absUrl) + refParam;
      } else if (input instanceof Request && shouldProxy(absUrl)) {
          arguments[0] = new Request(proxyUrl + encodeURIComponent(absUrl) + refParam, input);
      }
      return originalFetch.apply(this, arguments);
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
      let absUrl = resolveTargetUrl(url);
      this._interceptUrl = absUrl;

      // In-memory Blob request bypass: don't let browser's CSP block blob:
      if (absUrl.startsWith('blob:')) {
          this._isBlobRequest = true;
          this._blobUrl = absUrl;
          return originalOpen.apply(this, [method, 'data:application/octet-stream,', ...Array.prototype.slice.call(arguments, 2)]);
      }

      if (isJwLicenseOrTelemetry(absUrl)) {
          this._isJwLicense = true;
          return originalOpen.apply(this, [method, 'data:application/json,{}', ...Array.prototype.slice.call(arguments, 2)]);
      }

      const refParam = '&ref=' + encodeURIComponent(embedOrigin || document.baseURI || window.location.href);
      if (typeof url === 'string' && shouldProxy(absUrl)) {
          url = proxyUrl + encodeURIComponent(absUrl) + refParam;
      }
      return originalOpen.apply(this, [method, url, ...Array.prototype.slice.call(arguments, 2)]);
  };

  XMLHttpRequest.prototype.send = function(body) {
      if (this._isBlobRequest) {
          const blob = blobStore.get(this._blobUrl);
          if (blob) {
              const reader = new FileReader();
              const responseType = this.responseType;
              reader.onload = () => {
                  try {
                      Object.defineProperty(this, 'status', { value: 200, writable: false, configurable: true });
                      Object.defineProperty(this, 'readyState', { value: 4, writable: false, configurable: true });
                      let resData = reader.result;
                      if (responseType === 'text' || responseType === '') {
                          if (typeof resData !== 'string') {
                              resData = new TextDecoder().decode(resData);
                          }
                          Object.defineProperty(this, 'responseText', { value: resData, writable: false, configurable: true });
                          Object.defineProperty(this, 'response', { value: resData, writable: false, configurable: true });
                      } else {
                          Object.defineProperty(this, 'response', { value: resData, writable: false, configurable: true });
                      }
                  } catch(e) {}

                  this.dispatchEvent(new Event('readystatechange'));
                  this.dispatchEvent(new ProgressEvent('load', { loaded: blob.size, total: blob.size }));
                  this.dispatchEvent(new ProgressEvent('loadend', { loaded: blob.size, total: blob.size }));
              };
              reader.onerror = () => {
                  this.dispatchEvent(new Event('error'));
              };

              if (responseType === 'text' || responseType === '') {
                  reader.readAsText(blob);
              } else {
                  reader.readAsArrayBuffer(blob);
              }
              return;
          }
      }

      if (this._isJwLicense) {
          try {
              Object.defineProperty(this, 'status', { value: 200, writable: false });
              Object.defineProperty(this, 'responseText', { value: '{}', writable: false });
              Object.defineProperty(this, 'response', { value: '{}', writable: false });
          } catch(e) {}
          this.dispatchEvent(new Event('load'));
          return;
      }
      return originalSend.apply(this, arguments);
  };

  // Block window.open to prevent any popup
  window.open = function() { return null; };
  // Mock devtoolsDetector to prevent reload loop
  window.devtoolsDetector = { launch: function(){}, addListener: function(){} };
</script>
"""


# ── Public API ────────────────────────────────────────────────────────────────

async def resolve_stream(embed_url: str) -> dict:
    """
    Cố gắng lấy direct stream URL từ embed_url.

    Returns dict:
      {
        "m3u8":      str | None,   # direct HLS URL nếu tìm được
        "proxy_url": str | None,   # URL nội bộ để gọi /api/stream/proxy
        "embed_url": str,          # embed URL gốc (fallback cuối)
        "source":    str           # "m3u8" | "proxy" | "embed"
      }

    Chiến lược:
      - streamc.xyz dùng AES-CBC encrypt cho m3u8 URL (crypto.subtle trong player.js)
        → Không thể decode server-side mà không chạy JS
      - Do đó primary strategy là proxy HTML (strip anti-adblock, inject bypass JS)
      - m3u8 resolve chỉ hoạt động nếu server redirect trực tiếp đến CDN
    """
    result = {
        "m3u8": None,
        "proxy_url": None,
        "embed_url": embed_url,
        "source": "proxy",  # default to proxy for streamc.xyz
    }

    if not embed_url:
        result["source"] = "embed"
        return result

    # Proxy là primary — luôn set proxy_url
    result["proxy_url"] = embed_url  # router sẽ wrap thành /api/stream/proxy?url=...

    try:
        html = await _fetch_embed_html(embed_url)
        if not html:
            result["source"] = "embed"
            result["proxy_url"] = None
            return result

        # Best-effort: thử decode data-obf và resolve m3u8
        # (chỉ thành công nếu server redirect trực tiếp, không qua JS decrypt)
        stream_path = _decode_data_obf(html)
        if stream_path:
            m3u8_url = await _resolve_m3u8(stream_path, embed_url)
            if m3u8_url:
                result["m3u8"] = m3u8_url
                result["source"] = "m3u8"
                return result

    except Exception as e:
        print(f"[embed_extractor] resolve_stream error: {e}")

    return result


async def get_proxy_html(embed_url: str) -> str:
    """
    Fetch HTML của embed, strip ads + anti-adblock, inject bypass JS.
    Trả về HTML đã được làm sạch.
    """
    html = await _fetch_embed_html(embed_url)
    if not html:
        return _error_html("Không thể tải nguồn phát.")

    cleaned = _clean_html(html, embed_url)
    return cleaned


# ── Internal helpers ──────────────────────────────────────────────────────────

_html_cache: dict[str, tuple[str, float]] = {}  # url → (html, timestamp)
_CACHE_TTL = 300  # 5 phút

async def _fetch_embed_html(embed_url: str) -> str | None:
    """Fetch HTML từ embed URL với headers giả browser. Cache 5 phút."""
    import time
    cached = _html_cache.get(embed_url)
    if cached:
        html, ts = cached
        if time.time() - ts < _CACHE_TTL:
            return html

    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT, follow_redirects=True) as client:
            resp = await client.get(embed_url, headers=HEADERS)
            if resp.status_code == 200:
                _html_cache[embed_url] = (resp.text, time.time())
                return resp.text
    except Exception as e:
        print(f"[embed_extractor] fetch error for {embed_url}: {e}")
    return None


def _decode_data_obf(html: str) -> str | None:
    """
    Tìm data-obf attribute trong HTML và giải mã base64 JSON.
    Format: {"sUb": "<stream_path>", "hD": "<hash>"}
    Stream path dạng: eyJoIjoiOWQwODE0Nzd...  (nested base64)
    """
    match = re.search(r'data-obf=["\']([A-Za-z0-9+/=]+)["\']', html)
    if not match:
        return None

    try:
        outer = json.loads(base64.b64decode(match.group(1)).decode("utf-8"))
        s_ub = outer.get("sUb", "")
        if not s_ub:
            return None

        # sUb là một JSON base64 lồng nhau
        inner = json.loads(base64.b64decode(s_ub).decode("utf-8"))
        stream_path = inner.get("o", "") or inner.get("path", "") or inner.get("url", "")

        # Nếu không tìm thấy key cụ thể, dùng toàn bộ nếu là string
        if not stream_path and isinstance(inner, str):
            stream_path = inner

        if stream_path and not stream_path.startswith("http"):
            stream_path = STREAMC_BASE + ("" if stream_path.startswith("/") else "/") + stream_path

        return stream_path or None
    except Exception as e:
        print(f"[embed_extractor] data-obf decode error: {e}")
        return None


async def _resolve_m3u8(stream_path: str, referer: str) -> str | None:
    """
    Gọi stream_path để lấy redirect hoặc m3u8 URL thực.
    streamc.xyz thường redirect 302 → CDN m3u8.
    """
    if not stream_path:
        return None

    try:
        headers = {**HEADERS, "Referer": referer}
        async with httpx.AsyncClient(
            timeout=HTTP_TIMEOUT,
            follow_redirects=False,  # Bắt redirect thủ công
        ) as client:
            resp = await client.get(stream_path, headers=headers)

            # 302 redirect → URL cuối là m3u8
            if resp.status_code in (301, 302, 303, 307, 308):
                location = resp.headers.get("location", "")
                if location and (".m3u8" in location or "m3u8" in location):
                    return location

            # 200 và content-type m3u8
            if resp.status_code == 200:
                ct = resp.headers.get("content-type", "")
                url = str(resp.url)
                if ".m3u8" in url or "mpegurl" in ct:
                    return url

    except Exception as e:
        print(f"[embed_extractor] m3u8 resolve error: {e}")

    return None


def _clean_html(html: str, embed_url: str) -> str:
    """Strip ad scripts và inject bypass JS + <base> tag vào HTML."""
    cleaned = html

    # Xóa các script gây ra anti-adblock
    for pattern in _STRIP_PATTERNS:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE | re.DOTALL)

    # Xóa onerror inline trên các script còn lại liên quan đến blockPlayer
    cleaned = re.sub(
        r'\s+onerror=["\'][^"\']*blockPlayer[^"\']*["\']',
        "",
        cleaned,
        flags=re.IGNORECASE,
    )

    # Vô hiệu hóa hoàn toàn hàm blockPlayer()
    cleaned = re.sub(
        r'function blockPlayer\(\)\s*\{',
        r'function blockPlayer() { return;',
        cleaned
    )

    # Lấy origin của embed (vd: https://embed11.streamc.xyz)
    embed_origin = _get_origin(embed_url)

    # Thay thế window.streamURL = '/' + streamData.sUb thành window.streamURL = '{embed_origin}/' + streamData.sUb
    cleaned = re.sub(
        r"window\.streamURL\s*=\s*['\"]/['\"]\s*\+\s*streamData\.sUb",
        f"window.streamURL = '{embed_origin}/' + streamData.sUb",
        cleaned,
    )

    # Inject <base> tag + bypass JS ngay sau <head>
    # <base href> đảm bảo TẤT CẢ relative URL (kể cả dynamic createElement)
    # đều resolve về đúng origin của streamc.xyz, không phải localhost
    base_tag = f'<base href="{embed_origin}/">'
    inject = base_tag + _INJECT_JS.replace("__EMBED_ORIGIN__", embed_origin)

    cleaned = re.sub(
        r"(<head[^>]*>)",
        r"\1" + inject,
        cleaned,
        count=1,
        flags=re.IGNORECASE,
    )

    return cleaned


def _get_origin(url: str) -> str:
    """Trích xuất origin từ URL. Ví dụ: https://embed11.streamc.xyz"""
    try:
        from urllib.parse import urlparse
        p = urlparse(url)
        return f"{p.scheme}://{p.netloc}"
    except Exception:
        return STREAMC_BASE


def _error_html(message: str) -> str:
    return f"""<!DOCTYPE html>
<html><body style="background:#111;color:#fff;display:flex;
align-items:center;justify-content:center;height:100vh;margin:0;
font-family:sans-serif;">
<p>{message}</p></body></html>"""
