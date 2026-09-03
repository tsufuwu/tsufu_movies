/**
 * Frontend Movie API Client with Ephemeral Session and Security Hardening.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE = `${BASE_URL}/api/movies`;

// In-memory session token & handshake promise
let currentSessionToken = null;
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

async function fetchApi(endpoint, options = {}) {
  return fetchWithSession(`${API_BASE}${endpoint}`, options);
}

export async function getLatestMovies(page = 1) {
  return fetchApi(`/latest?page=${page}`);
}

export async function getSingleMovies(page = 1) {
  return fetchApi(`/phim-le?page=${page}`);
}

export async function getSeriesMovies(page = 1) {
  return fetchApi(`/phim-bo?page=${page}`);
}

export async function getAnimeMovies(page = 1) {
  return fetchApi(`/hoat-hinh?page=${page}`);
}

export async function getTvShows(page = 1) {
  return fetchApi(`/tv-shows?page=${page}`);
}

export async function getMoviesByGenre(slug, page = 1) {
  return fetchApi(`/the-loai/${slug}?page=${page}`);
}

export async function getMoviesByCountry(slug, page = 1) {
  return fetchApi(`/quoc-gia/${slug}?page=${page}`);
}

export async function searchMovies(keyword, page = 1, honeypot = '') {
  let url = `/search?keyword=${encodeURIComponent(keyword)}&page=${page}`;
  if (honeypot) {
    url += `&_hp=${encodeURIComponent(honeypot)}`;
  }
  return fetchApi(url);
}

export async function getMovieDetail(slug) {
  return fetchApi(`/detail/${slug}`);
}

export async function getMoviesByType(type, page = 1) {
  return fetchApi(`/${type}?page=${page}`);
}

/**
 * Resolve embed URL → returns { m3u8, proxy_url, embed_url, source }
 * Signed proxy_url is verified by backend with HMAC & expiration.
 */
export async function resolveStream(embedUrl) {
  const encoded = encodeURIComponent(embedUrl);
  return fetchWithSession(`${BASE_URL}/api/stream/resolve?url=${encoded}`);
}

/**
 * Check Backend API Health
 */
export async function checkHealth() {
  const res = await fetch(`${BASE_URL}/api/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}
