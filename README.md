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
3. Sau khi quá trình build hoàn tất:
   - Web Frontend: `http://localhost:3000`
   - API Backend: `http://localhost:8000`

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
