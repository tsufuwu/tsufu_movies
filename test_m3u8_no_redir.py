import urllib.request
req = urllib.request.Request('https://embed14.streamc.xyz/eyJoIjoiOWE2MWI5OWRiNmY0YTNlZjBjNDVkMjQxMWQxZmIyZWQiLCJ0IjoiZWI0YTk0MTdhNWI0YWI0MzNmYmJjOTU2ZDkxODU5Yzk2Yzg4NDE4MWRkZTMyN2U3MTdkYzViYjAyMGRkMTVmMyJ9?d=1', headers={'Referer': 'https://streamc.xyz/', 'User-Agent': 'Mozilla/5.0'})
class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None
opener = urllib.request.build_opener(NoRedirectHandler)
try:
    resp = opener.open(req)
    print(resp.status, resp.headers.get('Location'))
except urllib.error.HTTPError as e:
    print(e.code, e.headers.get('Location'))
