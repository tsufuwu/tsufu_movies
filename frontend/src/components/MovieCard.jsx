import { Link } from 'react-router-dom'

export default function MovieCard({ movie }) {
  return (
    <Link
      to={`/phim/${movie.slug}`}
      className="group block relative rounded-md overflow-hidden bg-[#181818] movie-card-hover cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[2/3] overflow-hidden">
        <img
          src={movie.thumb_url || movie.poster_url}
          alt={movie.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
          onError={(e) => { e.target.src = 'https://via.placeholder.com/300x450?text=No+Image' }}
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Quality Badge */}
        {movie.quality && (
          <span className="absolute top-2 left-2 px-2.5 py-1 text-[10px] sm:text-xs font-black bg-gradient-to-r from-red-700 to-red-500 text-white rounded-md uppercase tracking-wider shadow-[0_2px_10px_rgba(229,9,20,0.5)] border border-red-400/30 z-10">
            {movie.quality === 'HD' ? 'Full HD' : movie.quality}
          </span>
        )}

        {/* Episode/Status Badge */}
        {movie.current_episode && (
          <span className="absolute top-2 right-2 px-2.5 py-1 text-[10px] sm:text-xs font-bold bg-black/60 backdrop-blur-md text-white rounded-md border border-white/20 shadow-lg z-10">
            {movie.current_episode}
          </span>
        )}

        {/* Play Button on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-12 h-12 rounded-full bg-[var(--color-accent)]/90 flex items-center justify-center backdrop-blur-sm">
            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-white line-clamp-2 group-hover:text-[var(--color-accent)] transition-colors">
          {movie.name}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          {movie.year && (
            <span className="text-xs text-[var(--color-text-muted)]">{movie.year}</span>
          )}
          {movie.language && (
            <span className="text-xs text-[var(--color-text-muted)]">{movie.language}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
