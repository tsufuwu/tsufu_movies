const API_BASE = '/api/movies';

async function fetchApi(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
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

export async function searchMovies(keyword, page = 1) {
  return fetchApi(`/search?keyword=${encodeURIComponent(keyword)}&page=${page}`);
}

export async function getMovieDetail(slug) {
  return fetchApi(`/detail/${slug}`);
}

export async function getMoviesByType(type, page = 1) {
  return fetchApi(`/${type}?page=${page}`);
}

/**
 * Resolve embed URL → trả về { m3u8, proxy_url, embed_url, source }
 * source: "m3u8" | "proxy" | "embed"
 */
export async function resolveStream(embedUrl) {
  const encoded = encodeURIComponent(embedUrl);
  const res = await fetch(`/api/stream/resolve?url=${encoded}`);
  if (!res.ok) throw new Error(`Stream resolve error: ${res.status}`);
  return res.json();
}
