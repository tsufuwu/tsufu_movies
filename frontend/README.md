# App Phim - Frontend

Giao diện người dùng của nền tảng xem phim trực tuyến **App Phim**, được xây dựng bằng **React**, **Vite** và **Tailwind CSS v4**, triển khai dưới mô hình **Single-Entry Reverse Proxy** với **Nginx**.

---

## 🚀 Tính Năng Nổi Bật

1. **Kiến Trúc Single-Entry Reverse Proxy:**
   - Trình duyệt chỉ giao tiếp trực tiếp với container Frontend qua cổng HTTP `80` (hoặc `$APP_PORT`).
   - Nginx phục vụ ứng dụng React SPA và tự động chuyển tiếp (reverse proxy) các request `/api/` qua mạng nội bộ Docker tới Backend FastAPI.
   - Nginx tích hợp **Rate Limiting** (10r/s cho API, 2r/s cho tìm kiếm) và **Fast Micro-caching** (TTL 5m, lưu cache tại `/var/cache/nginx`).
   - Tắt buffering video streaming (`proxy_buffering off`) cho trải nghiệm phát m3u8 tức thì.

2. **Quản Lý Phiên Làm Việc Tự Động (Ephemeral Session):**
   - Hook `useSession` kích hoạt handshake ngay khi ứng dụng mount (`App.jsx`).
   - Lưu session token an toàn vào `sessionStorage` (`tsufu_session_token`) và đính kèm header `X-Session-Token` vào mọi yêu cầu HTTP.
   - Tự động phát hiện lỗi `401 Unauthorized` để handshake lại và retry ngầm trong nền (transparent retry).

3. **Client-side Data Caching (Chống Spam Server):**
   - Module `clientCache.js` lưu trữ dữ liệu gọi API vào `sessionStorage` (với `Map` in-memory fallback) theo TTL:
     - Chi tiết phim: 5 phút.
     - Danh sách, thể loại, quốc gia: 3 phút.
     - Tìm kiếm phim: 1 phút.
     - Resolve stream: 2 phút.
   - Người dùng tiến/lùi trang (Back/Forward) hoặc chuyển đổi tab hiển thị kết quả ngay tức khắc (0ms), không spam request lên máy chủ.

4. **Lưu Lịch Sử & Tiếp Tục Xem Phim (Client-First Watch History):**
   - Module `watchHistory.js` lưu trữ tiến độ phát (timestamp video) vào `localStorage` (`tsufu_watch_history`).
   - Throttling ghi dữ liệu tối đa 1 lần mỗi 3 giây trong khi video đang phát.
   - Trình phát `SmartVideoPlayer.jsx` tự động khôi phục timestamp đang xem dở kèm nút *"Xem từ đầu"*.
   - Hàng phim **"Tiếp tục xem"** (`ContinueWatchingRow.jsx`) hiển thị trực tiếp trên Trang chủ với thanh tiến độ đỏ (% thời lượng đã xem).

5. **Trình Phát Video Thông Minh (SmartVideoPlayer):**
   - Hỗ trợ nguồn phát direct HLS (`.m3u8`) qua thư viện `hls.js`.
   - Hỗ trợ nguồn phát embed iframe có sandbox cách ly (`allow-scripts allow-same-origin`) giúp chặn triệt để popup và quảng cáo độc hại.

---

## 🛠️ Yêu Cầu Môi Trường
- **Node.js**: Phiên bản 18+ hoặc 20+ LTS
- **npm**: Phiên bản 9+

---

## 💻 Hướng Dẫn Cài Đặt & Chạy Thử (Local Development)

### 1. Cài đặt dependencies:
```bash
cd frontend
npm install
```

### 2. Cấu hình biến môi trường:
Tạo file `.env` từ template `.env.example`:
```bash
cp .env.example .env
```

Nội dung `.env` mẫu cho local development:
```env
VITE_API_PROXY_TARGET=http://localhost:8000
VITE_API_BASE_URL=
VITE_PORT=5173
```
*(Trong đó `VITE_API_PROXY_TARGET` chỉ định địa chỉ Backend FastAPI local để Vite proxy các cuộc gọi `/api` mà không bị chặn CORS).*

### 3. Khởi chạy Development Server:
```bash
npm run dev
```
Trình duyệt sẽ mở tại `http://localhost:5173`.

### 4. Kiểm tra build sản phẩm:
```bash
npm run build
npm run preview
```

---

## 🐳 Triển Khai Với Docker & Nginx

Frontend sử dụng Multi-stage Dockerfile:
1. **Stage 1 (`build-stage`)**: Sử dụng `node:20-alpine` để cài dependencies và chạy `npm run build` tạo thư mục `dist/`.
2. **Stage 2 (`production-stage`)**: Sử dụng `nginx:alpine` phục vụ file tĩnh và áp dụng template cấu hình `default.conf.template` qua `envsubst`.

### Các biến môi trường Docker:
| Biến môi trường | Mặc định | Ý nghĩa |
| :--- | :--- | :--- |
| `APP_PORT` | `80` | Port Nginx lắng nghe bên trong container |
| `BACKEND_URL` | `http://backend:8000` | Địa chỉ mạng nội bộ của Backend container |
| `NGINX_ENVSUBST_FILTER` | `APP_PORT\|BACKEND_URL` | Lọc các biến thay thế vào file cấu hình Nginx |

---

## 📁 Cấu Trúc Thư Mục Frontend

```
frontend/
├── public/                     # Tài nguyên tĩnh (favicon, sprite icons)
├── src/
│   ├── api/
│   │   └── movieApi.js         # API client tích hợp sessionStorage token & clientCache
│   ├── assets/                 # Hình ảnh logo và banner tĩnh
│   ├── components/
│   │   ├── ContinueWatchingRow.jsx # Hàng phim tiếp tục xem từ localStorage
│   │   ├── Footer.jsx          # Chân trang
│   │   ├── HeroBanner.jsx      # Banner nổi bật đầu trang chủ
│   │   ├── LoadingSpinner.jsx  # Hiệu ứng chờ tải dữ liệu
│   │   ├── MovieCard.jsx       # Card tóm tắt phim
│   │   ├── MovieRow.jsx        # Hàng danh sách phim theo danh mục
│   │   ├── Navbar.jsx          # Header điều hướng, mega-menu thể loại, tìm kiếm
│   │   ├── Pagination.jsx      # Nút chuyển trang
│   │   └── SmartVideoPlayer.jsx# Player HLS.js + Auto-resume + Adblock Iframe
│   ├── hooks/
│   │   └── useSession.js       # Hook quản lý handshake session tự động
│   ├── pages/
│   │   ├── CategoryPage.jsx    # Danh sách phim theo loại (phim lẻ, phim bộ...)
│   │   ├── GenrePage.jsx       # Danh sách theo thể loại / quốc gia
│   │   ├── HomePage.jsx        # Trang chủ
│   │   ├── MovieDetailPage.jsx # Chi tiết phim & danh sách tập
│   │   ├── SearchPage.jsx      # Tìm kiếm phim (kèm bẫy honeypot)
│   │   └── WatchPage.jsx       # Xem phim & đồng bộ timestamp phát
│   ├── utils/
│   │   ├── clientCache.js      # Client cache (sessionStorage + memory fallback)
│   │   └── watchHistory.js     # Quản lý lịch sử và tiến độ vào localStorage
│   ├── App.jsx                 # Layout tổng & Routes
│   ├── index.css               # CSS toàn cục (Tailwind CSS v4)
│   └── main.jsx                # Mount React root
├── .env.example                # Template biến môi trường
├── default.conf.template       # Cấu hình Nginx Reverse Proxy & Micro-cache
├── Dockerfile                  # Multi-stage Docker build
├── package.json                # Dependencies & scripts
└── vite.config.js              # Cấu hình Vite & local proxy
```
