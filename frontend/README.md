# App Phim - Frontend

Đây là phần giao diện người dùng của dự án App Phim, được xây dựng bằng **React** và **Vite**.

## Yêu cầu hệ thống
- Node.js (phiên bản 18+ khuyến nghị)
- npm hoặc yarn

## Cài đặt và Chạy thử (Local)

1. Mở terminal tại thư mục `frontend/`
2. Cài đặt các gói phụ thuộc (dependencies):
   ```bash
   npm install
   ```
3. Khởi chạy môi trường lập trình (Development Server):
   ```bash
   npm run dev
   ```
4. Mở trình duyệt tại đường dẫn được hiển thị (thường là `http://localhost:5173`).

## Cấu trúc thư mục chính
- `src/`: Chứa toàn bộ source code React (components, pages, styles...).
- `public/`: Chứa các tài nguyên tĩnh (hình ảnh, favicon).
- `Dockerfile`: Cấu hình đóng gói ứng dụng bằng Docker (sử dụng Nginx để phục vụ các file giao diện tĩnh).
- `nginx.conf`: Cấu hình máy chủ Nginx (hỗ trợ điều hướng trang - React Router).
