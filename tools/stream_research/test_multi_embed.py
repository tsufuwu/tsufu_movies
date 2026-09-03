import asyncio
import httpx
import re
import json
import base64

EMBED_URLS = [
    "https://embed13.streamc.xyz/embed.php?hash=6bf9f67b5e05c373000947fbfa206743",
    "https://embed12.streamc.xyz/embed.php?hash=f8faa60075badb799a962307375979c3",
    "https://embed18.streamc.xyz/embed.php?hash=1b9faa6b80b2a01c60acba0dd7a5ec0b",
    "https://embed2.streamc.xyz/embed.php?hash=05fddf41f4d938ce328d7a88710e3a4d",
    "https://embed11.streamc.xyz/embed.php?hash=d6c033e2ac8b0af99b227e6d74f0aff9",
]

async def check(embed_url):
    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Referer": embed_url,
    }
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            r = await client.get(embed_url, headers=headers)
            match = re.search(r'data-obf=["\']([A-Za-z0-9+/=]+)["\']', r.text)
            if not match:
                print(f"FAILED: No data-obf for {embed_url}")
                return
            outer = json.loads(base64.b64decode(match.group(1)).decode("utf-8"))
            s_ub = outer.get("sUb")
            origin = "/".join(embed_url.split("/")[:3])
            stream_url = f"{origin}/{s_ub}"
            r_stream = await client.get(stream_url, headers={"Referer": embed_url, "User-Agent": headers["User-Agent"]})
            is_m3u8 = "#EXTM3U" in r_stream.text
            print(f"SUCCESS={is_m3u8} for {embed_url} (status={r_stream.status_code}, len={len(r_stream.text)})")
    except Exception as e:
        print(f"ERROR for {embed_url}: {e}")

async def main():
    for url in EMBED_URLS:
        await check(url)

if __name__ == "__main__":
    asyncio.run(main())
