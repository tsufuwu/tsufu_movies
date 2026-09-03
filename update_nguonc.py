import os

path = r'd:\appphim\backend\services\nguonc.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''async def get_movie_detail(slug: str) -> MovieDetailResponse:
    cache_key = f"detail:{slug}"
    cached = cache.get(cache_key)
    if cached:
        return cached
    data = await _fetch_json(f"/film/{slug}")
    result = _parse_movie_detail(data)
    cache.set(cache_key, result, CACHE_TTL_DETAIL)
    return result'''

replacement = '''async def get_movie_detail(slug: str) -> MovieDetailResponse:
    cache_key = f"detail:{slug}"
    cached = cache.get(cache_key)
    if cached:
        return cached
    data = await _fetch_json(f"/film/{slug}")
    result = _parse_movie_detail(data)

    # Try to fetch m3u8 links from phimapi.com as fallback to remove ads
    if result.status == "success" and result.movie and result.movie.episodes:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                phimapi_resp = await client.get(f"https://phimapi.com/phim/{slug}")
                if phimapi_resp.status_code == 200:
                    phimapi_data = phimapi_resp.json()
                    if phimapi_data.get("status"):
                        m3u8_map = {}
                        for server in phimapi_data.get("episodes", []):
                            for ep in server.get("server_data", []):
                                ep_slug = ep.get("slug")
                                link_m3u8 = ep.get("link_m3u8")
                                if ep_slug and link_m3u8:
                                    m3u8_map[ep_slug] = link_m3u8
                        
                        for server in result.movie.episodes:
                            for item in server.items:
                                if item.slug in m3u8_map:
                                    item.m3u8 = m3u8_map[item.slug]
        except Exception as e:
            print(f"Failed to fetch m3u8 from phimapi: {e}")

    cache.set(cache_key, result, CACHE_TTL_DETAIL)
    return result'''

content = content.replace(target, replacement)
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated get_movie_detail')
