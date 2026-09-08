"""FastAPI backend for App Phim."""
import sys
import os
import logging
from urllib.parse import urlsplit, urlunsplit
from contextlib import asynccontextmanager

# Add backend dir to path so imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import config
from services.cache import cache
from routers.session import router as session_router
from routers.movies import router as movies_router
from routers.stream import router as stream_router
from routers.ratings import router as ratings_router

boot_logger = logging.getLogger("app.boot")


def _mask_url_credentials(url: str | None) -> str:
    """Safely mask password in connection URLs (e.g. Redis)."""
    if not url:
        return "(None - Using In-Memory TTLCache)"
    try:
        parsed = urlsplit(url)
        if parsed.password:
            user_part = f"{parsed.username}:***@" if parsed.username else ":***@"
            host_part = parsed.hostname or ""
            port_part = f":{parsed.port}" if parsed.port else ""
            masked_netloc = f"{user_part}{host_part}{port_part}"
            return urlunsplit((parsed.scheme, masked_netloc, parsed.path, parsed.query, parsed.fragment))
        return url
    except Exception:
        return "[CONFIGURED]"


def log_boot_configuration():
    """Log non-sensitive application settings on startup."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    redis_display = _mask_url_credentials(config.REDIS_URL)
    session_secret_status = f"[CONFIGURED] ({len(config.SESSION_SECRET)} chars)" if config.SESSION_SECRET else "[MISSING]"
    stream_secret_status = f"[CONFIGURED] ({len(config.STREAM_SECRET_KEY)} chars)" if config.STREAM_SECRET_KEY else "[MISSING]"

    boot_logger.info("================================================================")
    boot_logger.info("🚀 Starting App Phim Backend (FastAPI)")
    boot_logger.info("================================================================")
    boot_logger.info("🌍 ENVIRONMENT:            %s (is_production=%s)", config.ENVIRONMENT, config.IS_PRODUCTION)
    boot_logger.info("🌐 UPSTREAM NGUONC API:    %s", config.NGUONC_BASE_URL)
    boot_logger.info("🎬 STREAMC BASE:           %s (timeout=%.1fs)", config.STREAMC_BASE, config.HTTP_TIMEOUT)
    boot_logger.info("🛡️  ALLOWED PROXY DOMAINS:  %s", config.ALLOWED_PROXY_DOMAINS)
    boot_logger.info("🔒 CORS ALLOWED ORIGINS:   %s", config.CORS_ORIGINS)
    boot_logger.info("----------------------------------------------------------------")
    boot_logger.info("📦 CACHING SETTINGS:")
    boot_logger.info("   - REDIS_URL:            %s", redis_display)
    boot_logger.info("   - CACHE_TTL_LIST:       %ss", config.CACHE_TTL_LIST)
    boot_logger.info("   - CACHE_TTL_DETAIL:     %ss", config.CACHE_TTL_DETAIL)
    boot_logger.info("   - CACHE_TTL_SEARCH:     %ss", config.CACHE_TTL_SEARCH)
    boot_logger.info("   - CACHE_TTL_STREAM:     %ss", config.CACHE_TTL_STREAM)
    boot_logger.info("----------------------------------------------------------------")
    boot_logger.info("🛡️  SECURITY HARDENING SETTINGS:")
    boot_logger.info("   - ENABLE_SESSION_CHECK: %s", config.ENABLE_SESSION_CHECK)
    boot_logger.info("   - SESSION_TTL:          %ss", config.SESSION_TTL)
    boot_logger.info("   - SESSION_SECRET:       %s (Sensitive - Masked)", session_secret_status)
    boot_logger.info("   - ENABLE_STREAM_SIG:    %s", config.ENABLE_STREAM_SIGNATURE)
    boot_logger.info("   - STREAM_TOKEN_TTL:     %ss", config.STREAM_TOKEN_TTL)
    boot_logger.info("   - STREAM_SECRET_KEY:    %s (Sensitive - Masked)", stream_secret_status)
    boot_logger.info("   - ENFORCE_REFERER_CHECK:%s", config.ENFORCE_REFERER_CHECK)
    boot_logger.info("   - ENABLE_HONEYPOT:      %s", config.ENABLE_HONEYPOT)
    boot_logger.info("================================================================")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Log non-sensitive configurations at boot
    log_boot_configuration()
    yield
    # Shutdown: cleanly close Redis and stream client if initialized
    try:
        from routers.stream import _stream_client
        if _stream_client and not _stream_client.is_closed:
            await _stream_client.aclose()
    except Exception:
        pass
    await cache.close()


app = FastAPI(
    title="App Phim API",
    description="Backend API for movie streaming app with security hardening & dual caching",
    version="1.0.0",
    lifespan=lifespan,
)

# Cấu hình CORS:
# - Trong môi trường Production (Docker): Browser gửi request cùng origin tới Nginx Reverse Proxy -> không bị hạn chế CORS.
# - Trong môi trường Dev (Local): Cho phép các origin được khai báo trong config (Vite dev server, localhost...).
is_wildcard_cors = "*" in config.CORS_ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS if config.CORS_ORIGINS else ["*"],
    allow_credentials=not is_wildcard_cors,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(session_router)
app.include_router(movies_router)
app.include_router(stream_router)
app.include_router(ratings_router)


@app.get("/")
async def root():
    return {"message": "App Phim API is running", "docs": "/docs"}


@app.get("/api/health")
@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "app-phim-backend",
        "cache_backend": "redis" if cache.is_redis_active() else "in-memory-ttl",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
