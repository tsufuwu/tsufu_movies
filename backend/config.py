"""Application configuration."""

import os
from dotenv import load_dotenv

load_dotenv()

"""Application configuration."""

import os
from dotenv import load_dotenv

load_dotenv()

NGUONC_BASE_URL = os.getenv("NGUONC_BASE_URL", "https://phim.nguonc.com/api")

CACHE_TTL_LIST = int(os.getenv("CACHE_TTL_LIST", "300"))
CACHE_TTL_DETAIL = int(os.getenv("CACHE_TTL_DETAIL", "1800"))
CACHE_TTL_SEARCH = int(os.getenv("CACHE_TTL_SEARCH", "180"))

_cors = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000")
CORS_ORIGINS = [origin.strip() for origin in _cors.split(",") if origin.strip()]

STREAMC_BASE = os.getenv("STREAMC_BASE", "https://streamc.xyz")
HTTP_TIMEOUT = float(os.getenv("HTTP_TIMEOUT", "15.0"))

_allowed_proxy_domains = os.getenv("ALLOWED_PROXY_DOMAINS", "streamc.xyz")
ALLOWED_PROXY_DOMAINS = [d.strip() for d in _allowed_proxy_domains.split(",") if d.strip()]
