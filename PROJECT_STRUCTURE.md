# 📚 Tài Liệu Cấu Trúc Toàn Diện Repository (Project Structure & System Architecture)

> **Mục đích tài liệu:** Mô tả chi tiết kiến trúc, sơ đồ mạng, vai trò của từng file/thư mục trong dự án `tsufu_movies` (App Phim). Tài liệu này đóng vai trò kim chỉ nam nhằm giúp nhà phát triển nắm vững hệ thống, bảo trì an toàn và **tránh việc sơ xuất sửa/xóa các file cốt lõi gây lỗi hệ thống**.

---

## 1. 🏗️ Tổng Quan Kiến Trúc Hệ Thống (High-Level Architecture)

Ứng dụng được thiết kế theo mô hình **Single-Entry Reverse Proxy** với hai tầng dịch vụ chính kết nối qua mạng nội bộ Docker:

```
[ Trình duyệt Client ]
         │ (HTTP :80 hoặc $APP_PORT)
         ▼
┌───────────────────────────────────────────────────────────────┐
│ Container: appphim_frontend (Nginx :80)                       │
│                                                               │
│  ├── location /     ──> Phục vụ React SPA tĩnh (index.html)   │
│  └── location /api/ ──> Reverse Proxy sang Backend            │
└───────────────────────────────┬───────────────────────────────┘
                                │ (Mạng nội bộ: app-net)
                                ▼
┌───────────────────────────────────────────────────────────────┐
│ Container: appphim_backend (FastAPI :8000 - KHÔNG mở port ngoài)│
│                                                               │
│  ├── /api/movies/*  ──> Gọi NguonC API + In-memory Cache TTL  │
│  ├── /api/stream/*  ──> Giải mã m3u8, Bypass Ads & Proxy HTML │
│  └── /api/health    ──> Health check giám sát hệ thống        │
└─────────────────┬─────────────────────────────┬───────────────┘
                  │                             │
                  ▼                             ▼
        [ API Phim NguonC ]           [ Máy chủ Video StreamC ]
     (https://phim.nguonc.com)           (https://streamc.xyz)
```

---

## 2. 🌲 Cây Thư Mục & Vai Trò Từng Thành Phần

```
tsufu_movies/
├── .github/
│   └── workflows/
│       ├── deploy-backend.yml        # CI/CD: Build & push Docker image Backend lên Docker Hub
│       └── deploy-frontend.yml       # CI/CD: Build & push Docker image Frontend lên Docker Hub
├── backend/                          # Mã nguồn máy chủ FastAPI (Python)
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── movies.py                 # API endpoints danh sách phim, chi tiết, thể loại, tìm kiếm
│   │   └── stream.py                 # API endpoints bóc tách luồng video, bypass quảng cáo & proxy
│   ├── services/
│   │   ├── __init__.py
│   │   ├── nguonc.py                 # Service tương tác trực tiếp với API phim.nguonc.com
│   │   └── embed_extractor.py        # Thuật toán trích xuất m3u8 và lọc mã độc/ads từ iframe embed
│   ├── .env.example                  # Template biến môi trường Backend
│   ├── cache.py                      # Module bộ nhớ đệm RAM đơn giản kèm thời gian sống (TTL)
│   ├── config.py                     # Đọc & parse cấu hình từ biến môi trường
│   ├── Dockerfile                    # Đóng gói Backend container (python:3.11-slim)
│   ├── main.py                       # Điểm khởi động FastAPI (CORS, Routers, Health Check)
│   ├── README.md                     # Tài liệu hướng dẫn riêng cho Backend
│   ├── requirements.txt              # Danh sách thư viện Python cần thiết
│   └── schemas.py                    # Định nghĩa cấu trúc dữ liệu Pydantic (Request/Response validation)
├── frontend/                         # Mã nguồn giao diện React + Vite
│   ├── public/
│   │   ├── favicon.svg               # Favicon biểu tượng trang web
│   │   └── icons.svg                 # SVG sprite chứa icon ứng dụng
│   ├── src/
│   │   ├── api/
│   │   │   └── movieApi.js           # Module gọi API backend (dùng relative path /api)
│   │   ├── assets/
│   │   │   ├── hero.png              # Hình ảnh banner mặc định
│   │   │   └── vite.svg              # Logo Vite
│   │   ├── components/
│   │   │   ├── Footer.jsx            # Chân trang (Footer)
│   │   │   ├── HeroBanner.jsx        # Banner phim nổi bật trên đầu trang chủ
│   │   │   ├── LoadingSpinner.jsx    # Component hiệu ứng đang tải (Spinner / Skeleton)
│   │   │   ├── MovieCard.jsx         # Card hiển thị poster và thông tin tóm tắt phim
│   │   │   ├── MovieRow.jsx          # Hàng trượt danh sách phim theo chủ đề
│   │   │   ├── Navbar.jsx            # Thanh điều hướng đầu trang kèm thanh tìm kiếm realtime
│   │   │   ├── Pagination.jsx        # Nút chuyển trang (Phân trang)
│   │   │   └── SmartVideoPlayer.jsx  # Trình phát thông minh (HLS.js + Sandboxed Adblock Iframe)
│   │   ├── pages/
│   │   │   ├── CategoryPage.jsx      # Trang lọc theo loại phim (Phim lẻ, Phim bộ, Hoạt hình, TV Shows)
│   │   │   ├── GenrePage.jsx         # Trang lọc theo thể loại và quốc gia
│   │   │   ├── HomePage.jsx          # Trang chủ chính
│   │   │   ├── MovieDetailPage.jsx   # Trang chi tiết thông tin phim, tập phim, diễn viên
│   │   │   ├── SearchPage.jsx        # Trang hiển thị kết quả tìm kiếm phim
│   │   │   └── WatchPage.jsx         # Trang xem phim (kết hợp player + danh sách chọn tập)
│   │   ├── App.jsx                   # Khai báo cấu trúc Route và Layout tổng
│   │   ├── index.css                 # CSS toàn cục (Tailwind CSS v4 & tùy chỉnh giao diện)
│   │   └── main.jsx                  # Điểm khởi chạy React (Mount vào DOM root)
│   ├── .env.example                  # Template biến môi trường Frontend
│   ├── .gitignore                    # Bỏ qua node_modules, dist, logs
│   ├── default.conf.template         # Template cấu hình Nginx (hỗ trợ envsubst động)
│   ├── Dockerfile                    # Multi-stage Dockerfile (Node build -> Nginx alpine)
│   ├── index.html                    # File HTML gốc chứa thẻ <div id="root">
│   ├── package.json                  # Cấu hình dự án Frontend, scripts, dependencies
│   ├── package-lock.json             # Khóa phiên bản npm dependencies
│   ├── README.md                     # Tài liệu hướng dẫn riêng cho Frontend
│   ├── tsconfig.json                 # Cấu hình TypeScript / Linting
│   └── vite.config.js                # Cấu hình Vite (React plugin, Tailwind, Dev Proxy)
├── tools/
│   └── stream_research/              # Các script thử nghiệm & phân tích luồng video (Reverse engineering)
│       ├── download_embed.py         # Script tải embed HTML gốc
│       ├── download_player.py        # Script tải file player.js của StreamC
│       ├── test_fetch.py             # Test giả lập HTTP requests
│       ├── test_fetch_png.py         # Test tải tài nguyên hình ảnh
│       ├── test_m3u8.py              # Test bóc tách playlist m3u8
│       ├── test_m3u8_no_redir.py     # Test chuyển hướng m3u8
│       ├── test_referer.py           # Test header Referer chống chặn
│       ├── test_regex.py             # Test mẫu biểu thức trích xuất m3u8
│       ├── test_ts_referer.py        # Test tải video chunk .ts
│       ├── test_worker.py            # Test proxy qua Cloudflare Worker
│       ├── trace_errors.py           # Script trace console log bằng Playwright
│       ├── trace_errors2.py          # Script trace crypto bằng Playwright
│       ├── trace_network.py          # Script bắt request mạng bằng Playwright
│       └── README.md                 # Tài liệu giải thích từng tool nghiên cứu
├── .gitignore                        # Git ignore cấp dự án (venv, .env, OS files)
├── docker-compose.yml                # File dàn dựng toàn bộ hệ sinh thái container
├── PROJECT_STRUCTURE.md              # [FILE NÀY] Tài liệu kiến trúc toàn diện
└── README.md                         # Tài liệu hướng dẫn sử dụng và chạy dự án
```

---

## 3. 🔍 Chi Tiết Trách Nhiệm Từng File Cốt Lõi

### A. Hệ thống Mạng & Reverse Proxy (Root & Deployment)

1. **`docker-compose.yml`**:
   - Khởi tạo 2 containers: `appphim_frontend` và `appphim_backend`.
   - **Bảo mật:** Backend **không expose port ra máy chủ host**, chỉ giao tiếp với Frontend qua bridge network `app-net`.
   - **Linh hoạt:** Frontend map cổng động `${APP_PORT:-80}:${APP_PORT:-80}`.
   - **Cấu hình Nginx:** Truyền `APP_PORT`, `BACKEND_URL`, và `NGINX_ENVSUBST_FILTER="APP_PORT|BACKEND_URL"`.

2. **`frontend/default.conf.template`**:
   - `listen ${APP_PORT};`: Lắng nghe cổng truyền vào từ môi trường.
   - `location /`: Cung cấp file tĩnh từ `/usr/share/nginx/html`, có chỉ thị `try_files $uri $uri/ /index.html;` đảm bảo khi reload ở bất kỳ URL nào (React Router) không bị lỗi 404.
   - `location = /api`: Tự động chuyển hướng (301) về `/api/`.
   - `location /api/`: Chuyển tiếp tới `${BACKEND_URL}` kèm các headers `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`, cùng thiết lập tắt buffering `proxy_buffering off` phục vụ truyền phát video mượt mà.

3. **`frontend/Dockerfile`**:
   - Stage 1: `node:20-alpine` cài đặt dependencies và chạy `npm run build` tạo thư mục `dist/`.
   - Stage 2: `nginx:alpine` copy `default.conf.template` vào thư mục `/etc/nginx/templates/default.conf.template`.
   - Image chính thức của Nginx sẽ tự động chạy script `20-envsubst-on-templates.sh` khi container khởi động để render file `/etc/nginx/conf.d/default.conf` hoàn chỉnh.

---

### B. Backend FastAPI (`backend/`)

1. **`main.py`**:
   - Khởi tạo FastAPI app.
   - Cấu hình middleware CORS dựa trên danh sách `CORS_ORIGINS` trong `config.py`.
   - Mount router phim (`/api/movies`) và router stream (`/api/stream`).
   - Cung cấp route kiểm tra sức khỏe hệ thống: `@app.get("/api/health")` và `@app.get("/health")`.

2. **`config.py`**:
   - Đọc cấu hình từ `.env`: `NGUONC_BASE_URL`, `CACHE_TTL_*`, `CORS_ORIGINS`, `STREAMC_BASE`, `HTTP_TIMEOUT`, `ALLOWED_PROXY_DOMAINS`.

3. **`cache.py`**:
   - Bộ nhớ đệm RAM lưu key-value kèm thời gian hết hạn (TTL) để giảm tải và hạn chế bị API NguonC chặn tần suất truy vấn.

4. **`schemas.py`**:
   - Các model Pydantic (`MovieItem`, `PaginatedMovies`, `MovieDetail`, `MovieDetailResponse`) chuẩn hóa dữ liệu trả về cho client.

5. **`routers/movies.py`**:
   - Xử lý các request từ client: lấy phim mới nhất (`/latest`), phim lẻ (`/phim-le`), phim bộ (`/phim-bo`), hoạt hình (`/hoat-hinh`), TV shows (`/tv-shows`), tìm kiếm (`/search`), chi tiết phim (`/detail/{slug}`).

6. **`routers/stream.py` & `services/embed_extractor.py`**:
   - **Điểm đột phá kỹ thuật:** Vượt qua rào cản quảng cáo độc hại và cơ chế mã hóa của nhà cung cấp video nguồn `streamc.xyz`.
   - `resolve`: Cố gắng lấy link m3u8 trực tiếp; nếu video bị mã hóa AES, trả về endpoint proxy nội bộ.
   - `proxy`: Tải mã HTML từ máy chủ embed, bóc tách và loại bỏ các script quảng cáo pop-up (`window.open`, anti-adblock), gắn script tùy biến an toàn và trả về cho frontend render an toàn.
   - `fetch`: Chuyển tiếp các request video chunks có gắn kèm `Referer: https://streamc.xyz/`.

---

### C. Frontend React SPA (`frontend/`)

1. **`src/api/movieApi.js`**:
   - Quản trị toàn bộ các hàm gọi API sang backend.
   - Sử dụng **Relative Path** (`/api/...`) theo chuẩn Reverse Proxy: Client không cần biết địa chỉ IP hay port của backend; mọi request đều được gửi đến chính origin hiện tại của website.
   - `checkHealth()` gọi `/api/health`.

2. **`src/components/SmartVideoPlayer.jsx`**:
   - Trình phát video hai chế độ:
     1. **Chế độ 1 (Ưu tiên):** Nếu có link `.m3u8` trực tiếp, khởi tạo thư viện `Hls.js` gắn vào thẻ `<video>` thuần (trải nghiệm mượt nhất, không có quảng cáo).
     2. **Chế độ 2 (Fallback):** Nếu là link embed hoặc proxy URL, render trong thẻ `<iframe>` với thuộc tính `sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"`.
     - ⚠️ **LƯU Ý:** Thuộc tính `sandbox` **KHÔNG CÓ** `allow-popups`, điều này vô hiệu hóa hoàn toàn lệnh `window.open()`, giúp chặn đứng 100% các quảng cáo nhảy trang khó chịu mà vẫn phát được phim.

3. **`src/App.jsx` & `src/pages/`**:
   - `App.jsx`: Quản lý layout (Navbar, Content, Footer) và điều hướng `react-router-dom`.
   - `WatchPage.jsx`: Tương tác chọn server, chọn tập phim, gọi `resolveStream` để nạp dữ liệu cho player.
   - `HomePage.jsx`: Tải đồng thời phim mới cập nhật, phim bộ, phim lẻ, hoạt hình để hiển thị lên các Carousel.

---

## 4. ⚠️ Quy Tắc An Toàn & Bảo Trì (Critical Safeguards)

> [!CAUTION]
> **DANH SÁCH FILE VÀ CẤU HÌNH TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ Ý XÓA HOẶC ĐỔI TÊN:**

1. ❌ **Không xóa hoặc bỏ qua `frontend/default.conf.template`**:
   - Nginx trong container dựa vào file này để khởi tạo file cấu hình runtime. Nếu xóa file này, container Nginx sẽ dùng cấu hình mặc định (không có reverse proxy `/api/` và không có `try_files` SPA routing).

2. ❌ **Không đổi toán tử trong `NGINX_ENVSUBST_FILTER="APP_PORT|BACKEND_URL"`**:
   - Entrypoint Nginx Alpine sử dụng cú pháp Regex của `awk`. Dấu gạch đứng `|` là toán tử HOẶC. Nếu đổi thành dấu cách `"APP_PORT BACKEND_URL"`, awk sẽ không khớp biến nào cả và Nginx sẽ sập khi khởi động vì không thay thế được `${APP_PORT}`.

3. ❌ **Không bỏ tiền tố `/api` trong `frontend/src/api/movieApi.js`**:
   - Nginx chỉ ủy quyền các request bắt đầu bằng `/api/` sang cho Backend. Nếu gọi đường dẫn không có `/api/` (ví dụ `/health`), Nginx sẽ hiểu nhầm đó là đường dẫn trang React và trả về file `index.html`, dẫn đến lỗi phân tích JSON ở phía client.

4. ❌ **Không thêm `allow-popups` vào sandbox của `SmartVideoPlayer.jsx`**:
   - Nếu thêm cờ này, các mã script quảng cáo nhảy trang từ server nguồn sẽ được phép mở tab mới, phá vỡ trải nghiệm người dùng không quảng cáo của ứng dụng.

5. ❌ **Không cấu hình `allow_origins=["*"]` kèm `allow_credentials=True` trong `backend/main.py`**:
   - Tiêu chuẩn CORS của các trình duyệt hiện đại (Chrome, Safari, Firefox) sẽ chặn hoàn toàn các request vi phạm quy định này. Trong mô hình Reverse Proxy, trình duyệt và API cùng origin nên không cần cấu hình lỏng lẻo như vậy.

---

## 5. 🚀 Hướng Dẫn Vận Hành & Khởi Chạy

### Cách 1: Chạy môi trường Local Development (Không cần Docker)
- **Backend:**
  ```powershell
  cd backend
  ..\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
  ```
- **Frontend:**
  ```powershell
  cd frontend
  npm run dev
  ```
  *(Vite Dev Server tự động proxy toàn bộ request `/api` sang `http://localhost:8000`).*
- Truy cập giao diện: **`http://localhost:5173`**

### Cách 2: Chạy môi trường Docker (Khuyến nghị cho Production/VPS)
- Khởi chạy toàn bộ hệ thống:
  ```bash
  docker compose up -d --build
  ```
- Tùy chỉnh cổng ngoài (Ví dụ chạy cổng 8080 thay vì 80):
  ```bash
  APP_PORT=8080 docker compose up -d
  ```
- Kiểm tra logs:
  ```bash
  docker compose logs -f
  ```
