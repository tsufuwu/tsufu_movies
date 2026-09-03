import { Link } from 'react-router-dom'

export default function HeroBanner({ movie }) {
  if (!movie) return null

  return (
    <div className="relative h-[70vh] sm:h-[80vh] w-full overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={movie.poster_url || movie.thumb_url}
          alt={movie.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/90 via-[#141414]/40 to-transparent" />
      </div>

      <div className="relative h-full flex items-end pb-32 sm:pb-40 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-6" style={{ marginBottom: "1.5rem" }}>
            {movie.quality && (
              <span className="badge-quality">{movie.quality}</span>
            )}
            {movie.language && (
              <span className="badge-lang">{movie.language}</span>
            )}
            {movie.year && (
              <span className="text-sm font-bold text-white/80">{movie.year}</span>
            )}
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-2 leading-tight" style={{ marginBottom: "0.5rem" }}>
            {movie.name}
          </h1>
          {movie.original_name && movie.original_name !== movie.name && (
            <p className="text-lg text-[var(--color-text-secondary)] mb-4" style={{ marginBottom: "1rem" }}>{movie.original_name}</p>
          )}

          <p className="text-sm sm:text-base text-[var(--color-text-secondary)] line-clamp-3 mb-8 leading-relaxed" style={{ marginBottom: "2rem" }}>
            {movie.description}
          </p>

          <div className="flex gap-3">
            <Link
              to={`/xem/${movie.slug}`}
              className="btn-play"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
              Xem Phim
            </Link>
            <Link
              to={`/phim/${movie.slug}`}
              className="btn-info"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Chi Tiết
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
