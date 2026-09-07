"""Application configuration."""

import os
from dotenv import load_dotenv

load_dotenv()

# Environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
IS_PRODUCTION = ENVIRONMENT.lower() == "production"

# Upstream API
NGUONC_BASE_URL = os.getenv("NGUONC_BASE_URL", "https://phim.nguonc.com/api")

# Caching & Redis Backend
REDIS_URL = os.getenv("REDIS_URL", None)
CACHE_TTL_LIST = int(os.getenv("CACHE_TTL_LIST", "900"))      # 15 minutes
CACHE_TTL_DETAIL = int(os.getenv("CACHE_TTL_DETAIL", "1800")) # 30 minutes
CACHE_TTL_SEARCH = int(os.getenv("CACHE_TTL_SEARCH", "300"))   # 5 minutes
CACHE_TTL_STREAM = int(os.getenv("CACHE_TTL_STREAM", "600"))   # 10 minutes

# CORS
_cors = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000")
CORS_ORIGINS = [origin.strip() for origin in _cors.split(",") if origin.strip()]

# Video Streaming & Proxy
STREAMC_BASE = os.getenv("STREAMC_BASE", "https://streamc.xyz")
HTTP_TIMEOUT = float(os.getenv("HTTP_TIMEOUT", "15.0"))

_allowed_proxy_domains = os.getenv("ALLOWED_PROXY_DOMAINS", "streamc.xyz,hihihoho,hihihoho4.top,hihihoho3.top,hihihoho.top,nguonc.com,phim.nguonc.com")
ALLOWED_PROXY_DOMAINS = [d.strip() for d in _allowed_proxy_domains.split(",") if d.strip()]

# ── Security Hardening Configurations ──────────────────────────────────────────
# 1. Ephemeral Session Token
SESSION_SECRET = os.getenv("SESSION_SECRET", "tsufu-session-secret-key-default-change-me")
SESSION_TTL = int(os.getenv("SESSION_TTL", "14400"))  # 4 hours
ENABLE_SESSION_CHECK = os.getenv("ENABLE_SESSION_CHECK", "true").lower() in ("true", "1", "yes")

# 2. Signed URLs / Expiring Stream Tokens
STREAM_SECRET_KEY = os.getenv("STREAM_SECRET_KEY", "tsufu-stream-hmac-secret-key-default-change-me")
STREAM_TOKEN_TTL = int(os.getenv("STREAM_TOKEN_TTL", "7200"))  # 2 hours
ENABLE_STREAM_SIGNATURE = os.getenv("ENABLE_STREAM_SIGNATURE", "true").lower() in ("true", "1", "yes")

# 3. Referer & Sec-Fetch-Site Checking
ENFORCE_REFERER_CHECK = os.getenv("ENFORCE_REFERER_CHECK", "true").lower() in ("true", "1", "yes")

# 4. Anti-bot Honeypot
ENABLE_HONEYPOT = os.getenv("ENABLE_HONEYPOT", "true").lower() in ("true", "1", "yes")
