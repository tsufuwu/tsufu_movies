import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { searchMovies } from '../api/movieApi'

const GENRES = [
  { name: 'Hành Động', slug: 'hanh-dong' },
  { name: 'Tình Cảm', slug: 'tinh-cam' },
  { name: 'Hài Hước', slug: 'hai-huoc' },
  { name: 'Kinh Dị', slug: 'kinh-di' },
  { name: 'Viễn Tưởng', slug: 'vien-tuong' },
  { name: 'Hoạt Hình', slug: 'hoat-hinh' },
  { name: 'Phiêu Lưu', slug: 'phieu-luu' },
  { name: 'Tâm Lý', slug: 'tam-ly' },
  { name: 'Hình Sự', slug: 'hinh-su' },
  { name: 'Chiến Tranh', slug: 'chien-tranh' },
]

export default function Navbar() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [genreOpen, setGenreOpen] = useState(false)
  
  const navigate = useNavigate()
  const genreRef = useRef(null)
  const searchRef = useRef(null)

  // Xử lý scroll để đổi nền Navbar
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Xử lý click ra ngoài để đóng Mega Menu và Suggestion Dropdown
  useEffect(() => {
    const handler = (e) => {
      if (genreRef.current && !genreRef.current.contains(e.target)) {
        setGenreOpen(false)
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Xử lý Gợi ý tìm kiếm (Debounce)
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const timer = setTimeout(async () => {
      setLoadingSuggestions(true)
      try {
        const data = await searchMovies(query.trim(), 1)
        setSuggestions((data.items || []).slice(0, 5)) // Lấy 5 kết quả đầu tiên
        setShowSuggestions(true)
      } catch (err) {
        console.error("Lỗi lấy gợi ý tìm kiếm:", err)
      } finally {
        setLoadingSuggestions(false)
      }
    }, 500) // Delay 500ms sau khi ngừng gõ

    return () => clearTimeout(timer)
  }, [query])

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/tim-kiem?q=${encodeURIComponent(query.trim())}`)
      setShowSuggestions(false)
      setMenuOpen(false)
      setQuery('')
    }
  }

  const handleSuggestionClick = (slug) => {
    navigate(`/phim/${slug}`)
    setShowSuggestions(false)
    setMenuOpen(false)
    setQuery('')
  }

  const navLinkClass = "nav-link-custom"
  const fontStyle = { fontFamily: "'Montserrat', sans-serif" }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-[#141414] shadow-lg shadow-black/50 transition-colors duration-500 py-2' : 'bg-gradient-to-b from-black/90 via-black/50 to-transparent transition-colors duration-500 py-4'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="text-4xl md:text-5xl font-black text-[#E50914] tracking-tighter uppercase drop-shadow-2xl hover:scale-105 transition-transform">TSUFU</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center" style={{ gap: "0.5rem", ...fontStyle }}>
            <Link to="/" className={navLinkClass}>Trang Chủ</Link>
            <Link to="/danh-sach/phim-le" className={navLinkClass}>Phim Lẻ</Link>
            <Link to="/danh-sach/phim-bo" className={navLinkClass}>Phim Bộ</Link>
            <Link to="/danh-sach/hoat-hinh" className={navLinkClass}>Hoạt Hình</Link>
            <Link to="/danh-sach/tv-shows" className={navLinkClass}>TV Shows</Link>

            {/* Genre Dropdown */}
            <div className="relative group" ref={genreRef} onMouseEnter={() => setGenreOpen(true)} onMouseLeave={() => setGenreOpen(false)}>
              <button className={`${navLinkClass} gap-2`}>
                Thể Loại
                <svg className={`w-5 h-5 transition-transform duration-300 ${genreOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-6 w-[560px] bg-gradient-to-br from-[#181818] to-[#141414] backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] p-8 transition-all duration-300 ease-out origin-top ${genreOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'}`}>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-[#181818] border-t border-l border-gray-700/50 rotate-45"></div>
                
                <div className="grid grid-cols-2 gap-4">
                  {GENRES.map(g => (
                    <Link
                      key={g.slug}
                      to={`/the-loai/${g.slug}`}
                      className="group flex items-center gap-4 p-4 text-base font-bold text-gray-300 bg-white/5 hover:bg-white hover:text-[#E50914] rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                      onClick={() => setGenreOpen(false)}
                    >
                      <div className="w-1.5 h-6 bg-[#E50914] rounded-full scale-y-0 group-hover:scale-y-100 transition-transform duration-300"></div>
                      {g.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Search + Mobile Toggle */}
          <div className="flex items-center gap-3">
            {/* Thanh Search Mới */}
            <form onSubmit={handleSearch} className="hidden sm:flex items-center relative" ref={searchRef}>
              <div className="relative group flex items-center">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => { if(query) setShowSuggestions(true); }}
                  placeholder="Tìm kiếm phim..."
                  className="w-56 lg:w-72 bg-[#181818]/80 backdrop-blur-md border border-gray-700/60 rounded-full px-5 py-2.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]/50 focus:bg-[#181818] transition-all shadow-lg"
                  style={fontStyle}
                />
                <button type="submit" className="absolute right-4 text-gray-400 hover:text-[#E50914] transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>

              {/* Gợi ý tìm kiếm (Dropdown) */}
              {showSuggestions && (query.trim().length > 0) && (
                <div className="absolute top-full right-0 mt-3 w-80 bg-[#181818] border border-gray-800 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col z-50">
                  {loadingSuggestions ? (
                    <div className="p-4 flex items-center justify-center text-gray-400 text-sm">
                      <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-[#E50914] animate-spin mr-2"></div>
                      Đang tìm...
                    </div>
                  ) : suggestions.length > 0 ? (
                    <div>
                      {suggestions.map(movie => (
                        <div 
                          key={movie.slug} 
                          onClick={() => handleSuggestionClick(movie.slug)}
                          className="flex items-center gap-3 p-3 border-b border-gray-800 hover:bg-[#282828] cursor-pointer transition-colors"
                        >
                          <img 
                            src={movie.thumb_url || movie.poster_url} 
                            alt={movie.name} 
                            className="w-12 h-16 object-cover rounded-md"
                            onError={(e) => { e.target.src = 'https://via.placeholder.com/48x64?text=No+Img' }}
                          />
                          <div className="flex-1 overflow-hidden">
                            <h4 className="text-sm font-bold text-white line-clamp-1 group-hover:text-[#E50914]">{movie.name}</h4>
                            <p className="text-xs text-gray-400 mt-1">{movie.year || 'Đang cập nhật'} {movie.language ? `• ${movie.language}` : ''}</p>
                          </div>
                        </div>
                      ))}
                      <div 
                        onClick={handleSearch}
                        className="p-3 text-center text-sm font-bold text-[#E50914] hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        Xem tất cả kết quả
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-400">
                      Không tìm thấy "{query}"
                    </div>
                  )}
                </div>
              )}
            </form>

            {/* Mobile Toggle Button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden bg-[#141414] border border-gray-800 rounded-2xl mt-4 p-5 mb-4 shadow-2xl" style={fontStyle}>
            <form onSubmit={handleSearch} className="mb-6">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm kiếm phim..."
                className="w-full bg-black/50 border border-gray-800 rounded-xl px-5 py-3 text-base text-white placeholder-gray-500 focus:outline-none focus:border-[#E50914]"
              />
            </form>
            <div className="flex flex-col gap-2">
              <Link to="/" className="text-base font-bold px-4 py-3 text-gray-300 hover:bg-white hover:text-[#E50914] rounded-xl transition-colors" onClick={() => setMenuOpen(false)}>Trang Chủ</Link>
              <Link to="/danh-sach/phim-le" className="text-base font-bold px-4 py-3 text-gray-300 hover:bg-white hover:text-[#E50914] rounded-xl transition-colors" onClick={() => setMenuOpen(false)}>Phim Lẻ</Link>
              <Link to="/danh-sach/phim-bo" className="text-base font-bold px-4 py-3 text-gray-300 hover:bg-white hover:text-[#E50914] rounded-xl transition-colors" onClick={() => setMenuOpen(false)}>Phim Bộ</Link>
              <Link to="/danh-sach/hoat-hinh" className="text-base font-bold px-4 py-3 text-gray-300 hover:bg-white hover:text-[#E50914] rounded-xl transition-colors" onClick={() => setMenuOpen(false)}>Hoạt Hình</Link>
              <Link to="/danh-sach/tv-shows" className="text-base font-bold px-4 py-3 text-gray-300 hover:bg-white hover:text-[#E50914] rounded-xl transition-colors" onClick={() => setMenuOpen(false)}>TV Shows</Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
