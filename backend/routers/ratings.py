"""
OMDB Ratings Proxy Router
Fetches IMDB / Metacritic / Rotten Tomatoes ratings via OMDB API.
API key is kept server-side to avoid exposing it to the browser.
"""
import logging
import httpx
from fastapi import APIRouter, Query, HTTPException
from services.cache import cache

logger = logging.getLogger("app.ratings")

OMDB_API_KEY = "f74cd8ba"
OMDB_BASE_URL = "https://www.omdbapi.com/"
RATINGS_CACHE_TTL = 86400  # 24 hours – ratings rarely change

router = APIRouter(prefix="/api/ratings", tags=["ratings"])


def _parse_ratings(omdb_data: dict) -> dict:
    """Extract and normalise IMDB, Metacritic and Rotten Tomatoes scores."""
    ratings = {
        "imdb": None,
        "metacritic": None,
        "rotten_tomatoes": None,
        "imdb_votes": None,
        "imdb_id": omdb_data.get("imdbID"),
    }

    # IMDB rating & vote count
    raw_imdb = omdb_data.get("imdbRating", "N/A")
    if raw_imdb and raw_imdb != "N/A":
        try:
            ratings["imdb"] = float(raw_imdb)
        except ValueError:
            pass

    raw_votes = omdb_data.get("imdbVotes", "N/A")
    if raw_votes and raw_votes != "N/A":
        ratings["imdb_votes"] = raw_votes

    # Metacritic score (0-100)
    raw_meta = omdb_data.get("Metascore", "N/A")
    if raw_meta and raw_meta != "N/A":
        try:
            ratings["metacritic"] = int(raw_meta)
        except ValueError:
            pass

    # Rotten Tomatoes percentage from Ratings array
    for entry in omdb_data.get("Ratings", []):
        if entry.get("Source") == "Rotten Tomatoes":
            ratings["rotten_tomatoes"] = entry.get("Value")  # e.g. "94%"
            break

    return ratings


@router.get("")
async def get_ratings(
    title: str = Query(..., description="Movie/series title (English preferred)"),
    year: str | None = Query(None, description="Release year (optional, improves accuracy)"),
):
    """
    Return IMDB, Metacritic, and Rotten Tomatoes ratings for a given title.
    Results are cached for 24 hours server-side.
    """
    cache_key = f"omdb:{title.lower()}:{year or ''}"

    # Check cache first
    cached = await cache.get(cache_key)
    if cached:
        logger.debug("OMDB cache hit for '%s'", title)
        return cached

    params = {
        "apikey": OMDB_API_KEY,
        "t": title,
        "type": "movie",  # try movie first
        "tomatoes": "true",
        "r": "json",
    }
    if year:
        params["y"] = year

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(OMDB_BASE_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

        # If no result as movie, retry as series
        if data.get("Response") == "False":
            params["type"] = "series"
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(OMDB_BASE_URL, params=params)
                resp.raise_for_status()
                data = resp.json()

        if data.get("Response") == "False":
            # Not found – return empty ratings (don't error out)
            result = {"found": False, "imdb": None, "metacritic": None, "rotten_tomatoes": None}
            await cache.set(cache_key, result, ttl=3600)  # cache 1hr for misses
            return result

        ratings = _parse_ratings(data)
        result = {"found": True, **ratings}
        await cache.set(cache_key, result, ttl=RATINGS_CACHE_TTL)
        logger.info("OMDB fetched ratings for '%s' (%s)", title, year)
        return result

    except httpx.HTTPError as exc:
        logger.error("OMDB HTTP error for '%s': %s", title, exc)
        raise HTTPException(status_code=502, detail="Failed to fetch ratings from OMDB")
