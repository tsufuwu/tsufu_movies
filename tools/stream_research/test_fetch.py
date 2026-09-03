import urllib.request
try:
    resp = urllib.request.urlopen('http://localhost:8000/api/stream/fetch?url=https://embed14.streamc.xyz/eyJoIjoiOWE2MWI5OWRiNmY0YTNlZjBjNDVkMjQxMWQxZmIyZWQiLCJ0IjoiZWI0YTk0MTdhNWI0YWI0MzNmYmJjOTU2ZDkxODU5Yzk2Yzg4NDE4MWRkZTMyN2U3MTdkYzViYjAyMGRkMTVmMyJ9?d=1')
    print(resp.status, resp.headers)
except urllib.error.HTTPError as e:
    print(e.code, e.headers)
