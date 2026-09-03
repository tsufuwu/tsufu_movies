"""Application configuration."""

NGUONC_BASE_URL = "https://phim.nguonc.com/api"

CACHE_TTL_LIST = 300
CACHE_TTL_DETAIL = 1800
CACHE_TTL_SEARCH = 180

CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]
