import urllib.request
req = urllib.request.Request('https://embed14.streamc.xyz/player.js?ver=2.1', headers={'Referer': 'http://localhost:8000/', 'User-Agent': 'Mozilla/5.0'})
try:
    resp = urllib.request.urlopen(req)
    print(resp.status, resp.headers['Content-Type'])
except Exception as e:
    print(e)
