import sys
import os
sys.path.insert(0, os.path.abspath("backend"))

from services.hls_rewriter import rewrite_m3u8_playlist, is_master_playlist

def test_rewriter():
    # 1. Master Playlist Test
    master_content = """#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
360p/video.m3u8?token=abc
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=1280x720
/720p/video.m3u8?token=xyz
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Vietnamese",DEFAULT=YES,URI="audio/vi.m3u8"
"""
    assert is_master_playlist(master_content) is True

    base_url = "https://cdn.example.com/hls/master.m3u8"
    referer = "https://embed13.streamc.xyz/embed.php?hash=abc"
    rewritten_master = rewrite_m3u8_playlist(master_content, base_url, referer)
    print("--- REWRITTEN MASTER PLAYLIST ---")
    print(rewritten_master)

    assert "/api/stream/playlist.m3u8?url=https%3A%2F%2Fcdn.example.com%2Fhls%2F360p%2Fvideo.m3u8%3Ftoken%3Dabc" in rewritten_master
    assert "/api/stream/playlist.m3u8?url=https%3A%2F%2Fcdn.example.com%2F720p%2Fvideo.m3u8%3Ftoken%3Dxyz" in rewritten_master
    assert 'URI="/api/stream/playlist.m3u8?url=https%3A%2F%2Fcdn.example.com%2Fhls%2Faudio%2Fvi.m3u8' in rewritten_master

    # 2. Media Playlist Test
    media_content = """#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:8
#EXT-X-KEY:METHOD=AES-128,URI="key.bin?auth=token123"
#EXTINF:8.0,
chunk_001.ts?auth=token123&exp=9999
#EXTINF:8.0,
/root_relative/chunk_002.ts
#EXTINF:8.0,
https://cdn-other.top/stream/chunk_003.png
#EXT-X-ENDLIST
"""
    assert is_master_playlist(media_content) is False

    rewritten_media = rewrite_m3u8_playlist(media_content, "https://cdn.example.com/hls/360p/video.m3u8", referer)
    print("--- REWRITTEN MEDIA PLAYLIST ---")
    print(rewritten_media)

    assert 'URI="/api/stream/segment?url=https%3A%2F%2Fcdn.example.com%2Fhls%2F360p%2Fkey.bin%3Fauth%3Dtoken123' in rewritten_media
    assert "/api/stream/segment?url=https%3A%2F%2Fcdn.example.com%2Fhls%2F360p%2Fchunk_001.ts%3Fauth%3Dtoken123%26exp%3D9999" in rewritten_media
    assert "/api/stream/segment?url=https%3A%2F%2Fcdn.example.com%2Froot_relative%2Fchunk_002.ts" in rewritten_media
    assert "/api/stream/segment?url=https%3A%2F%2Fcdn-other.top%2Fstream%2Fchunk_003.png" in rewritten_media

    print("\nALL REWRITER TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_rewriter()
