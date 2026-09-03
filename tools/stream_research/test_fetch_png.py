import urllib.request
req = urllib.request.Request('http://localhost:8000/api/stream/fetch?url=https://jps14.hihihoho4.top/9a61b99db6f4a3ef0c45d2411d1fb2ed/streamaaa0063.png')
try:
    resp = urllib.request.urlopen(req)
    print(resp.status, resp.headers.get('Content-Type'))
    data = resp.read()
    print("Len:", len(data))
except Exception as e:
    print(e)
