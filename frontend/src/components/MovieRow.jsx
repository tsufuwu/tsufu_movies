import { useRef } from 'react'
import { Link } from 'react-router-dom'
import MovieCard from './MovieCard'

export default function MovieRow({ title, movies, link }) {
  const rowRef = useRef(null)

  const scroll = (direction) => {
    if (rowRef.current) {
      const scrollAmount = rowRef.current.clientWidth * 0.8
      rowRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  if (!movies || movies.length === 0) return null

  return (
    <section className="mb-10" style={{ marginBottom: "3rem" }}>
      <div className="flex items-center justify-between mb-4 px-4 sm:px-6" style={{ marginBottom: "1.5rem" }}>
        <h2 className="text-xl sm:text-2xl font-bold text-white">{title}</h2>
        {link && (
          <Link to={link} className="text-sm font-semibold text-white/50 hover:text-white transition-colors flex items-center gap-1 group">
            Xem tất cả
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>

      <div className="relative group/row">
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-r from-[var(--color-bg-primary)] to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center justify-center"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div ref={rowRef} className="flex gap-4 overflow-x-auto hide-scrollbar px-4 sm:px-6 pb-2">
          {movies.map((movie) => (
            <div key={movie.slug} className="flex-shrink-0 w-[140px] sm:w-[160px] md:w-[180px]">
              <MovieCard movie={movie} />
            </div>
          ))}
        </div>

        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-l from-[var(--color-bg-primary)] to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center justify-center"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </section>
  )
}
