"""
Dual-mode caching service supporting Redis (async) and In-Memory TTLCache fallback.
"""
import time
import pickle
import logging
from typing import Any, Optional
import cachetools
from config import REDIS_URL

logger = logging.getLogger("cache")


class DualModeCache:
    """
    Dual-mode caching engine:
    1. Primary: Redis via redis.asyncio (if REDIS_URL is provided and reachable).
    2. Fallback: In-Memory cachetools.TTLCache (zero dependencies, safe TTL + LRU eviction).
    """

    def __init__(
        self,
        redis_url: Optional[str] = REDIS_URL,
        maxsize: int = 5000,
        default_ttl: int = 300,
    ):
        self.redis_url = redis_url
        self.default_ttl = default_ttl
        # Local cache: max 5000 items with LRU eviction and 24h default TTL
        self._local_cache: cachetools.TTLCache = cachetools.TTLCache(maxsize=maxsize, ttl=86400)
        self._redis_client = None
        self._redis_available = False
        self._redis_initialized = False

    async def _init_redis(self) -> bool:
        """Attempt to connect to Redis instance asynchronously."""
        if self._redis_initialized:
            return self._redis_available

        self._redis_initialized = True
        if not self.redis_url:
            logger.info("[Cache] REDIS_URL not specified. Using in-memory TTLCache.")
            self._redis_available = False
            return False

        try:
            import redis.asyncio as aioredis

            self._redis_client = aioredis.from_url(
                self.redis_url,
                socket_connect_timeout=2.0,
                socket_timeout=2.0,
                retry_on_timeout=True,
            )
            await self._redis_client.ping()
            self._redis_available = True
            logger.info(f"[Cache] Connected to Redis at {self.redis_url}")
            return True
        except Exception as e:
            logger.warning(
                f"[Cache] Could not connect to Redis at {self.redis_url} ({e}). "
                "Falling back to in-memory TTLCache."
            )
            self._redis_available = False
            return False

    def is_redis_active(self) -> bool:
        """Check if Redis backend is currently active."""
        return self._redis_available

    async def get(self, key: str) -> Optional[Any]:
        """Retrieve item from Redis or local TTLCache."""
        if self.redis_url and not self._redis_initialized:
            await self._init_redis()

        if self._redis_available and self._redis_client:
            try:
                raw = await self._redis_client.get(key)
                if raw is not None:
                    return pickle.loads(raw)
                return None
            except Exception as e:
                logger.warning(f"[Cache] Redis get failed for '{key}': {e}. Falling back to local.")

        # Local TTLCache fallback
        if key not in self._local_cache:
            return None

        try:
            value, expires_at = self._local_cache[key]
            if time.time() > expires_at:
                try:
                    del self._local_cache[key]
                except KeyError:
                    pass
                return None
            return value
        except (KeyError, ValueError):
            return None

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Store item in Redis or local TTLCache with TTL in seconds."""
        if ttl is None:
            ttl = self.default_ttl

        if self.redis_url and not self._redis_initialized:
            await self._init_redis()

        if self._redis_available and self._redis_client:
            try:
                raw = pickle.dumps(value)
                await self._redis_client.set(key, raw, ex=ttl)
                return True
            except Exception as e:
                logger.warning(f"[Cache] Redis set failed for '{key}': {e}. Falling back to local.")

        # Local TTLCache fallback
        self._local_cache[key] = (value, time.time() + ttl)
        return True

    async def delete(self, key: str) -> bool:
        """Delete an item by key from both Redis and local cache."""
        if self._redis_available and self._redis_client:
            try:
                await self._redis_client.delete(key)
            except Exception as e:
                logger.warning(f"[Cache] Redis delete failed for '{key}': {e}")

        try:
            if key in self._local_cache:
                del self._local_cache[key]
        except KeyError:
            pass
        return True

    async def exists(self, key: str) -> bool:
        """Check if a key exists and is not expired."""
        if self.redis_url and not self._redis_initialized:
            await self._init_redis()

        if self._redis_available and self._redis_client:
            try:
                return bool(await self._redis_client.exists(key))
            except Exception as e:
                logger.warning(f"[Cache] Redis exists failed for '{key}': {e}")

        if key in self._local_cache:
            value, expires_at = self._local_cache[key]
            if time.time() <= expires_at:
                return True
            try:
                del self._local_cache[key]
            except KeyError:
                pass
        return False

    async def clear(self) -> None:
        """Clear all cache entries."""
        if self._redis_available and self._redis_client:
            try:
                await self._redis_client.flushdb()
            except Exception as e:
                logger.warning(f"[Cache] Redis clear failed: {e}")
        self._local_cache.clear()

    async def close(self) -> None:
        """Cleanly close connection to Redis."""
        if self._redis_client:
            try:
                await self._redis_client.aclose()
            except Exception:
                pass
            self._redis_client = None
            self._redis_initialized = False
            self._redis_available = False


# Global cache singleton instance
cache = DualModeCache()
