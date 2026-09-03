"""Movie API endpoints."""
from fastapi import APIRouter, Query, HTTPException, Depends
from services import nguonc
from schemas import PaginatedMovies, MovieDetailResponse, Pagination
from security import require_session
from config import ENABLE_HONEYPOT

router = APIRouter(prefix="/api/movies", tags=["movies"], dependencies=[Depends(require_session)])


@router.get("/latest", response_model=PaginatedMovies)
async def latest_movies(page: int = Query(1, ge=1)):
    return await nguonc.get_latest_movies(page)


@router.get("/phim-le", response_model=PaginatedMovies)
async def single_movies(page: int = Query(1, ge=1)):
    return await nguonc.get_movies_by_type("phim-le", page)


@router.get("/phim-bo", response_model=PaginatedMovies)
async def series_movies(page: int = Query(1, ge=1)):
    return await nguonc.get_movies_by_type("phim-bo", page)


@router.get("/hoat-hinh", response_model=PaginatedMovies)
async def anime_movies(page: int = Query(1, ge=1)):
    return await nguonc.get_movies_by_type("hoat-hinh", page)


@router.get("/tv-shows", response_model=PaginatedMovies)
async def tv_shows(page: int = Query(1, ge=1)):
    return await nguonc.get_movies_by_type("tv-shows", page)


@router.get("/the-loai/{genre_slug}", response_model=PaginatedMovies)
async def movies_by_genre(genre_slug: str, page: int = Query(1, ge=1)):
    return await nguonc.get_movies_by_genre(genre_slug, page)


@router.get("/quoc-gia/{country_slug}", response_model=PaginatedMovies)
async def movies_by_country(country_slug: str, page: int = Query(1, ge=1)):
    return await nguonc.get_movies_by_country(country_slug, page)


@router.get("/search", response_model=PaginatedMovies)
async def search(
    keyword: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    hp: str = Query(None, alias="_hp"),
    website: str = Query(None),
):
    # Honeypot check: If bot filled the hidden honeypot field, drop silently
    if ENABLE_HONEYPOT and (hp or website):
        return PaginatedMovies(
            status="success",
            items=[],
            paginate=Pagination(
                current_page=page,
                total_page=1,
                total_items=0,
                items_per_page=24,
            ),
        )
    return await nguonc.search_movies(keyword, page)


@router.get("/detail/{slug}", response_model=MovieDetailResponse)
async def movie_detail(slug: str):
    result = await nguonc.get_movie_detail(slug)
    if not result.movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    return result
