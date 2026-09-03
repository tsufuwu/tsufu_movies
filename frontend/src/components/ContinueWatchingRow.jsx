import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { watchHistory } from '../utils/watchHistory'

export default function ContinueWatchingRow() {
  const [history, setHistory] = useState([])
  const rowRef = useRef(null)

  useEffect(() => {
    setHistory(watchHistory.getAll())
  }, [])

  const handleRemove = (e, slug) => {
    e.preventDefault()
    e.stopPropagation()
    watchHistory.remove(slug)
    setHistory(watchHistory.getAll())
  }

  const scroll = (direction) => {
    if (rowRef.current) {
      const scrollAmount = rowRef.current.clientWidth * 0.8
      rowRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  if (!history || history.length === 0) return null

  return (
    <section className="mb-10" style={{ marginBottom: '3rem' }}>
      <div className="flex items-center justify-between mb-4 px-4 sm:px-6" style={{ marginBottom: '1.5rem' }}>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-6 bg-[#E50914] rounded-full" />
          <h2 className="text-xl sm:text-2xl font-bold text-white">Tiếp tục xem</h2>
        </div>
        <span className="text-xs text-white/40">{history.length} phim đã lưu</span>
      </div>

      <div className="relative group/row">
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-r from-[var(--color-bg-primary)] to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div ref={rowRef} className="flex gap-4 overflow-x-auto hide-scrollbar px-4 sm:px-6 pb-2">
          {history.map((item) => {
            const targetUrl = item.episodeSlug
              ? `/xem/${item.slug}/${item.episodeSlug}`
              : `/xem/${item.slug}`

            return (
              <div key={item.slug} className="flex-shrink-0 w-[160px] sm:w-[180px] md:w-[200px] relative group">
                <Link to={targetUrl} className="block group-hover:scale-105 transition-transform duration-300">
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800 shadow-md">
                    {item.poster_url ? (
                      <img
                        src={item.poster_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm">
                        No Image
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                    {/* Episode Tag */}
                    {item.episodeName && (
                      <span className="absolute top-2 left-2 z-10 bg-black/70 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded">
                        {item.episodeName}
                      </span>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleRemove(e, item.slug)}
                      title="Xóa khỏi lịch sử"
                      className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-black/70 hover:bg-red-600 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      ✕
                    </button>

                    {/* Play Icon on hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-lg">
                        <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60">
                      <div
                        className="h-full bg-[#E50914] transition-all"
                        style={{ width: `${item.progressPercent || 0}%` }}
                      />
                    </div>
                  </div>

                  <h3 className="text-sm font-medium text-white mt-2 truncate group-hover:text-[#E50914] transition-colors">
                    {item.name}
                  </h3>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-0.5">
                    <span>{item.episodeName || 'Đang xem'}</span>
                    <span>{item.progressPercent ? `${item.progressPercent}%` : ''}</span>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>

        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-l from-[var(--color-bg-primary)] to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </section>
  )
}
