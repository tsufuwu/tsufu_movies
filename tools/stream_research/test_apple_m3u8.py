import asyncio
import httpx
import re
import json
import base64

async def test_resolve(embed_url):
    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Referer": embed_url,
    }
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        r = await client.get(embed_url, headers=headers)
        match = re.search(r'data-obf=["\']([A-Za-z0-9+/=]+)["\']', r.text)
        if not match:
            print("No data-obf found")
            return
        outer = json.loads(base64.b64decode(match.group(1)).decode("utf-8"))
        s_ub = outer.get("sUb")
        print("sUb:", s_ub)
        
        origin = "/".join(embed_url.split("/")[:3])
        stream_url = f"{origin}/{s_ub}"
        print("Stream URL:", stream_url)
        
        # Request stream URL with Apple UA & Referer
        r_stream = await client.get(stream_url, headers={"Referer": embed_url, "User-Agent": headers["User-Agent"]})
        print("Stream status:", r_stream.status_code)
        print("Is M3U8:", "#EXTM3U" in r_stream.text)
        print("Content preview:\n", r_stream.text[:400])

if __name__ == "__main__":
    asyncio.run(test_resolve("https://embed13.streamc.xyz/embed.php?hash=6bf9f67b5e05c373000947fbfa206743"))
