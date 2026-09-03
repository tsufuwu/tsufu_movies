"""Simple in-memory cache with TTL support."""
import time
from typing import Any, Optional, Dict, Tuple


class InMemoryCache:
    def __init__(self):
        self._store: Dict[str, Tuple[Any, float]] = {}

    def get(self, key: str) -> Optional[Any]:
        if key not in self._store:
            return None
        value, expires_at = self._store[key]
        if time.time() > expires_at:
            del self._store[key]
            return None
        return value

    def set(self, key: str, value: Any, ttl: int) -> None:
        self._store[key] = (value, time.time() + ttl)

    def clear(self) -> None:
        self._store.clear()


cache = InMemoryCache()
