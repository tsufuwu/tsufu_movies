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

  return (
    <div className="pt-16">
      {/* Player */}
      <div className="bg-black">
        <div className="max-w-6xl mx-auto">
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
        </div>
      </div>

      {/* Movie Info + Episodes */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
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
