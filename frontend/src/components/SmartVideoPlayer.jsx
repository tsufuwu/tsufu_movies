/**
 * SmartVideoPlayer
 * - Có m3u8 → HLS player
 * - Có embed → iframe trực tiếp với sandbox (chặn popup ads)
 *   sandbox không có allow-popups → window.open() bị block hoàn toàn
 */
import { useRef, useEffect } from 'react'
import Hls from 'hls.js'

// ── HLS Player ───────────────────────────────────────────────────────────────
function HlsPlayer({ src }) {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return
    hlsRef.current?.destroy()

    if (Hls.isSupported()) {
      const hls = new Hls()
      hlsRef.current = hls
      hls.loadSource(src)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}))
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src
      video.play().catch(() => {})
    }
    return () => { hlsRef.current?.destroy(); hlsRef.current = null }
  }, [src])

  return <video ref={videoRef} className="w-full h-full" controls playsInline />
}

// ── Badge ────────────────────────────────────────────────────────────────────
function Badge({ label, color }) {
  return (
    <span className={`absolute top-2 right-2 z-20 text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${color} opacity-70 hover:opacity-100 transition-opacity select-none pointer-events-none`}>
      {label}
    </span>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function SmartVideoPlayer({ m3u8Url, embedUrl }) {
  // Ưu tiên 1: HLS direct
  if (m3u8Url) {
    return (
      <div className="relative w-full aspect-video bg-black overflow-hidden">
        <Badge label="HLS Direct" color="bg-green-600" />
        <HlsPlayer src={m3u8Url} />
      </div>
    )
  }

  // Ưu tiên 2: Embed iframe với sandbox để chặn popup ads
  // sandbox KHÔNG có allow-popups → window.open() bị chặn hoàn toàn
  // allow-same-origin cần để player.js của streamc hoạt động
  if (embedUrl) {
    return (
      <div className="relative w-full aspect-video bg-black overflow-hidden">
        <Badge label="Embed" color="bg-yellow-600" />
        <iframe
          key={embedUrl}
          src={embedUrl}
          className="w-full h-full border-0"
          allowFullScreen
          title="Movie Player"
          sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-pointer-lock"
          allow="autoplay; fullscreen; picture-in-picture"
          referrerPolicy="no-referrer"
        />
      </div>
    )
  }

  // Không có nguồn
  return (
    <div className="w-full aspect-video bg-black flex items-center justify-center">
      <p className="text-gray-400 text-sm">Không có nguồn phát cho tập này.</p>
    </div>
  )
}
