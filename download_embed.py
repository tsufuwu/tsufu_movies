import urllib.request
req = urllib.request.Request('https://embed14.streamc.xyz/embed.php?hash=9a61b99db6f4a3ef0c45d2411d1fb2ed', headers={'Referer': 'https://streamc.xyz/', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'})
html = urllib.request.urlopen(req).read().decode('utf-8')
print("Khởi tạo" in html)
with open("downloaded_embed.html", "w", encoding="utf-8") as f:
    f.write(html)
