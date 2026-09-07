"""Service layer for fetching episodes from KKPhim (phimapi.com)."""
import asyncio
import logging
import httpx
from services.cache import cache
from config import HTTP_TIMEOUT, CACHE_TTL_DETAIL
from schemas import EpisodeServer, EpisodeItem

logger = logging.getLogger(__name__)

KKPHIM_BASE_URL = "https://phimapi.com"
_CACHE_TTL = CACHE_TTL_DETAIL   # 30 minutes
_VIP_SERVER_PREFIX = "[VIP] KKPhim"


async def _fetch_json(url: str, params: dict = None) -> dict | None:
    """Fetch JSON from KKPhim API. Returns None on failure."""
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                return resp.json()
            logger.debug("KKPhim %s -> HTTP %d", url, resp.status_code)
    except Exception as exc:
        logger.debug("KKPhim request error %s: %s", url, exc)
    return None


async def _find_kkphim_slug(slug: str, title: str | None) -> str | None:
    """
    Try to find the canonical KKPhim slug for a movie.
    1. Try direct slug lookup.
    2. Fallback: search by title.
    """
    # 1. Direct slug
    data = await _fetch_json(f"{KKPHIM_BASE_URL}/phim/{slug}")
    if data and data.get("status") and data.get("movie"):
        return slug

    # 2. Search by title
    if title:
        search_data = await _fetch_json(
            f"{KKPHIM_BASE_URL}/v1/api/tim-kiem",
            params={"keyword": title, "limit": 1},
        )
        if search_data:
            items = (
                search_data.get("data", {}).get("items")
                or search_data.get("items")
                or []
            )
            if items:
                found_slug = items[0].get("slug")
                if found_slug:
                    logger.debug("KKPhim: resolved slug '%s' -> '%s'", slug, found_slug)
                    return found_slug

    return None


def _parse_episodes(movie_data: dict) -> list[EpisodeServer]:
    """Parse KKPhim movie detail into list of EpisodeServer."""
    servers: list[EpisodeServer] = []

    episodes_raw = movie_data.get("episodes") or []
    for server_raw in episodes_raw:
        server_name_raw = server_raw.get("server_name", "")
        server_name = f"{_VIP_SERVER_PREFIX} - {server_name_raw}" if server_name_raw else _VIP_SERVER_PREFIX

        items: list[EpisodeItem] = []
        for ep in server_raw.get("server_data", []):
            m3u8_link = ep.get("link_m3u8", "") or ""
            embed_link = ep.get("link_embed", "") or ""
            ep_name = ep.get("name", "") or ep.get("filename", "")
            ep_slug = ep.get("slug", "") or ep.get("name", "")

            if m3u8_link or embed_link:
                items.append(EpisodeItem(
                    name=ep_name,
                    slug=ep_slug,
                    embed=embed_link,
                    m3u8=m3u8_link if m3u8_link else None,
                ))

        if items:
            servers.append(EpisodeServer(server_name=server_name, items=items))

    return servers


async def get_kkphim_episodes(slug: str, title: str | None = None) -> list[EpisodeServer]:
    """
    Fetch and return KKPhim episode servers for a given movie slug.
    Returns an empty list if the movie is not found or an error occurs.
    Results are cached for CACHE_TTL_DETAIL seconds.
    """
    cache_key = f"kkphim:episodes:{slug}"
    cached = await cache.get(cache_key)
    if cached is not None:
        return cached

    kk_slug = await _find_kkphim_slug(slug, title)
    if not kk_slug:
        logger.debug("KKPhim: no match for slug='%s' title='%s'", slug, title)
        await cache.set(cache_key, [], _CACHE_TTL)
        return []

    data = await _fetch_json(f"{KKPHIM_BASE_URL}/phim/{kk_slug}")
    if not data or not data.get("status") or not data.get("movie"):
        await cache.set(cache_key, [], _CACHE_TTL)
        return []

    servers = _parse_episodes(data["movie"])
    logger.info(
        "KKPhim: found %d server(s) with episodes for slug='%s' (kk_slug='%s')",
        len(servers), slug, kk_slug,
    )
    await cache.set(cache_key, servers, _CACHE_TTL)
    return servers
