import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import SmartVideoPlayer from '../components/SmartVideoPlayer'
import { getMovieDetail, resolveStream } from '../api/movieApi'
import { watchHistory } from '../utils/watchHistory'

export default function WatchPage() {
  const { slug, episodeSlug } = useParams()
  const navigate = useNavigate()
  const [movie, setMovie] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentEpData, setCurrentEpData] = useState(null)
  const [currentEpName, setCurrentEpName] = useState('')
  const [activeServer, setActiveServer] = useState(0)
  const [streamLoading, setStreamLoading] = useState(false)
  const [streamError, setStreamError] = useState(false)
  const [initialTime, setInitialTime] = useState(0)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const data = await getMovieDetail(slug)
        const m = data.movie
        setMovie(m)

        if (m && m.episodes && m.episodes.length > 0) {
          const server = m.episodes[0]
          let targetEp = server.items[0]

          if (episodeSlug) {
            const found = server.items.find(ep => ep.slug === episodeSlug)
            if (found) targetEp = found
          }

          if (targetEp) {
            setCurrentEpName(targetEp.name)

            // Check saved watch progress in localStorage
            const saved = watchHistory.getProgress(slug, targetEp.slug)
            if (saved && saved.isCurrentEpisode && saved.currentTime > 5) {
              setInitialTime(saved.currentTime)
            } else {
              setInitialTime(0)
            }

            // Immediately register movie in history
            watchHistory.saveProgress({
              slug,
              name: m.name,
              poster_url: m.poster_url || m.thumb_url,
              episodeSlug: targetEp.slug,
              episodeName: targetEp.name,
              currentTime: saved?.currentTime || 0,
              duration: saved?.duration || 0,
              force: true,
            })

            await loadStream(targetEp)
          }
        }
      } catch (err) {
        console.error('Failed to load movie:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [slug, episodeSlug])

  const loadStream = async (ep) => {
    if (!ep) {
      setStreamError(true)
      return
    }
    setStreamLoading(true)
    setStreamError(false)
    
    try {
      if (ep.m3u8) {
        // Có sẵn link direct m3u8 từ API nguồn -> resolve để rewrite playlist & thêm CORS qua proxy
        try {
          const resolved = await resolveStream(ep.m3u8)
          setCurrentEpData({
            m3u8: resolved?.m3u8 || ep.m3u8,
            embed: ep.embed || null,
          })
        } catch {
          setCurrentEpData({ m3u8: ep.m3u8, embed: ep.embed || null })
        }
      } else if (ep.embed) {
        // Gọi server của mình để phân giải m3u8 hoặc proxy link embed
        const resolved = await resolveStream(ep.embed)
        setCurrentEpData({
          m3u8: resolved.m3u8 || null,
          embed: resolved.proxy_url || resolved.embed_url || null,
        })
      } else {
        setCurrentEpData(null)
      }
    } catch (err) {
      console.error('Resolve stream error:', err)
      // Fallback về link embed gốc nếu proxy bị lỗi
      setCurrentEpData({
        m3u8: null,
        embed: ep.embed || null
      })
    } finally {
      setStreamLoading(false)
    }
  }

  const handleProgress = ({ currentTime, duration, force = false }) => {
    if (!movie) return
    const epSlug = episodeSlug || (movie.episodes?.[activeServer]?.items?.[0]?.slug)
    watchHistory.saveProgress({
      slug,
      name: movie.name,
      poster_url: movie.poster_url || movie.thumb_url,
      episodeSlug: epSlug,
      episodeName: currentEpName,
      currentTime,
      duration,
      force,
    })
  }

  const handleEpisodeClick = async (ep) => {
    setCurrentEpName(ep.name)
    const saved = watchHistory.getProgress(slug, ep.slug)
    setInitialTime(saved && saved.isCurrentEpisode ? saved.currentTime : 0)

    navigate(`/xem/${slug}/${ep.slug}`, { replace: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
    await loadStream(ep)
  }

  if (loading) return <LoadingSpinner />
  if (!movie) return (
    <div className="pt-24 text-center">
      <p className="text-xl text-[var(--color-text-muted)]">Không tìm thấy phim</p>
    </div>
  )

  // Tính chỉ số tập hiện tại
  const currentServerItems = movie.episodes?.[activeServer]?.items || []
  const currentEpIndex = currentServerItems.findIndex(
    ep => ep.slug === episodeSlug || (!episodeSlug && currentServerItems.indexOf(ep) === 0)
  )
  const prevEp = currentEpIndex > 0 ? currentServerItems[currentEpIndex - 1] : null
  const nextEp = currentEpIndex < currentServerItems.length - 1 ? currentServerItems[currentEpIndex + 1] : null

  // Thông tin phim (categories flat)
  const allCategories = movie.categories?.flatMap(cat => cat.list.map(item => item.name)) || []

  // Sidebar content (danh sách tập + thông tin phim) - dùng lại ở cả sidebar và dưới
  const EpisodePanel = ({ compact = false }) => (
    <div className={compact ? '' : 'mt-8'}>
      {/* Server Tabs */}
      {movie.episodes && movie.episodes.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {movie.episodes.map((server, i) => (
            <button
              key={i}
              onClick={() => setActiveServer(i)}
              className={activeServer === i ? 'btn-server-active' : 'btn-server'}
            >
              {server.server_name}
            </button>
          ))}
        </div>
      )}

      {/* Episode List */}
      {movie.episodes && movie.episodes[activeServer] && (
        <div className={`bg-[#181818] rounded-xl ${compact ? 'p-4' : 'p-6'}`}>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-[#E50914] rounded-full" />
            Danh sách tập
            {!compact && <span className="text-gray-500 font-normal text-xs">– {movie.episodes[activeServer].server_name}</span>}
          </h3>
          <div className={`flex flex-wrap gap-2 ${compact ? 'max-h-80 overflow-y-auto pr-1' : ''}`}>
            {movie.episodes[activeServer].items.map((ep, i) => {
              const isActive = ep.slug === episodeSlug || (!episodeSlug && i === 0 && activeServer === 0)
              return (
                <button
                  key={i}
                  onClick={() => handleEpisodeClick(ep)}
                  className={isActive ? 'btn-episode-active' : 'btn-episode'}
                >
                  {ep.name}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  // Thông tin phim mini (dùng ở sidebar)
  const MovieInfoMini = () => (
    <div className="bg-[#181818] rounded-xl p-4 mt-4">
      <Link
        to={`/phim/${movie.slug}`}
        className="flex gap-3 group mb-4"
      >
        <img
          src={movie.thumb_url || movie.poster_url}
          alt={movie.name}
          className="w-16 h-22 object-cover rounded-lg shrink-0 group-hover:opacity-80 transition-opacity"
          style={{ height: '5.5rem' }}
        />
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-white line-clamp-2 group-hover:text-[#E50914] transition-colors">
            {movie.name}
          </h4>
          {movie.original_name && movie.original_name !== movie.name && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-1">{movie.original_name}</p>
          )}
          <div className="flex flex-wrap gap-1 mt-2">
            {movie.quality && <span className="badge-quality text-xs px-1.5 py-0.5">{movie.quality}</span>}
            {movie.language && <span className="badge-lang text-xs px-1.5 py-0.5">{movie.language}</span>}
          </div>
        </div>
      </Link>

      {/* Rating badges */}
      {(movie.imdb || movie.metacritic || movie.rotten_tomatoes) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {movie.imdb && (
            <div className="flex items-center gap-1 bg-[#F5C518]/10 border border-[#F5C518]/30 rounded-lg px-2 py-1">
              <span className="text-[#F5C518] text-xs font-black">IMDb</span>
              <span className="text-white text-xs font-bold">{movie.imdb}</span>
            </div>
          )}
          {movie.metacritic && (
            <div className="flex items-center gap-1 bg-[#00CE7A]/10 border border-[#00CE7A]/30 rounded-lg px-2 py-1">
              <span className="text-[#00CE7A] text-xs font-black">MC</span>
              <span className="text-white text-xs font-bold">{movie.metacritic}</span>
            </div>
          )}
          {movie.rotten_tomatoes && (
            <div className="flex items-center gap-1 bg-[#FA320A]/10 border border-[#FA320A]/30 rounded-lg px-2 py-1">
              <span className="text-[#FA320A] text-xs font-black">🍅</span>
              <span className="text-white text-xs font-bold">{movie.rotten_tomatoes}</span>
            </div>
          )}
        </div>
      )}

      {allCategories.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {allCategories.slice(0, 4).map((cat, i) => (
            <span key={i} className="text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">{cat}</span>
          ))}
        </div>
      )}

      <Link
        to={`/phim/${movie.slug}`}
        className="mt-3 block text-xs text-center text-[#E50914] hover:text-red-400 transition-colors font-semibold"
      >
        Xem chi tiết phim →
      </Link>
    </div>
  )

  return (
    <div className="pt-16">
      {/* Player Area */}
      <div className="bg-black">
        {/* Desktop: flex row layout; Mobile: single column */}
        <div className="max-w-[1600px] mx-auto flex flex-col xl:flex-row xl:items-start gap-0">
          
          {/* Video Player */}
          <div className="w-full xl:flex-1 min-w-0">
            {streamLoading ? (
              <div className="w-full aspect-video flex items-center justify-center bg-[var(--color-bg-secondary)]">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full border-4 border-[var(--color-bg-hover)] border-t-[var(--color-accent)] animate-spin mx-auto mb-3" />
                  <p className="text-sm text-[var(--color-text-muted)]">Đang tải nguồn phát...</p>
                </div>
              </div>
            ) : streamError ? (
              <div className="w-full aspect-video flex items-center justify-center bg-[var(--color-bg-secondary)]">
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto text-[var(--color-text-muted)] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <p className="text-[var(--color-text-muted)]">Không thể tải nguồn phát</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">Vui lòng thử tập khác hoặc quay lại sau</p>
                </div>
              </div>
            ) : currentEpData ? (
              <SmartVideoPlayer
                m3u8Url={currentEpData.m3u8}
                embedUrl={currentEpData.embed}
                initialTime={initialTime}
                onProgress={handleProgress}
              />
            ) : (
              <div className="w-full aspect-video flex items-center justify-center bg-[var(--color-bg-secondary)]">
                <p className="text-[var(--color-text-muted)]">Không có nguồn phát</p>
              </div>
            )}

            {/* Prev / Next episode buttons bên dưới player */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#0a0a0a] border-t border-gray-800/50">
              <button
                onClick={() => prevEp && handleEpisodeClick(prevEp)}
                disabled={!prevEp}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  prevEp
                    ? 'bg-[#181818] hover:bg-[#E50914] text-white hover:text-white border border-gray-700 hover:border-[#E50914]'
                    : 'bg-[#111] text-gray-600 border border-gray-800 cursor-not-allowed'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
                {prevEp ? `Tập: ${prevEp.name}` : 'Tập đầu tiên'}
              </button>

              <div className="text-xs text-gray-500 font-medium hidden sm:block">
                {movie.name}
                {currentEpName && <span className="text-gray-600 ml-1">| {currentEpName}</span>}
              </div>

              <button
                onClick={() => nextEp && handleEpisodeClick(nextEp)}
                disabled={!nextEp}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  nextEp
                    ? 'bg-[#181818] hover:bg-[#E50914] text-white hover:text-white border border-gray-700 hover:border-[#E50914]'
                    : 'bg-[#111] text-gray-600 border border-gray-800 cursor-not-allowed'
                }`}
              >
                {nextEp ? `Tập: ${nextEp.name}` : 'Tập cuối'}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Sidebar – chỉ hiện trên xl (desktop rộng), bên phải player */}
          <div className="hidden xl:flex xl:flex-col w-[380px] shrink-0 bg-[#0d0d0d] border-l border-gray-800/60 h-fit sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="p-4">
              {/* Tiêu đề phim */}
              <div className="mb-4">
                <Link to={`/phim/${movie.slug}`} className="text-sm text-gray-500 hover:text-white transition-colors">
                  ← Chi tiết phim
                </Link>
                <h2 className="text-base font-bold text-white mt-1 line-clamp-2">{movie.name}</h2>
                {currentEpName && <p className="text-sm text-gray-400">{currentEpName}</p>}
              </div>

              {/* Rating */}
              {(movie.imdb || movie.metacritic || movie.rotten_tomatoes) && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {movie.imdb && (
                    <div className="flex items-center gap-1.5 bg-[#F5C518]/10 border border-[#F5C518]/30 rounded-lg px-2.5 py-1.5">
                      <span className="text-[#F5C518] text-xs font-black">IMDb</span>
                      <span className="text-white text-sm font-bold">{movie.imdb}</span>
                    </div>
                  )}
                  {movie.metacritic && (
                    <div className="flex items-center gap-1.5 bg-[#00CE7A]/10 border border-[#00CE7A]/30 rounded-lg px-2.5 py-1.5">
                      <span className="text-[#00CE7A] text-xs font-black">MC</span>
                      <span className="text-white text-sm font-bold">{movie.metacritic}</span>
                    </div>
                  )}
                  {movie.rotten_tomatoes && (
                    <div className="flex items-center gap-1.5 bg-[#FA320A]/10 border border-[#FA320A]/30 rounded-lg px-2.5 py-1.5">
                      <span className="text-[#FA320A] text-xs font-black">🍅</span>
                      <span className="text-white text-sm font-bold">{movie.rotten_tomatoes}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Server Tabs */}
              {movie.episodes && movie.episodes.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {movie.episodes.map((server, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveServer(i)}
                      className={activeServer === i ? 'btn-server-active' : 'btn-server'}
                    >
                      {server.server_name}
                    </button>
                  ))}
                </div>
              )}

              {/* Episode list */}
              {movie.episodes && movie.episodes[activeServer] && (
                <div className="bg-[#181818] rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-[#E50914] rounded-full" />
                    Danh sách tập – {movie.episodes[activeServer].server_name}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {movie.episodes[activeServer].items.map((ep, i) => {
                      const isActive = ep.slug === episodeSlug || (!episodeSlug && i === 0 && activeServer === 0)
                      return (
                        <button
                          key={i}
                          onClick={() => handleEpisodeClick(ep)}
                          className={isActive ? 'btn-episode-active' : 'btn-episode'}
                        >
                          {ep.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Movie description */}
              {movie.description && (
                <div className="mt-4 text-xs text-gray-400 leading-relaxed line-clamp-6">
                  {movie.description}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Movie Info + Episodes (below player – full width, luôn hiển thị trên mọi màn hình) */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Link
              to={`/phim/${movie.slug}`}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              &larr; Chi tiết phim
            </Link>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white mb-2">
            {movie.name}
            {currentEpName && <span className="text-gray-400 font-medium text-xl sm:text-3xl ml-2">| {currentEpName}</span>}
          </h1>
          {movie.original_name && movie.original_name !== movie.name && (
            <p className="text-lg text-gray-400 mt-4 mb-8" style={{ marginTop: "1rem", marginBottom: "2rem" }}>{movie.original_name}</p>
          )}
        </div>

        {/* Server Tabs */}
        {movie.episodes && movie.episodes.length > 1 && (
          <div className="flex flex-wrap gap-3 mb-6 mt-8" style={{ marginTop: "2rem" }}>
            {movie.episodes.map((server, i) => (
              <button
                key={i}
                onClick={() => setActiveServer(i)}
                className={activeServer === i ? 'btn-server-active' : 'btn-server'}
              >
                {server.server_name}
              </button>
            ))}
          </div>
        )}

        {/* Episode List */}
        {movie.episodes && movie.episodes[activeServer] && (
          <div className="bg-[#181818] rounded-xl p-6 mt-8" style={{ marginTop: "2rem" }}>
            <h3 className="text-sm font-semibold text-white mb-6 flex items-center gap-3 text-lg" style={{ marginBottom: "1.5rem" }}>
              <span className="w-1.5 h-5 bg-[#E50914] rounded-full" />
              Danh sách tập - {movie.episodes[activeServer].server_name}
            </h3>
            <div className="flex flex-wrap gap-2">
              {movie.episodes[activeServer].items.map((ep, i) => {
                const isActive = ep.slug === episodeSlug || (!episodeSlug && i === 0 && activeServer === 0)
                return (
                  <button
                    key={i}
                    onClick={() => handleEpisodeClick(ep)}
                    className={isActive ? 'btn-episode-active' : 'btn-episode'}
                  >
                    {ep.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
