import urllib.request
req = urllib.request.Request('https://streamc.xyz/player.js?ver=2.1', headers={'Referer': 'https://streamc.xyz/', 'User-Agent': 'Mozilla/5.0'})
with open('player.js', 'wb') as f:
    f.write(urllib.request.urlopen(req).read())
