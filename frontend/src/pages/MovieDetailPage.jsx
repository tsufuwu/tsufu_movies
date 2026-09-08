import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import { getMovieDetail } from '../api/movieApi'

export default function MovieDetailPage() {
  const { slug } = useParams()
  const [movie, setMovie] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchDetail() {
      setLoading(true)
      setError(null)
      try {
        const data = await getMovieDetail(slug)
        setMovie(data.movie)
      } catch (err) {
        setError('Không tìm thấy phim')
      } finally {
        setLoading(false)
      }
    }
    fetchDetail()
  }, [slug])

  if (loading) return <LoadingSpinner />
  if (error) return (
    <div className="pt-24 text-center">
      <p className="text-xl text-[var(--color-text-muted)]">{error}</p>
    </div>
  )
  if (!movie) return null

  const firstEpisode = movie.episodes?.[0]?.items?.[0]

  return (
    <div>
      {/* Backdrop */}
      <div className="relative h-[50vh] sm:h-[60vh] overflow-hidden">
        <img src={movie.poster_url || movie.thumb_url} alt={movie.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-primary)] via-[var(--color-bg-primary)]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-bg-primary)]/80 to-transparent" />
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-48 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="shrink-0">
            <img src={movie.thumb_url || movie.poster_url} alt={movie.name} className="w-48 sm:w-56 rounded-xl shadow-2xl shadow-black/50 mx-auto md:mx-0" />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-1">{movie.name}</h1>
            {movie.original_name && movie.original_name !== movie.name && (
              <p className="text-lg text-[var(--color-text-secondary)] mb-4">{movie.original_name}</p>
            )}

            <div className="flex flex-wrap gap-2 mb-4" style={{ marginBottom: "1rem" }}>
              {movie.quality && <span className="badge-quality">{movie.quality}</span>}
              {movie.language && <span className="badge-lang">{movie.language}</span>}
              {movie.current_episode && <span className="badge-quality bg-purple-600">{movie.current_episode}</span>}
              {movie.time && <span className="badge-lang">{movie.time}</span>}
            </div>

            {/* Rating Scores – IMDB, Metacritic, Rotten Tomatoes */}
            {(movie.imdb || movie.metacritic || movie.rotten_tomatoes) && (
              <div className="flex flex-wrap items-center gap-3 mb-5" style={{ marginBottom: "1.25rem" }}>
                {movie.imdb && (
                  <div className="flex items-center gap-2 bg-[#F5C518]/10 border border-[#F5C518]/40 rounded-xl px-4 py-2.5 hover:bg-[#F5C518]/15 transition-colors">
                    <div className="flex flex-col leading-none">
                      <span className="text-[#F5C518] text-[10px] font-black tracking-widest uppercase">IMDb</span>
                      <span className="text-white text-xl font-extrabold">{movie.imdb}</span>
                    </div>
                    <svg className="w-7 h-7 text-[#F5C518] opacity-80" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                )}
                {movie.metacritic && (
                  <div className="flex items-center gap-2 bg-[#00CE7A]/10 border border-[#00CE7A]/40 rounded-xl px-4 py-2.5 hover:bg-[#00CE7A]/15 transition-colors">
                    <div className="flex flex-col leading-none">
                      <span className="text-[#00CE7A] text-[10px] font-black tracking-widest uppercase">Metacritic</span>
                      <span className="text-white text-xl font-extrabold">{movie.metacritic}</span>
                    </div>
                    <div className="w-7 h-7 rounded-md bg-[#00CE7A] flex items-center justify-center text-white text-xs font-black">
                      MC
                    </div>
                  </div>
                )}
                {movie.rotten_tomatoes && (
                  <div className="flex items-center gap-2 bg-[#FA320A]/10 border border-[#FA320A]/40 rounded-xl px-4 py-2.5 hover:bg-[#FA320A]/15 transition-colors">
                    <div className="flex flex-col leading-none">
                      <span className="text-[#FA320A] text-[10px] font-black tracking-widest uppercase">Rotten Tomatoes</span>
                      <span className="text-white text-xl font-extrabold">{movie.rotten_tomatoes}</span>
                    </div>
                    <span className="text-2xl">🍅</span>
                  </div>
                )}
              </div>
            )}

            {movie.categories && movie.categories.length > 0 && (
              <div className="flex flex-wrap gap-4 mb-6 text-sm" style={{ marginBottom: "1rem", lineHeight: "1.8" }}>
                {movie.categories.map((cat, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-gray-500 font-medium">{cat.group_name}:</span>
                    <div className="flex gap-1">
                      {cat.list.map((item, j) => (
                        <span key={j} className="text-[var(--color-text-primary)]">{item.name}{j < cat.list.length - 1 ? ',' : ''}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {movie.director && (
              <p className="text-sm text-gray-400 mb-2" style={{ marginBottom: "0.5rem" }}>
                <span className="text-gray-500 font-medium">Đạo diễn: </span>{movie.director}
              </p>
            )}
            {movie.casts && (
              <p className="text-sm text-gray-400 mb-6" style={{ marginBottom: "1.5rem" }}>
                <span className="text-gray-500 font-medium">Diễn viên: </span>{movie.casts}
              </p>
            )}

            <p className="text-base text-gray-300 leading-relaxed mb-8" style={{ marginBottom: "2rem", lineHeight: "1.8" }}>{movie.description}</p>

            {firstEpisode && (
              <Link
                to={`/xem/${movie.slug}/${firstEpisode.slug}`}
                className="btn-play"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
                Xem Phim
              </Link>
            )}
          </div>
        </div>

        {/* Episode List */}
        {movie.episodes && movie.episodes.length > 0 && (
          <div className="mt-10">
            {movie.episodes.map((server, si) => (
              <div key={si} className="mb-8">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3" style={{ marginBottom: "1.5rem" }}>
                  <span className="w-1 h-6 bg-[#E50914] rounded-full" />
                  {server.server_name}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {server.items.map((ep, ei) => (
                    <Link
                      key={ei}
                      to={`/xem/${movie.slug}/${ep.slug}`}
                      className="btn-episode"
                    >
                      {ep.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
