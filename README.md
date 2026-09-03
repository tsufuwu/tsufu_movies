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

---

## ⚡ Kiến Trúc Caching Đa Tầng & Giới Hạn Tần Suất (Performance, Multi-tier Caching & Rate Limiting)

Hệ thống được thiết kế theo kiến trúc **3 tầng Caching (Multi-tier Caching)** và **2 vùng Rate Limiting** khép kín từ mép mạng (Edge/Proxy) tới máy chủ ứng dụng và trình duyệt:

```
[ Client / Trình duyệt ]
  │
  ├── 1. Client Cache (sessionStorage - TTL 3-5m) ──> Phản hồi 0ms khi Back/Forward/Chuyển tab
  ├── 2. Watch History (localStorage) ─────────────> Lưu timestamp phát video & Resume tự động
  │
  ▼  (HTTP GET /api/...)
┌───────────────────────────────────────────────────────────────────────────────┐
│ NGINX REVERSE PROXY (Tầng 1: Edge Caching & Rate Limiting)                   │
│                                                                               │
│  ├── Rate Limit Zone 'api_limit': 10 req/s (burst=20 nodelay)                 │
│  ├── Rate Limit Zone 'search_limit': 2 req/s (burst=5 nodelay) cho /search    │
│  └── Fast Micro-caching (keys_zone=api_cache, 5m-10m TTL)                     │
│        - HIT: Trả lời tức thì từ Nginx cache RAM/Disk (X-Cache-Status: HIT)   │
│        - BYPASS: Luồng video (/api/stream/) & Handshake (/session/init)       │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │ (Chỉ MISS mới gọi qua Docker network)
                                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│ FASTAPI BACKEND (Tầng 2: Dual-Mode Cache Engine)                              │
│                                                                               │
│  ├── Dual-Mode Switch:                                                        │
│  │     - REDIS_URL có cấu hình ──> Dùng redis.asyncio (Distributed Cache)    │
│  │     - REDIS_URL trống/lỗi    ──> Tự động fallback về cachetools.TTLCache  │
│  │                                                                           │
│  ├── Ephemeral Session Store: Lưu token & IP dải mạng với TTL 4 tiếng         │
│  ├── Crawl Cache: Danh sách phim (15 phút), Chi tiết phim (30 phút)           │
│  └── Stream Resolve Cache: Kết quả giải mã m3u8 (10 phút, cấp fresh HMAC)    │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │ (Chỉ khi Backend cache hết hạn)
                                       ▼
                 [ Upstream APIs: NguonC & StreamC Servers ]
```

### 1. Nginx Hardening & Fast Micro-caching (frontend/default.conf.template)
- **Rate Limiting 2 cấp độ**:
  - `limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;`: Giới hạn toàn bộ `/api/` ở mức 10 req/s (burst 20), ngăn chặn bot spam API làm sập server.
  - `limit_req_zone $binary_remote_addr zone=search_limit:10m rate=2r/s;`: Giới hạn riêng cho endpoint `/api/movies/search` ở mức 2 req/s (burst 5), bảo vệ cơ sở dữ liệu và upstream API khỏi các đợt tấn công vét từ khóa.
- **Nginx Fast Micro-caching (`api_cache`)**:
  - Cache vùng nhớ `10m` và dung lượng lưu trữ đĩa tối đa `100m`.
  - Cache các request `GET` dữ liệu danh sách/chi tiết phim (`proxy_cache_valid 200 5m;`).
  - Sử dụng chỉ thị `map` thông minh để tự động **BYPASS và KHÔNG CACHE** đối với:
    - Luồng giải mã và phát video `/api/stream/`
    - Handshake phiên làm việc `/api/v1/session/`
    - Khi trình duyệt gửi `Cache-Control: no-cache`
  - Đính kèm header `X-Cache-Status` (`HIT`, `MISS`, `BYPASS`) hỗ trợ quan sát và debug.
- **Tối ưu Video Streaming**:
  - Tắt hoàn toàn buffering và cache (`proxy_buffering off; proxy_cache off;`) cho location `/api/stream/` giúp truyền phát video m3u8/HLS và chunked streaming mượt mà, độ trễ thấp nhất.

### 2. Backend Dual-Mode Caching (FastAPI: Redis & TTLCache Fallback)
- **Module trung gian ([backend/services/cache.py](backend/services/cache.py))**:
  - **Chế độ Redis (Async)**: Kết nối tới cụm Redis qua `redis.asyncio` với timeout 2.0s, tự động reconnect và serialization bằng `pickle` bảo toàn kiểu dữ liệu Pydantic.
  - **Chế độ In-Memory Fallback (`cachetools.TTLCache`)**: Khi không cấu hình `REDIS_URL` hoặc khi Redis gặp sự cố, hệ thống tự động chuyển sang bộ nhớ RAM cục bộ với cơ chế thu hồi LRU (tối đa 5.000 items) mà **không làm crash bất kỳ request nào của người dùng**.
- **Quản lý Session Token**:
  - Mỗi token sinh ra từ `/api/v1/session/init` được lưu vào cache với TTL (`SESSION_TTL = 14400s` - 4 tiếng).
  - Hàm `verify_session_active` kiểm tra sự tồn tại của token trong cache; nếu cache vừa restart, hàm sẽ fallback giải mã chữ ký HMAC và tự động tái nạp token vào cache.
- **Cache Dữ liệu API ngoài & Bóc tách Stream**:
  - Danh sách phim: TTL 15 phút (`CACHE_TTL_LIST = 900s`).
  - Chi tiết phim: TTL 30 phút (`CACHE_TTL_DETAIL = 1800s`).
  - Kết quả tìm kiếm: TTL 5 phút (`CACHE_TTL_SEARCH = 300s`).
  - Kết quả giải mã Stream m3u8: TTL 10 phút (`CACHE_TTL_STREAM = 600s`), đồng thời sinh chữ ký HMAC mới có hạn dùng cho mỗi lượt xem.
- **Giám sát sức khỏe (`/api/health`)**:
  - Trả về trường `cache_backend` (`redis` hoặc `in-memory-ttl`) giúp quản trị viên nắm bắt tức thời loại cache backend đang vận hành.

### 3. Frontend Client-side Caching & State Management (React + Vite)
- **Handshake Tự động ([frontend/src/hooks/useSession.js](frontend/src/hooks/useSession.js))**:
  - Tự động bắt tay handshake lấy token khi ứng dụng khởi chạy (`App.jsx`).
  - Lưu token trong `sessionStorage` (`tsufu_session_token`) và bộ nhớ, đính kèm header `X-Session-Token` vào mọi yêu cầu HTTP; tự động retry nếu gặp lỗi `401`.
- **Client Cache Chống Spam ([frontend/src/utils/clientCache.js](frontend/src/utils/clientCache.js))**:
  - Lưu trữ kết quả gọi API phim vào `sessionStorage` (hoặc `Map` in-memory fallback) với TTL riêng biệt (1 - 5 phút).
  - Khi người dùng điều hướng tiến/lùi (Back/Forward) hoặc chuyển đổi tab giữa các trang, dữ liệu hiển thị tức thì (0ms) mà không gửi request lặp lại lên máy chủ.
- **Lịch sử & Tiến độ phát Video ([frontend/src/utils/watchHistory.js](frontend/src/utils/watchHistory.js))**:
  - Lưu trữ danh sách phim đã xem, tập phim và timestamp hiện tại vào `localStorage` (`tsufu_watch_history`) theo nguyên tắc Client-First (không spam API server).
  - Tự động throttling (ghi tối đa 1 lần mỗi 3 giây trong lúc video đang phát).
  - Tự động tiếp tục phát video (Auto-resume) từ vị trí đang xem dở trên [SmartVideoPlayer.jsx](frontend/src/components/SmartVideoPlayer.jsx) kèm nút tùy chọn *"Xem từ đầu"*.
  - Hiển thị hàng phim **"Tiếp tục xem"** trực quan trên Trang chủ ([ContinueWatchingRow.jsx](frontend/src/components/ContinueWatchingRow.jsx)) với thanh tiến độ % thời lượng đã xem và nút xóa nhanh khỏi lịch sử.

---

### Bảng biến môi trường Caching & Redis (`backend/.env`)

| Biến môi trường | Mặc định | Ý nghĩa & Khuyến nghị |
| :--- | :--- | :--- |
| `REDIS_URL` | *(None / Trống)* | Địa chỉ kết nối Redis (vd: `redis://redis:6379/0`). Nếu để trống sẽ dùng in-memory TTLCache. |
| `CACHE_TTL_LIST` | `900` (15 phút) | Thời gian cache danh sách phim mới, phim lẻ, phim bộ, hoạt hình (giây). |
| `CACHE_TTL_DETAIL` | `1800` (30 phút) | Thời gian cache chi tiết thông tin bộ phim và danh sách tập (giây). |
| `CACHE_TTL_SEARCH` | `300` (5 phút) | Thời gian cache kết quả tìm kiếm phim (giây). |
| `CACHE_TTL_STREAM` | `600` (10 phút) | Thời gian cache kết quả bóc tách/giải mã luồng stream video (giây). |

---

### Khởi chạy Docker Compose với Redis & Nginx Cache

Cấu hình trong `docker-compose.yml` đã được định nghĩa sẵn sàng bao gồm cả service Redis và các volume cache:

```bash
# Khởi động toàn bộ cụm dịch vụ (Frontend, Backend, Redis)
docker-compose up -d --build

# Xem logs kiểm tra kết nối cache
docker logs -f appphim_backend
```

Khi chạy qua Docker Compose:
- **`appphim_redis`**: Chạy phiên bản `redis:7-alpine`, giới hạn RAM `128mb`, chính sách thu hồi `allkeys-lru`, dữ liệu lưu bền vững trong volume `redis-data`.
- **`nginx-cache`**: Volume mount tại `/var/cache/nginx` giúp dữ liệu micro-cache của Nginx không bị mất khi restart container Frontend.

