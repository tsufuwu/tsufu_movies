import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { checkHealth } from './api/movieApi.js'

// Frontend Initialization Logs
console.log('🚀 [Frontend Init] Ứng dụng đang khởi động...');
console.log('⚙️ [Config Check] VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL || '(Mặc định - Relative path)');

// Backend Health Check
checkHealth()
  .then((data) => {
    console.log('✅ [Backend Health] Trạng thái API:', data);
  })
  .catch((err) => {
    console.error('❌ [Backend Health] Lỗi kết nối Backend:', err.message);
    console.warn('⚠️ Gợi ý: Hãy kiểm tra cấu hình VITE_API_BASE_URL hoặc cấu hình Proxy trên Web Server của bạn.');
  });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
