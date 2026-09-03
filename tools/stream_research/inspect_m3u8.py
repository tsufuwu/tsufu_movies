import asyncio
import httpx
import re
import json
import base64

async def inspect():
    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Referer": "https://embed13.streamc.xyz/embed.php?hash=6bf9f67b5e05c373000947fbfa206743",
    }
    async with httpx.AsyncClient() as client:
        r = await client.get("https://embed13.streamc.xyz/embed.php?hash=6bf9f67b5e05c373000947fbfa206743", headers=headers)
        match = re.search(r'data-obf=["\']([A-Za-z0-9+/=]+)["\']', r.text)
        outer = json.loads(base64.b64decode(match.group(1)).decode("utf-8"))
        stream_url = "https://embed13.streamc.xyz/" + outer["sUb"]
        r_stream = await client.get(stream_url, headers=headers)
        lines = r_stream.text.splitlines()
        print("Total lines:", len(lines))
        print("First 20 lines:\n" + "\n".join(lines[:20]))
        key_lines = [l for l in lines if "KEY" in l or "STREAM-INF" in l or "MEDIA" in l]
        print("Key / Stream-inf / Media lines:", key_lines)
        last_lines = [l for l in lines[-10:]]
        print("Last 10 lines:\n" + "\n".join(last_lines))

if __name__ == "__main__":
    asyncio.run(inspect())
