/**
 * SmartVideoPlayer
 * - Có m3u8 → HLS player với ghi nhớ và tự động phục hồi tiến độ xem (timestamp)
 * - Có embed → iframe trực tiếp với sandbox (chặn popup ads)
 */
import { useRef, useEffect, useState } from 'react'
import Hls from 'hls.js'

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60)
    const remMins = mins % 60
    return `${hrs}:${remMins < 10 ? '0' : ''}${remMins}:${secs < 10 ? '0' : ''}${secs}`
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

// ── HLS Player ───────────────────────────────────────────────────────────────
function HlsPlayer({ src, initialTime = 0, onProgress, onFatalError }) {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const [resumed, setResumed] = useState(false)
  const hasSeeked = useRef(false)
  const retryCount = useRef(0)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return
    hlsRef.current?.destroy()
    hasSeeked.current = false
    retryCount.current = 0

    const seekToInitial = () => {
      if (!hasSeeked.current && initialTime > 5) {
        hasSeeked.current = true
        // Only seek if initialTime is within reasonable range
        if (!video.duration || initialTime < video.duration - 5) {
          video.currentTime = initialTime
          setResumed(true)
          setTimeout(() => setResumed(false), 5000)
        }
      }
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        manifestLoadingTimeOut: 20000,
        manifestLoadingMaxRetry: 5,
        manifestLoadingRetryDelay: 1000,
        levelLoadingTimeOut: 20000,
        levelLoadingMaxRetry: 5,
        levelLoadingRetryDelay: 1000,
        fragLoadingTimeOut: 25000,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 1000,
        startFragPrefetch: true,
      })
      hlsRef.current = hls
      hls.loadSource(src)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        seekToInitial()
        video.play().catch(() => {})
      })

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.warn('[HlsPlayer] HLS Event Error:', data.type, data.details)

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (retryCount.current < 4) {
                retryCount.current += 1
                console.warn(`[HlsPlayer] Fatal network error. Attempting recovery #${retryCount.current}...`)
                setTimeout(() => {
                  hls.startLoad()
                }, 1000)
              } else {
                console.error('[HlsPlayer] Max network retries reached. Triggering fallback...')
                hls.destroy()
                onFatalError?.()
              }
              break

            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[HlsPlayer] Fatal media error. Recovering media...')
              hls.recoverMediaError()
              break

            default:
              console.error('[HlsPlayer] Unrecoverable fatal error, destroying player:', data)
              hls.destroy()
              onFatalError?.()
              break
          }
        }
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src
      video.addEventListener('loadedmetadata', seekToInitial, { once: true })
      video.play().catch(() => {})
    }

    return () => {
      hlsRef.current?.destroy()
      hlsRef.current = null
    }
  }, [src, initialTime, onFatalError])

  const handleTimeUpdate = () => {
    const video = videoRef.current
    if (video && onProgress) {
      onProgress({
        currentTime: video.currentTime,
        duration: video.duration || 0,
      })
    }
  }

  const handleRestart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      setResumed(false)
      if (onProgress) {
        onProgress({ currentTime: 0, duration: videoRef.current.duration || 0, force: true })
      }
    }
  }

  return (
    <div className="relative w-full h-full">
      {resumed && (
        <div className="absolute top-3 left-3 z-30 flex items-center gap-2 bg-black/85 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-lg text-xs text-white shadow-xl">
          <span>Đang tiếp tục từ {formatTime(initialTime)}</span>
          <button
            onClick={handleRestart}
            className="text-red-400 hover:text-red-300 font-semibold underline ml-1 cursor-pointer transition-colors"
          >
            Xem từ đầu
          </button>
        </div>
      )}
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onPause={handleTimeUpdate}
        onEnded={handleTimeUpdate}
      />
    </div>
  )
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
export default function SmartVideoPlayer({ m3u8Url, embedUrl, initialTime = 0, onProgress }) {
  const [hlsFailed, setHlsFailed] = useState(false)

  // Reset fallback state when m3u8Url changes
  useEffect(() => {
    setHlsFailed(false)
  }, [m3u8Url])

  // Ưu tiên 1: HLS direct (khi chưa bị fatal error)
  if (m3u8Url && !hlsFailed) {
    return (
      <div className="relative w-full aspect-video bg-black overflow-hidden">
        <Badge label="HLS Direct" color="bg-green-600" />
        <HlsPlayer
          src={m3u8Url}
          initialTime={initialTime}
          onProgress={onProgress}
          onFatalError={() => setHlsFailed(true)}
        />
      </div>
    )
  }

  // Ưu tiên 2: Embed iframe với sandbox để chặn popup ads (hoặc fallback nếu HLS lỗi)
  if (embedUrl) {
    return (
      <div className="relative w-full aspect-video bg-black overflow-hidden">
        <Badge
          label={hlsFailed ? "Embed Fallback" : "Embed"}
          color={hlsFailed ? "bg-amber-600" : "bg-yellow-600"}
        />
        <iframe
          key={embedUrl}
          src={embedUrl}
          className="w-full h-full border-0"
          title="Movie Player"
          sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-pointer-lock"
          allow="autoplay; fullscreen; picture-in-picture"
          referrerPolicy="no-referrer-when-downgrade"
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
