"""FastAPI backend for App Phim."""
import sys
import os
from contextlib import asynccontextmanager

# Add backend dir to path so imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import CORS_ORIGINS
from services.cache import cache
from routers.session import router as session_router
from routers.movies import router as movies_router
from routers.stream import router as stream_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown: cleanly close Redis if initialized
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
is_wildcard_cors = "*" in CORS_ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS else ["*"],
    allow_credentials=not is_wildcard_cors,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(session_router)
app.include_router(movies_router)
app.include_router(stream_router)


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
