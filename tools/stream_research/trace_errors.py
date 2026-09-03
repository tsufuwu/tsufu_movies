import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Using a regular browser user agent to avoid cloudflare blocking!
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        page.on("console", lambda msg: print("CONSOLE:", msg.text))
        page.on("request", lambda req: print(f"REQ: {req.url}"))
        page.on("response", lambda res: print(f"RES: {res.status} {res.url}"))
        print("Loading page...")
        try:
            await page.goto("http://localhost:8000/api/stream/proxy?url=https://embed14.streamc.xyz/embed.php?hash=9a61b99db6f4a3ef0c45d2411d1fb2ed", wait_until="networkidle", timeout=30000)
        except Exception as e:
            print("Error/Timeout:", e)
        await asyncio.sleep(10)
        await browser.close()

asyncio.run(run())
