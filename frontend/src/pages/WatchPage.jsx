import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import SmartVideoPlayer from '../components/SmartVideoPlayer'
import { getMovieDetail, resolveStream, getRatings } from '../api/movieApi'
import { watchHistory } from '../utils/watchHistory'

// ── Ratings Badges ────────────────────────────────────────────────────────────
function RatingBadge({ label, value, color, icon }) {
  if (!value) return null
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${color} text-xs font-bold`}>
      <span className="text-base leading-none">{icon}</span>
      <div>
        <div className="text-[10px] font-medium opacity-70 leading-none mb-0.5">{label}</div>
        <div className="text-sm font-extrabold leading-none">{value}</div>
      </div>
    </div>
  )
}

function RatingsRow({ ratings }) {
  if (!ratings || !ratings.found) return null
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {ratings.imdb && (
        <RatingBadge
          label="IMDb"
          value={`${ratings.imdb}/10`}
          icon="⭐"
          color="border-yellow-500/40 bg-yellow-500/10 text-yellow-400"
        />
      )}
      {ratings.rotten_tomatoes && (
        <RatingBadge
          label="Rotten Tomatoes"
          value={ratings.rotten_tomatoes}
          icon="🍅"
          color="border-red-500/40 bg-red-500/10 text-red-400"
        />
      )}
      {ratings.metacritic && (
        <RatingBadge
          label="Metacritic"
          value={`${ratings.metacritic}/100`}
          icon="📊"
          color="border-green-500/40 bg-green-500/10 text-green-400"
        />
      )}
    </div>
  )
}

// ── Episode list (reusable in sidebar & bottom) ───────────────────────────────
function EpisodeList({ episodes, activeServer, setActiveServer, episodeSlug, handleEpisodeClick, compact = false }) {
  if (!episodes || !episodes[activeServer]) return null
  return (
    <>
      {/* Server Tabs */}
      {episodes.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {episodes.map((server, i) => (
            <button
              key={i}
              onClick={() => setActiveServer(i)}
              className={activeServer === i ? 'btn-server-active' : 'btn-server'}
              style={{ padding: compact ? '0.4rem 0.9rem' : undefined, fontSize: compact ? '0.8rem' : undefined }}
            >
              {server.server_name}
            </button>
          ))}
        </div>
      )}

      {/* Episodes */}
      <div className={`flex flex-wrap gap-1.5 ${compact ? 'max-h-64 overflow-y-auto pr-1 hide-scrollbar' : ''}`}>
        {episodes[activeServer].items.map((ep, i) => {
          const isActive = ep.slug === episodeSlug || (!episodeSlug && i === 0 && activeServer === 0)
          return (
            <button
              key={i}
              onClick={() => handleEpisodeClick(ep)}
              className={isActive ? 'btn-episode-active' : 'btn-episode'}
              style={compact ? { padding: '0.4rem 0.8rem', fontSize: '0.85rem', minWidth: '3rem' } : undefined}
            >
              {ep.name}
            </button>
          )
        })}
      </div>
    </>
  )
}

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
  const [ratings, setRatings] = useState(null)

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

        // Fetch ratings in background (non-blocking)
        const titleForRatings = m.original_name && m.original_name !== m.name
          ? m.original_name
          : m.name
        getRatings(titleForRatings, m.year || '').then(r => setRatings(r))
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

  // ── Compute prev / next episode ──────────────────────────────────────────────
  const currentItems = movie?.episodes?.[activeServer]?.items || []
  const currentEpIndex = currentItems.findIndex(ep =>
    ep.slug === episodeSlug || (!episodeSlug && currentItems.indexOf(ep) === 0)
  )
  const prevEp = currentEpIndex > 0 ? currentItems[currentEpIndex - 1] : null
  const nextEp = currentEpIndex < currentItems.length - 1 && currentEpIndex >= 0
    ? currentItems[currentEpIndex + 1]
    : null

  if (loading) return <LoadingSpinner />
  if (!movie) return (
    <div className="pt-24 text-center">
      <p className="text-xl text-[var(--color-text-muted)]">Không tìm thấy phim</p>
    </div>
  )

  return (
    <div className="pt-16">
      {/* ── Player Area (2-col on lg+) ─────────────────────────────────────── */}
      <div className="bg-black">
        <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row">

          {/* Player */}
          <div className="lg:flex-1 min-w-0">
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

          {/* ── Desktop Sidebar (hidden on mobile) ──────────────────────────── */}
          <div className="hidden lg:flex flex-col w-[380px] xl:w-[440px] shrink-0 bg-black justify-center">

            {/* Inner wrapper – centered, padded symmetrically */}
            <div className="px-8 py-10 flex flex-col gap-7">

              {/* ① Movie info */}
              <div className="flex items-center gap-5">
                <img
                  src={movie.thumb_url || movie.poster_url}
                  alt={movie.name}
                  className="w-24 h-32 rounded-2xl object-cover shrink-0 shadow-2xl ring-1 ring-white/10"
                  onError={e => { e.target.style.display = 'none' }}
                />
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/phim/${movie.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#E50914] transition-colors mb-2.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                    Chi tiết phim
                  </Link>
                  <h2 className="text-xl font-extrabold text-white leading-snug line-clamp-2 mb-1.5">{movie.name}</h2>
                  {movie.original_name && movie.original_name !== movie.name && (
                    <p className="text-sm text-gray-500 line-clamp-1 mb-2.5">{movie.original_name}</p>
                  )}
                  {currentEpName && (
                    <span className="inline-block text-sm font-extrabold text-white bg-[#E50914] px-3.5 py-1.5 rounded-xl shadow-md shadow-red-900/40">
                      {currentEpName}
                    </span>
                  )}
                </div>
              </div>

              {/* ② Ratings */}
              {ratings && ratings.found && (ratings.imdb || ratings.rotten_tomatoes || ratings.metacritic) && (
                <div className="flex flex-wrap gap-3">
                  {ratings.imdb && (
                    <div className="flex items-center gap-3 bg-white/5 border border-yellow-500/25 rounded-2xl px-5 py-3">
                      <span className="text-2xl">⭐</span>
                      <div>
                        <div className="text-xs text-yellow-500/60 font-bold uppercase tracking-widest leading-none mb-1">IMDb</div>
                        <div className="text-xl font-extrabold text-yellow-400 leading-none">{ratings.imdb}<span className="text-sm text-yellow-500/50 ml-0.5">/10</span></div>
                      </div>
                    </div>
                  )}
                  {ratings.rotten_tomatoes && (
                    <div className="flex items-center gap-3 bg-white/5 border border-red-500/25 rounded-2xl px-5 py-3">
                      <span className="text-2xl">🍅</span>
                      <div>
                        <div className="text-xs text-red-400/60 font-bold uppercase tracking-widest leading-none mb-1">RT</div>
                        <div className="text-xl font-extrabold text-red-400 leading-none">{ratings.rotten_tomatoes}</div>
                      </div>
                    </div>
                  )}
                  {ratings.metacritic && (
                    <div className="flex items-center gap-3 bg-white/5 border border-green-500/25 rounded-2xl px-5 py-3">
                      <span className="text-2xl">📊</span>
                      <div>
                        <div className="text-xs text-green-400/60 font-bold uppercase tracking-widest leading-none mb-1">MC</div>
                        <div className="text-xl font-extrabold text-green-400 leading-none">{ratings.metacritic}<span className="text-sm text-green-500/50 ml-0.5">/100</span></div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ③ Divider */}
              <div className="border-t border-white/10" />

              {/* ④ Prev / Next */}
              <div className="flex gap-4">
                <button
                  onClick={() => prevEp && handleEpisodeClick(prevEp)}
                  disabled={!prevEp}
                  style={{ flex: 1 }}
                  className={[
                    'flex items-center justify-center gap-2.5 py-4 rounded-2xl text-base font-extrabold transition-all duration-200',
                    prevEp
                      ? 'bg-white/10 text-gray-200 hover:bg-white hover:text-black border border-white/15 hover:scale-[1.02]'
                      : 'bg-white/4 text-gray-700 cursor-not-allowed border border-white/8'
                  ].join(' ')}
                >
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                  Tập trước
                </button>
                <button
                  onClick={() => nextEp && handleEpisodeClick(nextEp)}
                  disabled={!nextEp}
                  style={{ flex: 1 }}
                  className={[
                    'flex items-center justify-center gap-2.5 py-4 rounded-2xl text-base font-extrabold transition-all duration-200',
                    nextEp
                      ? 'bg-[#E50914] text-white hover:bg-[#ff1a26] shadow-xl shadow-red-900/50 hover:scale-[1.02]'
                      : 'bg-[#E50914]/15 text-[#E50914]/30 cursor-not-allowed'
                  ].join(' ')}
                >
                  Tập tiếp
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* ⑤ Divider */}
              <div className="border-t border-white/10" />

              {/* ⑥ Episode list header + server tabs */}
              <div className="flex items-center justify-between">
                <span className="text-base font-extrabold text-white flex items-center gap-2.5">
                  <span className="w-1.5 h-5 bg-[#E50914] rounded-full inline-block" />
                  Danh sách tập
                </span>
                {movie.episodes && movie.episodes.length > 1 && (
                  <div className="flex gap-2">
                    {movie.episodes.map((server, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveServer(i)}
                        className={[
                          'text-sm font-bold px-4 py-2 rounded-xl transition-all duration-150',
                          activeServer === i
                            ? 'bg-white text-black shadow-md'
                            : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'
                        ].join(' ')}
                      >
                        {server.server_name.replace('Vietsub', 'VS').replace('Thuyết Minh', 'TM').replace('Lồng Tiếng', 'LT')}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ⑦ Episode grid */}
              <div className="overflow-y-auto hide-scrollbar" style={{ maxHeight: '180px' }}>
                {movie.episodes && movie.episodes[activeServer] && (
                  <div className="flex flex-wrap gap-2.5">
                    {movie.episodes[activeServer].items.map((ep, i) => {
                      const isActive = ep.slug === episodeSlug || (!episodeSlug && i === 0 && activeServer === 0)
                      return (
                        <button
                          key={i}
                          onClick={() => handleEpisodeClick(ep)}
                          className={[
                            'text-sm font-extrabold px-4 py-3 rounded-xl transition-all duration-150 min-w-[3.5rem]',
                            isActive
                              ? 'bg-[#E50914] text-white shadow-lg shadow-red-900/50 scale-105'
                              : 'bg-white/8 text-gray-300 hover:bg-white hover:text-black border border-white/10 hover:scale-105'
                          ].join(' ')}
                        >
                          {ep.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

            </div>{/* end inner wrapper */}
          </div>
          {/* ── End Sidebar ─────────────────────────────────────────────────── */}
        </div>
      </div>

      {/* ── Below-player info (all screens; sidebar duplicate on desktop) ──── */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Link
              to={`/phim/${movie.slug}`}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← Chi tiết phim
            </Link>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white mb-2">
            {movie.name}
            {currentEpName && <span className="text-gray-400 font-medium text-xl sm:text-3xl ml-2">| {currentEpName}</span>}
          </h1>
          {movie.original_name && movie.original_name !== movie.name && (
            <p className="text-lg text-gray-400 mt-4 mb-2">{movie.original_name}</p>
          )}
          {/* Ratings row (below player on all screens) */}
          <RatingsRow ratings={ratings} />

          {/* Prev / Next – below player on mobile */}
          <div className="flex gap-3 mt-4 lg:hidden">
            <button
              onClick={() => prevEp && handleEpisodeClick(prevEp)}
              disabled={!prevEp}
              className="flex items-center gap-2 py-2.5 px-5 rounded-xl text-sm font-bold transition-all
                disabled:opacity-30 disabled:cursor-not-allowed
                enabled:bg-[#282828] enabled:text-gray-200 enabled:hover:bg-white enabled:hover:text-black"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              Tập trước
            </button>
            <button
              onClick={() => nextEp && handleEpisodeClick(nextEp)}
              disabled={!nextEp}
              className="flex items-center gap-2 py-2.5 px-5 rounded-xl text-sm font-bold transition-all
                disabled:opacity-30 disabled:cursor-not-allowed
                enabled:bg-[#E50914] enabled:text-white enabled:hover:bg-[#F40612]"
            >
              Tập tiếp theo
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Server Tabs + Episode List – below player (all screens) */}
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
