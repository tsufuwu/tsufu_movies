/**
 * Frontend Movie API Client with Ephemeral Session, Client-Side Caching, and Security Hardening.
 */
import { clientCache } from '../utils/clientCache';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE = `${BASE_URL}/api/movies`;
const SESSION_STORAGE_KEY = 'tsufu_session_token';

// In-memory + sessionStorage session token & handshake promise
let currentSessionToken = (() => {
  try {
    return window.sessionStorage.getItem(SESSION_STORAGE_KEY) || null;
  } catch {
    return null;
  }
})();
let sessionPromise = null;

/**
 * Initialize or refresh ephemeral session token.
 * Performs handshake with GET /api/v1/session/init
 */
export async function initSession(forceRefresh = false) {
  if (!forceRefresh && currentSessionToken) {
    return currentSessionToken;
  }
  if (!forceRefresh && sessionPromise) {
    return sessionPromise;
  }

  sessionPromise = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/session/init`, {
        method: 'GET',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        currentSessionToken = data.session_token;
        try {
          window.sessionStorage.setItem(SESSION_STORAGE_KEY, currentSessionToken);
        } catch {}
        return currentSessionToken;
      }
    } catch (err) {
      console.warn('[Session] Handshake warning:', err);
    } finally {
      sessionPromise = null;
    }
    return null;
  })();

  return sessionPromise;
}

// Eager initialization on bundle load
initSession();

/**
 * Unified fetch wrapper with credentials, session header, and transparent 401 retry.
 */
async function fetchWithSession(url, options = {}) {
  // Ensure session is initialized
  if (!currentSessionToken && !sessionPromise) {
    await initSession();
  } else if (sessionPromise) {
    await sessionPromise;
  }

  const headers = {
    ...(options.headers || {}),
  };
  if (currentSessionToken) {
    headers['X-Session-Token'] = currentSessionToken;
  }

  const config = {
    ...options,
    credentials: 'include',
    headers,
  };

  let res = await fetch(url, config);

  // If 401 Unauthorized (session expired or invalid), auto-refresh and retry once
  if (res.status === 401) {
    try {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {}
    currentSessionToken = null;
    const newToken = await initSession(true);
    if (newToken) {
      headers['X-Session-Token'] = newToken;
      res = await fetch(url, { ...config, headers });
    }
  }

  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`);
  }
  return res.json();
}

/**
 * Cached API fetch helper.
 * Uses clientCache (sessionStorage / memory) with TTL to prevent redundant requests.
 */
async function fetchApi(endpoint, options = {}, ttlSeconds = 180) {
  const isGet = !options.method || options.method.toUpperCase() === 'GET';
  const shouldCache = isGet && !options.skipCache;

  if (shouldCache) {
    const cached = clientCache.get(endpoint);
    if (cached) {
      return cached;
    }
  }

  const data = await fetchWithSession(`${API_BASE}${endpoint}`, options);

  if (shouldCache && data) {
    clientCache.set(endpoint, data, ttlSeconds);
  }

  return data;
}

// ── Public API Methods with Client Caching ──────────────────────────────────

export async function getLatestMovies(page = 1, options = {}) {
  return fetchApi(`/latest?page=${page}`, options, 180);
}

export async function getSingleMovies(page = 1, options = {}) {
  return fetchApi(`/phim-le?page=${page}`, options, 180);
}

export async function getSeriesMovies(page = 1, options = {}) {
  return fetchApi(`/phim-bo?page=${page}`, options, 180);
}

export async function getAnimeMovies(page = 1, options = {}) {
  return fetchApi(`/hoat-hinh?page=${page}`, options, 180);
}

export async function getTvShows(page = 1, options = {}) {
  return fetchApi(`/tv-shows?page=${page}`, options, 180);
}

export async function getMoviesByGenre(slug, page = 1, options = {}) {
  return fetchApi(`/the-loai/${slug}?page=${page}`, options, 180);
}

export async function getMoviesByCountry(slug, page = 1, options = {}) {
  return fetchApi(`/quoc-gia/${slug}?page=${page}`, options, 180);
}

export async function searchMovies(keyword, page = 1, honeypot = '', options = {}) {
  let url = `/search?keyword=${encodeURIComponent(keyword)}&page=${page}`;
  if (honeypot) {
    url += `&_hp=${encodeURIComponent(honeypot)}`;
  }
  return fetchApi(url, options, 60);
}

export async function getMovieDetail(slug, options = {}) {
  return fetchApi(`/detail/${slug}`, options, 300); // 5 minutes TTL for details
}

export async function getMoviesByType(type, page = 1, options = {}) {
  return fetchApi(`/${type}?page=${page}`, options, 180);
}

/**
 * Resolve embed URL → returns { m3u8, proxy_url, embed_url, source }
 * Resolving is cached briefly on client (120s) to prevent spamming when replaying
 */
export async function resolveStream(embedUrl) {
  const encoded = encodeURIComponent(embedUrl);
  const cacheKey = `stream_resolve_${embedUrl}`;
  const cached = clientCache.get(cacheKey);
  if (cached) return cached;

  const result = await fetchWithSession(`${BASE_URL}/api/stream/resolve?url=${encoded}`);
  if (result) {
    clientCache.set(cacheKey, result, 120);
  }
  return result;
}

/**
 * Check Backend API Health
 */
export async function checkHealth() {
  const res = await fetch(`${BASE_URL}/api/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

/**
 * Clear client-side data cache
 */
export function clearClientCache() {
  clientCache.clear();
}
