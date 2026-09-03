import sys
import os
import urllib.parse
sys.path.insert(0, os.path.abspath("backend"))

from main import app
from fastapi.testclient import TestClient

client = TestClient(app)

def test_stream_flow():
    # 1. Initialize a session first
    session_res = client.post("/api/v1/session/init")
    assert session_res.status_code == 200
    token = session_res.json().get("session_token")
    headers = {"x-session-token": token}

    # 2. Test direct .m3u8 resolve
    direct_m3u8 = "https://cdn.example.com/hls/sample.m3u8?token=xyz"
    direct_res = client.get(f"/api/stream/resolve?url={urllib.parse.quote(direct_m3u8)}", headers=headers)
    assert direct_res.status_code == 200
    direct_data = direct_res.json()
    assert direct_data["source"] == "m3u8"
    assert "/api/stream/playlist.m3u8" in direct_data["m3u8"]
    print("Direct M3U8 resolution test PASSED!")

    # 3. Call /api/stream/resolve with an embed URL
    embed_url = "https://embed13.streamc.xyz/embed.php?hash=6bf9f67b5e05c373000947fbfa206743"
    resolve_res = client.get(f"/api/stream/resolve?url={urllib.parse.quote(embed_url)}", headers=headers)
    assert resolve_res.status_code == 200
    data = resolve_res.json()
    assert data["source"] == "m3u8"
    assert data["m3u8"] is not None
    assert "/api/stream/playlist.m3u8" in data["m3u8"]
    print("Embed resolution to M3U8 test PASSED!")

    # 4. Call the generated /api/stream/playlist.m3u8 endpoint
    playlist_url = data["m3u8"]
    playlist_res = client.get(playlist_url, headers=headers)
    assert playlist_res.status_code == 200
    assert playlist_res.headers.get("access-control-allow-origin") == "*"
    assert "application/vnd.apple.mpegurl" in playlist_res.headers.get("content-type", "")
    assert "#EXTM3U" in playlist_res.text
    assert "/api/stream/segment?url=" in playlist_res.text
    print("Playlist rewrite and CORS test PASSED!")

    # Extract first segment URL
    lines = playlist_res.text.splitlines()
    segment_lines = [l for l in lines if "/api/stream/segment?url=" in l]
    assert len(segment_lines) > 0
    first_segment = segment_lines[0]

    # 5. Call /api/stream/segment with Range header (206 Partial Content)
    range_headers = {**headers, "Range": "bytes=0-1023"}
    seg_res = client.get(first_segment, headers=range_headers)
    assert seg_res.status_code == 206
    assert seg_res.headers.get("access-control-allow-origin") == "*"
    assert len(seg_res.content) == 1024
    print(f"Segment Range streaming (206) test PASSED! (Bytes: {len(seg_res.content)})")

    # 6. Call /api/stream/segment without Range header (200 OK Full Stream)
    full_seg_res = client.get(first_segment, headers=headers)
    assert full_seg_res.status_code == 200
    assert full_seg_res.headers.get("access-control-allow-origin") == "*"
    assert len(full_seg_res.content) > 500000
    print(f"Segment Full streaming (200) test PASSED! (Bytes: {len(full_seg_res.content)})")

    print("\nALL INTEGRATION STREAMING TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    test_stream_flow()
