/**
 * LocalStorage Watch Progress & History Manager.
 * Persists timestamps and watched episodes client-side to prevent frequent backend writes.
 */

const STORAGE_KEY = 'tsufu_watch_history';
const MAX_HISTORY_ITEMS = 50;

// In-memory throttle tracker: slug -> timestamp of last write
const lastSaveTimestamps = new Map();

function isLocalStorageAvailable() {
  try {
    const testKey = '__ls_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const hasLocalStorage = typeof window !== 'undefined' && isLocalStorageAvailable();

/**
 * Load raw history dictionary from localStorage.
 */
function loadHistoryMap() {
  if (!hasLocalStorage) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('[WatchHistory] Error reading localStorage:', e);
    return {};
  }
}

/**
 * Save history dictionary to localStorage.
 */
function persistHistoryMap(map) {
  if (!hasLocalStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('[WatchHistory] Error writing localStorage:', e);
  }
}

export const watchHistory = {
  /**
   * Save or update progress for a movie episode.
   * Throttled to at most once every 3 seconds per movie.
   */
  saveProgress({
    slug,
    name,
    poster_url,
    episodeSlug,
    episodeName,
    currentTime = 0,
    duration = 0,
    force = false,
  }) {
    if (!slug) return;

    const now = Date.now();
    const lastSave = lastSaveTimestamps.get(slug) || 0;
    if (!force && now - lastSave < 3000) {
      return; // Skip write to prevent thrashing
    }
    lastSaveTimestamps.set(slug, now);

    const map = loadHistoryMap();
    const progressPercent = duration > 0 ? Math.min(100, Math.round((currentTime / duration) * 100)) : 0;

    map[slug] = {
      slug,
      name: name || map[slug]?.name || slug,
      poster_url: poster_url || map[slug]?.poster_url || '',
      episodeSlug: episodeSlug || map[slug]?.episodeSlug || '',
      episodeName: episodeName || map[slug]?.episodeName || '',
      currentTime: Math.floor(currentTime),
      duration: Math.floor(duration),
      progressPercent,
      updatedAt: now,
    };

    // Keep size under MAX_HISTORY_ITEMS
    const entries = Object.entries(map);
    if (entries.length > MAX_HISTORY_ITEMS) {
      entries.sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0));
      const pruned = Object.fromEntries(entries.slice(0, MAX_HISTORY_ITEMS));
      persistHistoryMap(pruned);
    } else {
      persistHistoryMap(map);
    }
  },

  /**
   * Retrieve saved watch progress for a movie (and optionally specific episode).
   */
  getProgress(slug, episodeSlug = null) {
    if (!slug) return null;
    const map = loadHistoryMap();
    const item = map[slug];
    if (!item) return null;

    if (episodeSlug && item.episodeSlug && item.episodeSlug !== episodeSlug) {
      // Different episode
      return {
        ...item,
        isCurrentEpisode: false,
      };
    }

    return {
      ...item,
      isCurrentEpisode: true,
    };
  },

  /**
   * Get all watched movies list sorted by latest watched.
   */
  getAll() {
    const map = loadHistoryMap();
    return Object.values(map).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  },

  /**
   * Delete a movie from watch history.
   */
  remove(slug) {
    if (!slug) return;
    const map = loadHistoryMap();
    if (map[slug]) {
      delete map[slug];
      persistHistoryMap(map);
    }
  },

  /**
   * Clear entire watch history.
   */
  clear() {
    lastSaveTimestamps.clear();
    if (!hasLocalStorage) return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {}
  },
};
