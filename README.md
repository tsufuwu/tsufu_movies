# App Phim

App Phim là một nền tảng web xem phim trực tuyến hiện đại với kiến trúc tách biệt hoàn toàn giữa giao diện người dùng và máy chủ xử lý dữ liệu.

## Kiến trúc hệ thống

Dự án này áp dụng mô hình **Microservices cơ bản**, bao gồm 2 phần chính:

### 1. Frontend (Giao diện)
- **Công nghệ**: React, Vite
- **Nhiệm vụ**: Hiển thị danh sách phim, chi tiết phim, và giao diện trình phát video (Video Player). Giao tiếp với Backend qua REST API.
- **Thư mục**: `/frontend`

### 2. Backend (Máy chủ xử lý)
- **Công nghệ**: Python, FastAPI
- **Nhiệm vụ**: 
  - Lấy dữ liệu phim từ các nguồn (API) bên ngoài.
  - Phân giải luồng video (stream resolution).
  - Hoạt động như một proxy trung gian để loại bỏ quảng cáo, vượt qua các rào cản CORS và trả về mã HTML sạch cho trình duyệt web.
- **Thư mục**: `/backend`

---

## Hướng dẫn cài đặt (Local Development)

### Cách 1: Chạy bằng Docker (Khuyến nghị)
Cách dễ nhất để khởi động toàn bộ hệ thống (cả Frontend và Backend) ở local là sử dụng Docker Compose.

**Bước chuẩn bị (Môi trường)**:
1. Vào thư mục `/backend` và copy file `.env.example` thành `.env`.
2. Vào thư mục `/frontend` và copy file `.env.example` thành `.env`.
*(Bạn có thể tùy chỉnh lại các biến môi trường trong file `.env` nếu cần thiết).*

1. Mở terminal tại thư mục gốc dự án.
2. Chạy lệnh:
   ```bash
   docker-compose up -d --build
   ```
> 📖 **Xem thêm tài liệu chi tiết:** [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) mô tả toàn bộ kiến trúc, sơ đồ mạng, vai trò từng file và các cảnh báo an toàn tránh gây lỗi hệ thống.

3. Sau khi quá trình build hoàn tất:
   - **Web Frontend (Nginx Reverse Proxy):** `http://localhost:80` (hoặc cổng cấu hình qua `APP_PORT`)
   - **API Backend:** Được bảo vệ an toàn trong mạng nội bộ Docker (`app-net`), không publish port ra ngoài host. Trình duyệt gọi API qua Reverse Proxy: `http://localhost:80/api/...`

### Cách 2: Chạy thủ công từng dịch vụ

#### Chạy Backend
1. Mở terminal, di chuyển vào thư mục `/backend`.
2. Khởi tạo file biến môi trường (copy `.env.example` sang `.env`) và tùy chỉnh lại nếu cần.
3. Tạo môi trường ảo và cài đặt thư viện:
   ```bash
   python -m venv venv
   source venv/Scripts/activate  # (Trên Windows)
   # source venv/bin/activate    # (Trên Linux/Mac)
   pip install -r requirements.txt
   ```
3. Khởi động server FastAPI:
   ```bash
   python main.py
   ```
   Backend sẽ chạy tại: `http://localhost:8000`

#### Chạy Frontend
1. Mở một terminal khác, di chuyển vào thư mục `/frontend`.
2. Khởi tạo file biến môi trường (copy `.env.example` sang `.env`).
3. Cài đặt các gói thư viện Node:
   ```bash
   npm install
   ```
3. Khởi động môi trường phát triển Vite:
   ```bash
   npm run dev
   ```
   Frontend sẽ chạy tại cổng được Vite cung cấp (thường là `http://localhost:5173`).

---

## CI/CD Pipeline (Triển khai tự động)

Dự án sử dụng **GitHub Actions** để tự động hóa quá trình đóng gói (build) và triển khai (deploy).
Luồng CI/CD được thiết kế tách biệt để tối ưu hóa tài nguyên. 

### 1. Phân chia Workflow (Paths Filter)
- **`deploy-frontend.yml`**: Chỉ kích hoạt khi bạn commit code làm thay đổi các file trong thư mục `/frontend`.
- **`deploy-backend.yml`**: Chỉ kích hoạt khi bạn commit code làm thay đổi các file trong thư mục `/backend`.
*(Nếu commit của bạn thay đổi cả 2 thư mục, cả 2 workflow sẽ chạy song song).*

### 2. Cách đánh Version (Tagging)
Khi đẩy (push) code lên nhánh `main`, hệ thống sẽ tự động gán Tag cho Docker Image:
- **Đánh Tag theo Phiên bản**: Nếu bạn ghi nội dung commit có chứa đuôi version như `(v1.0.0)` hoặc `(1.2.3)`, hệ thống sẽ tự động dùng tag đó. Ví dụ: `git commit -m "Tính năng mới (v2.1.0)"`.
- **Đánh Tag Mặc định**: Nếu không tìm thấy cấu trúc version hợp lệ trong ngoặc đơn, hệ thống sẽ sử dụng **7 ký tự đầu tiên của mã Commit Hash** làm tag (VD: `d9a578a`).
- **Luôn có tag Latest**: Ở mọi lần build thành công, tag `latest` luôn được gán tự động.

### 3. Cơ chế Webhook
Sau khi quá trình Build và Push Image lên **Docker Hub** hoàn tất, GitHub Actions sẽ tự động thực hiện một lệnh `GET` (Webhook) đến Server của bạn thông qua URL bí mật (cấu hình trong `DEPLOY_HOOK_URL`). 
Khi nhận được request này, server của bạn có thể tự động chạy lệnh `docker compose pull && docker compose up -d` để tải ảnh mới về và cập nhật hệ thống.

---

## Cơ chế Bảo Mật (Security Hardening)

Hệ thống được trang bị **4 lớp bảo vệ** kết hợp giữa Backend FastAPI và Frontend React nhằm chống bot cào dữ liệu, chống leech băng thông phát video lậu và ngăn chặn spam API:

```
[ Trình duyệt / Client ]
         │
         ├── 1. Handshake Ephemeral Session (/api/v1/session/init) ──> Nhận HttpOnly Cookie / Header
         ├── 2. Bẫy Honeypot Input (Search Bot Trap) ────────────────> Drop request nếu bot điền input ẩn
         ├── 3. Kiểm tra Sec-Fetch-Site / Referer ───────────────────> Chặn hotlink / cross-site leech
         └── 4. Ký HMAC URL Stream (/api/stream/proxy?exp=..&sig=..) ──> Link video có hạn dùng, chống leech
```

### 1. Ephemeral Session Token (Phiên làm việc tạm thời không cần đăng nhập)
- **Cơ chế**: Khi người dùng vào web, Frontend tự động handshake với endpoint `GET /api/v1/session/init`. Backend tạo ra một session token nhẹ được ký bảo mật bằng HMAC-SHA256 gắn với dải mạng IP của client (`/16`) và thời gian hết hạn (`SESSION_TTL`, mặc định 4 tiếng).
- **Lưu trữ an toàn**: Token được đặt vào Cookie `HttpOnly; SameSite=Lax; Path=/` (và `Secure` nếu ở Production) kèm fallback header `X-Session-Token`.
- **Bảo vệ API**: Tất cả endpoint `/api/movies/*` và `/api/stream/*` đều yêu cầu session token hợp lệ thông qua dependency `require_session`. Nếu crawler hay script cào link gọi trực tiếp bằng `curl` mà không handshake, hệ thống sẽ trả về mã lỗi `401 Unauthorized`.
- **Tự động gia hạn (Transparent Auto-Retry)**: Frontend cài đặt interceptor tự động phát hiện mã `401`, gọi handshake lấy token mới và gửi lại request ngay lập tức mà không gây gián đoạn cho trải nghiệm người dùng.

### 2. Signed Stream URLs (Ký chữ ký HMAC chống leech băng thông video)
- **Cơ chế**: Khi phân giải luồng video tại `/api/stream/resolve`, Backend tạo chữ ký HMAC-SHA256 cho link video proxy kèm tham số hết hạn:
  `/api/stream/proxy?url=...&exp=<timestamp>&sig=<hmac_signature>`
- **Hiệu lực**: Link chỉ có thể phát được trong khoảng thời gian cấu hình (`STREAM_TOKEN_TTL`, mặc định 2 tiếng). Bất kỳ hành vi sửa đổi URL hoặc dùng link đã hết hạn đều bị từ chối với mã `403 Forbidden`.
- **Lợi ích**: Ngăn chặn kẻ xấu lấy link stream nhúng vào website khác để phát lậu vĩnh viễn hoặc chia sẻ tràn lan trên mạng xã hội.

### 3. Kiểm soát Referer, Origin & Fetch Metadata (`Sec-Fetch-Site`)
- **Chống nhúng lậu (Anti-hotlinking)**: Backend kiểm tra header `Sec-Fetch-Site` từ trình duyệt. Nếu phát hiện request có nguồn gốc từ trang web thứ ba (`Sec-Fetch-Site: cross-site`), request sẽ bị chặn lập tức (`403 Forbidden`).
- **Xác thực Origin/Referer**: Các endpoint proxy video (`/api/stream/proxy`, `/api/stream/fetch`) xác thực máy chủ gọi đến phải trùng khớp với danh sách `CORS_ORIGINS` hoặc domain của ứng dụng.

### 4. Bẫy Bot Honeypot (Anti-Bot Honeypot)
- **Cơ chế**: Form tìm kiếm phim được nhúng một trường nhập liệu ẩn (off-screen input, `tabindex="-1"`, `autocomplete="off"`).
- **Nguyên lý**: Người dùng thật duyệt web trên trình duyệt sẽ không nhìn thấy và không nhập trường này. Tuy nhiên, các bot cào dữ liệu hoặc crawler tự động quét DOM thường sẽ điền vào tất cả các ô `<input>`.
- **Phản hồi**: Khi Backend nhận thấy tham số honeypot (`_hp` hoặc `website`) có dữ liệu, hệ thống tự động nhận diện là Bot và lập tức trả về kết quả rỗng (0 phim) mà không tiêu tốn tài nguyên gọi sang API nguồn NguonC.

### Bảng cấu hình biến môi trường bảo mật (`backend/.env`)

Bạn có thể dễ dàng bật/tắt linh hoạt các cơ chế bảo mật trên bằng cách chỉnh sửa file `.env` của Backend:

| Biến môi trường | Mặc định | Mô tả chức năng |
| :--- | :--- | :--- |
| `SESSION_SECRET` | *(chuỗi ngẫu nhiên)* | Khóa bí mật dùng để sinh và kiểm tra chữ ký HMAC của Session Token |
| `SESSION_TTL` | `14400` (4 tiếng) | Thời gian hiệu lực của Session Token (giây) |
| `ENABLE_SESSION_CHECK` | `true` | Bật/tắt bắt buộc kiểm tra Session Token cho các API (`true`/`false`) |
| `STREAM_SECRET_KEY` | *(chuỗi ngẫu nhiên)* | Khóa bí mật dùng để ký chữ ký HMAC cho URL phát video |
| `STREAM_TOKEN_TTL` | `7200` (2 tiếng) | Thời gian hết hạn của link phát video đã ký (giây) |
| `ENABLE_STREAM_SIGNATURE` | `true` | Bật/tắt ký HMAC cho link stream proxy (`true`/`false`) |
| `ENFORCE_REFERER_CHECK` | `true` | Bật/tắt kiểm tra `Sec-Fetch-Site` và Referer chống nhúng lậu (`true`/`false`) |
| `ENABLE_HONEYPOT` | `true` | Bật/tắt bẫy bot honeypot trong tìm kiếm (`true`/`false`) |

