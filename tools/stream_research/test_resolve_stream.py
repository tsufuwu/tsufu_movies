import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath("backend"))
from services.embed_extractor import resolve_stream

async def test():
    embed_url = "https://embed13.streamc.xyz/embed.php?hash=6bf9f67b5e05c373000947fbfa206743"
    res = await resolve_stream(embed_url)
    print("Resolved stream:", res)
    assert res["source"] == "m3u8"
    assert res["m3u8"] is not None
    print("TEST PASSED: resolve_stream extracted clean m3u8 successfully!")

if __name__ == "__main__":
    asyncio.run(test())
