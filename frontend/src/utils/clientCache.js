/**
 * Lightweight Client-Side Cache with sessionStorage and Memory fallback.
 * Prevents redundant network requests on page navigation, back/forward, and tab switching.
 */

const CACHE_PREFIX = 'tsufu_cache_';
const memoryFallback = new Map();

/**
 * Check if sessionStorage is available and functional.
 */
function isSessionStorageAvailable() {
  try {
    const testKey = '__storage_test__';
    window.sessionStorage.setItem(testKey, '1');
    window.sessionStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const hasSessionStorage = typeof window !== 'undefined' && isSessionStorageAvailable();

export const clientCache = {
  /**
   * Retrieve cached data by key. Returns null if missing or expired.
   */
  get(key) {
    const fullKey = `${CACHE_PREFIX}${key}`;
    const now = Date.now();

    try {
      if (hasSessionStorage) {
        const itemStr = window.sessionStorage.getItem(fullKey);
        if (!itemStr) return null;

        const item = JSON.parse(itemStr);
        if (item.expiresAt && now > item.expiresAt) {
          window.sessionStorage.removeItem(fullKey);
          return null;
        }
        return item.data;
      }
    } catch (e) {
      console.warn('[ClientCache] sessionStorage read error, falling back to memory:', e);
    }

    // Memory fallback
    const memItem = memoryFallback.get(fullKey);
    if (!memItem) return null;
    if (memItem.expiresAt && now > memItem.expiresAt) {
      memoryFallback.delete(fullKey);
      return null;
    }
    return memItem.data;
  },

  /**
   * Store data in cache with TTL in seconds.
   */
  set(key, data, ttlSeconds = 180) {
    const fullKey = `${CACHE_PREFIX}${key}`;
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const record = { data, expiresAt };

    // Always update memory
    memoryFallback.set(fullKey, record);

    if (hasSessionStorage) {
      try {
        window.sessionStorage.setItem(fullKey, JSON.stringify(record));
      } catch (e) {
        // Quota exceeded: cleanup old/expired cache keys
        this.prune();
        try {
          window.sessionStorage.setItem(fullKey, JSON.stringify(record));
        } catch {
          // If still fails, memory fallback is already set
        }
      }
    }
  },

  /**
   * Remove specific key from cache.
   */
  remove(key) {
    const fullKey = `${CACHE_PREFIX}${key}`;
    memoryFallback.delete(fullKey);
    if (hasSessionStorage) {
      try {
        window.sessionStorage.removeItem(fullKey);
      } catch {}
    }
  },

  /**
   * Prune expired or old keys when quota is high.
   */
  prune() {
    const now = Date.now();
    if (!hasSessionStorage) return;

    try {
      const keysToRemove = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const k = window.sessionStorage.key(i);
        if (k && k.startsWith(CACHE_PREFIX)) {
          try {
            const item = JSON.parse(window.sessionStorage.getItem(k));
            if (item && item.expiresAt && now > item.expiresAt) {
              keysToRemove.push(k);
            }
          } catch {
            keysToRemove.push(k);
          }
        }
      }
      keysToRemove.forEach(k => window.sessionStorage.removeItem(k));
    } catch {}
  },

  /**
   * Clear all cache entries created by tsufu.
   */
  clear() {
    memoryFallback.clear();
    if (!hasSessionStorage) return;

    try {
      const keysToRemove = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const k = window.sessionStorage.key(i);
        if (k && k.startsWith(CACHE_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => window.sessionStorage.removeItem(k));
    } catch {}
  },
};
