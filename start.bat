@echo off
echo ==============================================
echo Khoi dong App Phim (Frontend va Backend)
echo ==============================================

:: Khởi động Backend trong cửa sổ mới
echo [1/2] Đang khởi động Backend (FastAPI)...
start "App Phim - Backend" cmd /k "cd backend && if not exist venv (python -m venv venv) && venv\Scripts\activate && pip install -r requirements.txt && python main.py"

:: Khởi động Frontend trong cửa sổ mới
echo [2/2] Đang khởi động Frontend (React/Vite)...
start "App Phim - Frontend" cmd /k "cd frontend && npm install && npm run dev"

echo.
echo Hoàn tất! Hai cửa sổ mới đã được mở để chạy server.
echo Đóng cửa sổ này nếu bạn muốn.
pause
