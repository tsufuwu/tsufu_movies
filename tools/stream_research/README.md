# Công Cụ & Scripts Nghiên Cứu Video Stream (Stream Research Tools)

Thư mục này lưu trữ các công cụ, script thử nghiệm và tài liệu kỹ thuật được sử dụng trong quá trình phân tích, dịch ngược (reverse-engineering) và giải mã cơ chế phát video từ máy chủ `streamc.xyz` / `nguonc.com`.

> [!NOTE]
> Các script này phục vụ mục đích kiểm thử, nghiên cứu kỹ thuật và gỡ lỗi (debug) khi hệ thống cung cấp stream phía nguồn có sự thay đổi về cơ chế bảo vệ hoặc obfuscation. Chúng không ảnh hưởng trực tiếp đến mã nguồn runtime của ứng dụng.

---

## 📑 Danh Mục Scripts & Công Dụng Chi Tiết

| Tên File | Công Dụng Chi Tiết |
| :--- | :--- |
| `download_embed.py` | Tải về mã HTML gốc của trang iframe player từ link embed để phân tích các script nhúng và cấu trúc DOM. |
| `download_player.py` | Tải script `player.js` (script phát video đã bị làm rối/obfuscated từ `streamc.xyz`) kèm theo đúng headers Referer. |
| `test_fetch.py` | Thử nghiệm gửi HTTP GET request với header `Referer` và `User-Agent` mô phỏng trình duyệt để kiểm tra phản hồi từ streamc. |
| `test_fetch_png.py` | Kiểm tra khả năng tải ảnh/poster phim khi có cơ chế chống trộm băng thông (hotlink protection). |
| `test_m3u8.py` | Kiểm tra khả năng phân giải trực tiếp liên kết danh sách phát HLS (`.m3u8`) từ embed URL. |
| `test_m3u8_no_redir.py` | Kiểm tra phản hồi HTTP redirect (302/301) khi yêu cầu file `.m3u8`, nhằm bắt chính xác link đích cuối cùng. |
| `test_referer.py` | Kiểm tra điều kiện header `Referer` cần thiết để máy chủ video không trả về mã lỗi 403 Forbidden. |
| `test_ts_referer.py` | Kiểm tra tính hợp lệ khi tải từng phân đoạn video `.ts` (video chunks) trong luồng phát HLS. |
| `test_regex.py` | Thử nghiệm các mẫu biểu thức chính quy (Regex patterns) dùng trong `backend/services/embed_extractor.py` để trích xuất link m3u8 từ thẻ `<script>`. |
| `test_worker.py` | Thử nghiệm cấu hình Cloudflare Worker làm trạm proxy trung gian để chuyển tiếp luồng phát m3u8. |
| `trace_network.py` | Sử dụng Playwright (Chromium headless) để lắng nghe toàn bộ các request mạng khi player chạy, tìm ra request chứa m3u8 URL thực sự. |
| `trace_errors.py` | Lắng nghe console log và các lỗi JavaScript phát sinh khi tải trang embed trong môi trường headless. |
| `trace_errors2.py` | Phiên bản nâng cao của script trace để theo dõi luồng giải mã Crypto Subtle / AES-CBC bên trong player. |

---

## 🔑 Những Phát Hiện Kỹ Thuật Quan Trọng Đã Được Áp Dụng Vào Backend

1. **Cơ chế mã hóa m3u8 của StreamC:**
   - StreamC sử dụng thư viện JWPlayer kết hợp với script `player.js` riêng. Link m3u8 thường được mã hóa bằng AES-CBC thông qua API `window.crypto.subtle` của trình duyệt.
   - Do đó, backend sử dụng giải pháp kép (`backend/services/embed_extractor.py`):
     - Bước 1: Thử trích xuất link trực tiếp bằng Regex (nếu có dạng m3u8 plaintext).
     - Bước 2: Nếu bị mã hóa, hệ thống sử dụng endpoint `/api/stream/proxy` để làm sạch HTML, loại bỏ các script quảng cáo pop-up độc hại, và trả về cho frontend hiển thị an toàn trong iframe có thuộc tính `sandbox`.

2. **Yêu cầu Referer Header:**
   - Máy chủ video từ chối mọi request không có header `Referer: https://streamc.xyz/`.
   - Endpoint `/api/stream/fetch` trong backend được xây dựng để proxy các request cần thiết và gắn đúng header này.
