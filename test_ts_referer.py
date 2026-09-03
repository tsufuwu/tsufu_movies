import asyncio
import httpx
import re

async def run():
    client = httpx.AsyncClient(follow_redirects=True, timeout=30.0)
    
    # 1. Fetch initial encrypted URL
    url = "https://embed14.streamc.xyz/eyJoIjoiOWE2MWI5OWRiNmY0YTNlZjBjNDVkMjQxMWQxZmIyZWQiLCJ0IjoiZWI0YTk0MTdhNWI0YWI0MzNmYmJjOTU2ZDkxODU5Yzk2Yzg4NDE4MWRkZTMyN2U3MTdkYzViYjAyMGRkMTVmMyJ9?d=1"
    print("Fetching URL:", url)
    resp = await client.get(url, headers={"Referer": "https://streamc.xyz/"})
    print("Response status:", resp.status_code)
    
    if resp.status_code == 200:
        # 2. Wait, it is encrypted M3U8.
        # We can't parse it because it's encrypted!
        pass

asyncio.run(run())
