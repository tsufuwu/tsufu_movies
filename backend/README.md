# App Phim - Backend

Đây là phần máy chủ API (Server) của dự án App Phim, được xây dựng bằng **Python** và **FastAPI**.

## Yêu cầu hệ thống
- Python 3.9 trở lên
- pip (Trình quản lý thư viện Python)
- Docker (Tùy chọn, nếu muốn chạy nhanh bằng Docker Compose)

## Cài đặt và Chạy thử (Local)

### Cách 1: Chạy 1-click cho Windows
Di chuyển ra thư mục gốc (`d:\appphim`) và nháy đúp vào file `start.bat`. File này sẽ tự động thiết lập môi trường, cài đặt thư viện và chạy cả 2 dịch vụ Backend & Frontend trong 2 cửa sổ riêng biệt.

### Cách 2: Chạy bằng Docker Compose (Khuyến nghị nếu có Docker)
Di chuyển ra thư mục gốc của dự án (`d:\appphim`) và chạy lệnh sau để khởi động cả Frontend và Backend:
```bash
docker-compose up -d --build
```
Sau đó API sẽ chạy tại: `http://localhost:8000`

### Cách 3: Chạy thủ công
1. Mở terminal tại thư mục `backend/`
2. Tạo môi trường ảo (Virtual Environment) để cài đặt các gói cách ly:
   ```bash
   python -m venv venv
   
   # Đối với Windows:
   source venv/Scripts/activate 
   # Đối với Linux/Mac:
   # source venv/bin/activate    
   ```
3. Cài đặt các thư viện cần thiết:
   ```bash
   pip install -r requirements.txt
   ```
4. Khởi chạy Server FastAPI:
   ```bash
   python main.py
   ```
5. Mở trình duyệt, Server sẽ chạy tại địa chỉ `http://localhost:8000`. Bạn có thể truy cập `http://localhost:8000/docs` để xem tài liệu API (Swagger UI).

## Các chức năng chính
- Cung cấp dữ liệu API: Lấy danh sách phim, chi tiết phim từ các nguồn ngoài.
- Hệ thống Proxy Stream: Giúp vượt qua rào cản CORS của trình duyệt, đồng thời xử lý xóa bỏ các đoạn mã script quảng cáo độc hại trước khi trả luồng phim về cho Frontend.
