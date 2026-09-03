"""Pydantic models for API responses."""
from pydantic import BaseModel
from typing import Optional, List


class MovieSummary(BaseModel):
    name: str = ""
    slug: str = ""
    original_name: str = ""
    thumb_url: str = ""
    poster_url: str = ""
    description: str = ""
    total_episodes: int = 0
    current_episode: str = ""
    time: str = ""
    quality: str = ""
    language: str = ""
    director: Optional[str] = None
    casts: Optional[str] = None
    year: Optional[str] = None
    created: Optional[str] = None
    modified: Optional[str] = None


class Pagination(BaseModel):
    current_page: int = 1
    total_page: int = 1
    total_items: int = 0
    items_per_page: int = 24


class PaginatedMovies(BaseModel):
    status: str = "success"
    items: List[MovieSummary] = []
    paginate: Pagination = Pagination()


class EpisodeItem(BaseModel):
    name: str = ""
    slug: str = ""
    embed: str = ""
    m3u8: Optional[str] = None


class EpisodeServer(BaseModel):
    server_name: str = ""
    items: List[EpisodeItem] = []


class CategoryItem(BaseModel):
    id: str = ""
    name: str = ""


class CategoryGroup(BaseModel):
    group_name: str = ""
    list: List[CategoryItem] = []


class MovieDetail(BaseModel):
    id: str = ""
    name: str = ""
    slug: str = ""
    original_name: str = ""
    thumb_url: str = ""
    poster_url: str = ""
    description: str = ""
    total_episodes: int = 0
    current_episode: str = ""
    time: str = ""
    quality: str = ""
    language: str = ""
    director: Optional[str] = None
    casts: Optional[str] = None
    categories: List[CategoryGroup] = []
    episodes: List[EpisodeServer] = []


class MovieDetailResponse(BaseModel):
    status: str = "success"
    movie: Optional[MovieDetail] = None
