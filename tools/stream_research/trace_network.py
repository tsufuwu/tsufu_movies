import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        page.on("request", lambda request: print(">>", request.method, request.url))
        page.on("response", lambda response: print("<<", response.status, response.url))

        print("Navigating to proxy page...")
        try:
            await page.goto("http://localhost:8000/api/stream/proxy?url=https://embed14.streamc.xyz/embed.php?hash=9a61b99db6f4a3ef0c45d2411d1fb2ed", wait_until="networkidle", timeout=15000)
        except Exception as e:
            print("Error navigating:", e)
        
        await asyncio.sleep(5)
        await browser.close()

asyncio.run(run())
