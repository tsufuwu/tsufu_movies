"""
HLS M3U8 Playlist Parsing and Rewriting Engine.

Chuẩn hóa và viết lại (rewrite) toàn bộ URI trong danh sách phát HLS:
- Master Playlist (chứa sub-playlists / variant streams độ phân giải khác nhau).
- Media Playlist (chứa các video segments: .ts, .png disguised, .m4s, .mp4...).
- Alternate Media Tracks (#EXT-X-MEDIA:TYPE=AUDIO/SUBTITLES).
- Encryption Keys (#EXT-X-KEY:METHOD=AES-128,URI="...").
- Initialization Maps (#EXT-X-MAP:URI="...").
- Bảo toàn 100% query parameters (token, TTL, expires).
- Chuẩn hóa chính xác đường dẫn relative, root-relative và absolute qua urllib.parse.urljoin.
"""
import re
import urllib.parse


def is_master_playlist(content: str) -> bool:
    """Kiểm tra xem nội dung m3u8 có phải là Master Playlist hay không."""
    return "#EXT-X-STREAM-INF" in content or "#EXT-X-I-FRAME-STREAM-INF" in content


def rewrite_m3u8_playlist(
    content: str,
    playlist_url: str,
    referer: str | None = None,
    playlist_endpoint: str = "/api/stream/playlist.m3u8",
    segment_endpoint: str = "/api/stream/segment",
) -> str:
    """
    Phân tích và viết lại toàn bộ đường dẫn trong file m3u8 để đi qua proxy backend.

    Args:
        content: Nội dung thô của file .m3u8 tải từ upstream.
        playlist_url: URL tuyệt đối của file .m3u8 vừa tải (dùng làm base URL cho urljoin).
        referer: Header Referer cần thiết của embed host (để forward khi client gọi segment).
        playlist_endpoint: Đường dẫn nội bộ cho sub-playlist proxy.
        segment_endpoint: Đường dẫn nội bộ cho media segment proxy.

    Returns:
        Nội dung m3u8 đã được viết lại hoàn chỉnh.
    """
    if not content:
        return ""

    ref_param = f"&ref={urllib.parse.quote(referer, safe='')}" if referer else ""

    lines = content.splitlines()
    rewritten_lines: list[str] = []

    # Cờ đánh dấu nếu dòng trước là #EXT-X-STREAM-INF (chỉ thị dòng kế tiếp là sub-playlist URI)
    next_is_sub_playlist = False

    for line in lines:
        stripped = line.strip()

        # Giữ nguyên dòng trống
        if not stripped:
            rewritten_lines.append(line)
            continue

        # ── 1. Dòng comment / HLS Tag (bắt đầu bằng #) ──────────────────────
        if stripped.startswith("#"):
            # Master playlist stream indicator
            if stripped.startswith("#EXT-X-STREAM-INF") or stripped.startswith("#EXT-X-I-FRAME-STREAM-INF"):
                next_is_sub_playlist = True
                rewritten_lines.append(line)
                continue

            # Tag chứa URI mã hóa key: #EXT-X-KEY:METHOD=...,URI="..."
            if stripped.startswith("#EXT-X-KEY:"):
                rewritten_line = _rewrite_tag_uri(
                    line,
                    playlist_url,
                    ref_param,
                    segment_endpoint,
                )
                rewritten_lines.append(rewritten_line)
                continue

            # Tag chứa URI media phụ: #EXT-X-MEDIA:TYPE=AUDIO/SUBTITLES...URI="..."
            if stripped.startswith("#EXT-X-MEDIA:"):
                # Media URI có thể là playlist m3u8 phụ (audio/subtitles)
                rewritten_line = _rewrite_tag_uri(
                    line,
                    playlist_url,
                    ref_param,
                    playlist_endpoint,
                )
                rewritten_lines.append(rewritten_line)
                continue

            # Tag chứa URI khởi tạo mp4: #EXT-X-MAP:URI="..."
            if stripped.startswith("#EXT-X-MAP:"):
                rewritten_line = _rewrite_tag_uri(
                    line,
                    playlist_url,
                    ref_param,
                    segment_endpoint,
                )
                rewritten_lines.append(rewritten_line)
                continue

            # Các tag khác giữ nguyên
            rewritten_lines.append(line)
            continue

        # ── 2. Dòng URI (không bắt đầu bằng #) ──────────────────────────────
        # Chuẩn hóa đường dẫn tuyệt đối bằng urljoin (giữ nguyên query params)
        absolute_url = urllib.parse.urljoin(playlist_url, stripped)
        quoted_url = urllib.parse.quote(absolute_url, safe="")

        if next_is_sub_playlist or stripped.lower().endswith(".m3u8") or ".m3u8?" in stripped.lower():
            # Đây là Sub-Playlist (Variant stream của Master Playlist)
            rewritten_uri = f"{playlist_endpoint}?url={quoted_url}{ref_param}"
            next_is_sub_playlist = False
        else:
            # Đây là Video / Audio segment (.ts, .png, .m4s, .mp4, v.v.)
            rewritten_uri = f"{segment_endpoint}?url={quoted_url}{ref_param}"

        rewritten_lines.append(rewritten_uri)

    # Đảm bảo kết thúc bằng newline theo chuẩn HLS
    return "\n".join(rewritten_lines) + "\n"


def _rewrite_tag_uri(
    tag_line: str,
    base_url: str,
    ref_param: str,
    endpoint: str,
) -> str:
    """
    Tìm và thay thế thuộc tính URI="..." trong các tag HLS như #EXT-X-KEY, #EXT-X-MEDIA, #EXT-X-MAP.
    """
    def _replace_match(match: re.Match) -> str:
        raw_uri = match.group(1)
        abs_uri = urllib.parse.urljoin(base_url, raw_uri)
        quoted_uri = urllib.parse.quote(abs_uri, safe="")
        new_uri = f"{endpoint}?url={quoted_uri}{ref_param}"
        return f'URI="{new_uri}"'

    # Regex tìm URI="<giá trị>"
    return re.sub(r'URI=["\']([^"\']+)["\']', _replace_match, tag_line)
