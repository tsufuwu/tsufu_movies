import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-[#141414] border-t border-gray-800 mt-16" style={{ marginTop: '5rem', paddingBottom: '2rem' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-12 md:gap-8">
          
          {/* Cột 1: Logo & Info */}
          <div className="flex flex-col">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <span 
                className="text-4xl md:text-5xl tracking-tighter drop-shadow-lg" 
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                <span className="text-[#E50914]">TSU</span>
                <span className="text-white">FU</span>
              </span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              Tsufu - Trang web xem phim trực tuyến chất lượng cao, cập nhật nhanh nhất các bộ phim hot.
            </p>
          </div>

          {/* Cột 2: Danh Mục */}
          <div>
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-[#E50914] rounded-full"></span>
              Danh Mục
            </h3>
            <div className="flex flex-col gap-4">
              <Link to="/danh-sach/phim-le" className="group flex items-center gap-3 text-sm text-gray-400 hover:text-white transition-all duration-300">
                <span className="w-0 h-[2px] bg-[#E50914] group-hover:w-4 transition-all duration-300"></span>
                Phim Lẻ
              </Link>
              <Link to="/danh-sach/phim-bo" className="group flex items-center gap-3 text-sm text-gray-400 hover:text-white transition-all duration-300">
                <span className="w-0 h-[2px] bg-[#E50914] group-hover:w-4 transition-all duration-300"></span>
                Phim Bộ
              </Link>
              <Link to="/danh-sach/hoat-hinh" className="group flex items-center gap-3 text-sm text-gray-400 hover:text-white transition-all duration-300">
                <span className="w-0 h-[2px] bg-[#E50914] group-hover:w-4 transition-all duration-300"></span>
                Hoạt Hình
              </Link>
              <Link to="/danh-sach/tv-shows" className="group flex items-center gap-3 text-sm text-gray-400 hover:text-white transition-all duration-300">
                <span className="w-0 h-[2px] bg-[#E50914] group-hover:w-4 transition-all duration-300"></span>
                TV Shows
              </Link>
            </div>
          </div>

          {/* Cột 3: Thể Loại */}
          <div>
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-[#E50914] rounded-full"></span>
              Thể Loại
            </h3>
            <div className="flex flex-col gap-4">
              <Link to="/the-loai/hanh-dong" className="group flex items-center gap-3 text-sm text-gray-400 hover:text-white transition-all duration-300">
                <span className="w-0 h-[2px] bg-[#E50914] group-hover:w-4 transition-all duration-300"></span>
                Hành Động
              </Link>
              <Link to="/the-loai/tinh-cam" className="group flex items-center gap-3 text-sm text-gray-400 hover:text-white transition-all duration-300">
                <span className="w-0 h-[2px] bg-[#E50914] group-hover:w-4 transition-all duration-300"></span>
                Tình Cảm
              </Link>
              <Link to="/the-loai/hai-huoc" className="group flex items-center gap-3 text-sm text-gray-400 hover:text-white transition-all duration-300">
                <span className="w-0 h-[2px] bg-[#E50914] group-hover:w-4 transition-all duration-300"></span>
                Hài Hước
              </Link>
              <Link to="/the-loai/kinh-di" className="group flex items-center gap-3 text-sm text-gray-400 hover:text-white transition-all duration-300">
                <span className="w-0 h-[2px] bg-[#E50914] group-hover:w-4 transition-all duration-300"></span>
                Kinh Dị
              </Link>
            </div>
          </div>

          </div>

        {/* Bản quyền */}
        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <p className="text-sm text-gray-500 font-medium">
            &copy; {new Date().getFullYear()} TSUFU. Trang web xem phim của Tsufu.
          </p>
          <div className="flex gap-4">
            <span className="text-sm text-gray-600 hover:text-white transition-colors cursor-pointer">Điều khoản</span>
            <span className="text-sm text-gray-600 hover:text-white transition-colors cursor-pointer">Bảo mật</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
