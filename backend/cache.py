"""Cache module re-exporting the dual-mode cache service."""
from services.cache import cache, DualModeCache

__all__ = ["cache", "DualModeCache"]
