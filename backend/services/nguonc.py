"""Service layer for calling the NguonC API."""
import httpx
from services.cache import cache
from config import NGUONC_BASE_URL, HTTP_TIMEOUT, CACHE_TTL_LIST, CACHE_TTL_DETAIL, CACHE_TTL_SEARCH
from schemas import (
    MovieSummary, Pagination, PaginatedMovies,
    MovieDetail, MovieDetailResponse,
    EpisodeServer, EpisodeItem, CategoryGroup, CategoryItem,
)


async def _fetch_json(path: str, params: dict = None) -> dict:
    """Fetch JSON from NguonC API."""
    url = f"{NGUONC_BASE_URL}{path}"
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        return resp.json()


def _parse_movie_list(data: dict) -> PaginatedMovies:
    """Parse a list response from NguonC into our schema."""
    items_raw = data.get("items") or data.get("data") or []
    paginate_raw = data.get("paginate") or data.get("pagination") or {}

    items = []
    for m in items_raw:
        items.append(MovieSummary(
            name=m.get("name", ""),
            slug=m.get("slug", ""),
            original_name=m.get("original_name", ""),
            thumb_url=m.get("thumb_url", ""),
            poster_url=m.get("poster_url", ""),
            description=_clean_html(m.get("description", "")),
            total_episodes=m.get("total_episodes", 0),
            current_episode=m.get("current_episode", ""),
            time=m.get("time", "") or "",
            quality=m.get("quality", ""),
            language=m.get("language", ""),
            director=m.get("director"),
            casts=m.get("casts"),
            year=m.get("year"),
            created=m.get("created"),
            modified=m.get("modified"),
        ))

    paginate = Pagination(
        current_page=paginate_raw.get("current_page", 1),
        total_page=paginate_raw.get("total_page", 1),
        total_items=paginate_raw.get("total_items", len(items)),
        items_per_page=paginate_raw.get("items_per_page", 24),
    )

    return PaginatedMovies(status="success", items=items, paginate=paginate)


def _parse_movie_detail(data: dict) -> MovieDetailResponse:
    """Parse a detail response from NguonC into our schema."""
    movie_raw = data.get("movie")
    if not movie_raw:
        return MovieDetailResponse(status="error", movie=None)

    # Parse categories
    categories = []
    cat_raw = movie_raw.get("category", {})
    if isinstance(cat_raw, dict):
        for _key, cat_group in cat_raw.items():
            group_info = cat_group.get("group", {})
            cat_list = cat_group.get("list", [])
            categories.append(CategoryGroup(
                group_name=group_info.get("name", ""),
                list=[CategoryItem(id=c.get("id", ""), name=c.get("name", "")) for c in cat_list],
            ))

    # Parse episodes
    episodes = []
    for ep_server in movie_raw.get("episodes", []):
        items = []
        for item in ep_server.get("items", []):
            items.append(EpisodeItem(
                name=item.get("name", ""),
                slug=item.get("slug", ""),
                embed=item.get("embed", ""),
                m3u8=item.get("m3u8"),
            ))
        episodes.append(EpisodeServer(
            server_name=ep_server.get("server_name", ""),
            items=items,
        ))

    movie = MovieDetail(
        id=movie_raw.get("id", ""),
        name=movie_raw.get("name", ""),
        slug=movie_raw.get("slug", ""),
        original_name=movie_raw.get("original_name", ""),
        thumb_url=movie_raw.get("thumb_url", ""),
        poster_url=movie_raw.get("poster_url", ""),
        description=_clean_html(movie_raw.get("description", "")),
        total_episodes=movie_raw.get("total_episodes", 0),
        current_episode=movie_raw.get("current_episode", ""),
        time=movie_raw.get("time", "") or "",
        quality=movie_raw.get("quality", ""),
        language=movie_raw.get("language", ""),
        director=movie_raw.get("director"),
        casts=movie_raw.get("casts"),
        categories=categories,
        episodes=episodes,
    )

    return MovieDetailResponse(status="success", movie=movie)


def _clean_html(text: str) -> str:
    """Remove basic HTML tags from description."""
    import re
    if not text:
        return ""
    return re.sub(r"<[^>]+>", "", text).strip()


# ── Public API methods ──

async def get_latest_movies(page: int = 1) -> PaginatedMovies:
    cache_key = f"latest:{page}"
    cached = await cache.get(cache_key)
    if cached:
        return cached
    data = await _fetch_json(f"/films/phim-moi-cap-nhat", {"page": page})
    result = _parse_movie_list(data)
    await cache.set(cache_key, result, CACHE_TTL_LIST)
    return result


async def get_movies_by_type(movie_type: str, page: int = 1) -> PaginatedMovies:
    cache_key = f"type:{movie_type}:{page}"
    cached = await cache.get(cache_key)
    if cached:
        return cached
    data = await _fetch_json(f"/films/danh-sach/{movie_type}", {"page": page})
    result = _parse_movie_list(data)
    await cache.set(cache_key, result, CACHE_TTL_LIST)
    return result


async def get_movies_by_genre(genre_slug: str, page: int = 1) -> PaginatedMovies:
    cache_key = f"genre:{genre_slug}:{page}"
    cached = await cache.get(cache_key)
    if cached:
        return cached
    data = await _fetch_json(f"/films/the-loai/{genre_slug}", {"page": page})
    result = _parse_movie_list(data)
    await cache.set(cache_key, result, CACHE_TTL_LIST)
    return result


async def get_movies_by_country(country_slug: str, page: int = 1) -> PaginatedMovies:
    cache_key = f"country:{country_slug}:{page}"
    cached = await cache.get(cache_key)
    if cached:
        return cached
    data = await _fetch_json(f"/films/quoc-gia/{country_slug}", {"page": page})
    result = _parse_movie_list(data)
    await cache.set(cache_key, result, CACHE_TTL_LIST)
    return result


async def search_movies(keyword: str, page: int = 1) -> PaginatedMovies:
    cache_key = f"search:{keyword}:{page}"
    cached = await cache.get(cache_key)
    if cached:
        return cached
    data = await _fetch_json("/films/search", {"keyword": keyword, "page": page})
    result = _parse_movie_list(data)
    await cache.set(cache_key, result, CACHE_TTL_SEARCH)
    return result


async def get_movie_detail(slug: str) -> MovieDetailResponse:
    cache_key = f"detail:{slug}"
    cached = await cache.get(cache_key)
    if cached:
        return cached
    data = await _fetch_json(f"/film/{slug}")
    result = _parse_movie_detail(data)
    await cache.set(cache_key, result, CACHE_TTL_DETAIL)
    return result

