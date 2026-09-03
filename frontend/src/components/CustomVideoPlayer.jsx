import React from 'react';
import ReactPlayer from 'react-player';

const CustomVideoPlayer = ({ m3u8Url, embedUrl }) => {
  // Ưu tiên 1 (Tốt nhất - Nguồn HLS sạch)
  if (m3u8Url) {
    return (
      <div className="w-full aspect-video bg-black flex justify-center items-center">
        <ReactPlayer
          url={m3u8Url}
          playing={true}
          controls={true}
          width="100%"
          height="100%"
          config={{
            file: {
              forceHLS: true,
            }
          }}
        />
      </div>
    );
  }

  // Ưu tiên 2 (Tệ hơn - Nguồn Embed dính quảng cáo)
  if (!m3u8Url && embedUrl) {
    return (
      <div className="relative w-full aspect-video bg-black">
        {/* Banner cảnh báo */}
        <div className="absolute top-0 left-0 w-full bg-red-600/90 text-white text-sm text-center py-2 px-4 z-10 shadow-lg flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Luồng phát HLS đang bảo trì. Đang sử dụng server dự phòng. Vui lòng tắt chặn quảng cáo (Adblock/Brave Shields) để xem phim.
        </div>
        <iframe
          src={embedUrl}
          className="w-full h-full border-0 pt-10"
          allowFullScreen
          title="Movie Player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        ></iframe>
      </div>
    );
  }

  // Ưu tiên 3 (Tệ nhất - Không có nguồn phát)
  return (
    <div className="w-full aspect-video bg-black flex justify-center items-center">
      <span className="text-gray-400">
        Hệ thống đang cập nhật luồng phát cho tập phim này. Vui lòng quay lại sau.
      </span>
    </div>
  );
};

export default CustomVideoPlayer;
