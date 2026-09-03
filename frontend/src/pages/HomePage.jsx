import { useState, useEffect } from 'react'
import HeroBanner from '../components/HeroBanner'
import MovieRow from '../components/MovieRow'
import ContinueWatchingRow from '../components/ContinueWatchingRow'
import LoadingSpinner from '../components/LoadingSpinner'
import { getLatestMovies, getSingleMovies, getSeriesMovies, getAnimeMovies } from '../api/movieApi'

// Helper kiểm tra ảnh có đạt chuẩn HD (width >= 1280px)
const checkImageHD = (src) => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      // Đạt chuẩn HD nếu chiều rộng >= 1280 (chuẩn 720p/1080p ngang)
      if (img.width >= 1280) {
        resolve(true)
      } else {
        resolve(false)
      }
    }
    img.onerror = () => resolve(false)
    img.src = src
  })
}

export default function HomePage() {
  const [latest, setLatest] = useState([])
  const [singles, setSingles] = useState([])
  const [series, setSeries] = useState([])
  const [loading, setLoading] = useState(true)
  const [heroMovie, setHeroMovie] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [latestData, singlesData, seriesData, animeData] = await Promise.all([
          getLatestMovies(1),
          getSingleMovies(1),
          getSeriesMovies(1),
          getAnimeMovies(1),
        ])
        
        setLatest(latestData.items || [])
        setSingles(singlesData.items || [])
        setSeries(seriesData.items || [])

        // 1. Lấy tất cả phim từ các danh mục để phong phú chủ đề
        const allMovies = [
          ...(latestData.items || []),
          ...(singlesData.items || []),
          ...(seriesData.items || []),
          ...(animeData.items || [])
        ]

        // 2. Lọc phim có poster_url và loại bỏ trùng lặp (dựa theo slug)
        const uniqueMoviesMap = new Map()
        allMovies.forEach(m => {
          if (m.poster_url) uniqueMoviesMap.set(m.slug, m)
        })
        const uniqueMovies = Array.from(uniqueMoviesMap.values())

        // 3. Trộn ngẫu nhiên (shuffle) để mỗi lần reload là một phim khác nhau
        const shuffled = uniqueMovies.sort(() => 0.5 - Math.random())

        // 4. Lấy tối đa 5-8 phim đầu tiên làm ứng cử viên để tránh load quá nhiều ảnh
        const candidates = shuffled.slice(0, 8)

        // 5. Kiểm tra song song chất lượng ảnh của các ứng cử viên
        const hdResults = await Promise.all(candidates.map(m => checkImageHD(m.poster_url)))
        
        // 6. Chọn phim ĐẦU TIÊN đạt chuẩn HD
        const hdIndex = hdResults.findIndex(isHD => isHD === true)
        
        if (hdIndex !== -1) {
          setHeroMovie(candidates[hdIndex])
        } else if (candidates.length > 0) {
          // Fallback: nếu xui xẻo không có ảnh nào HD trong tập kiểm tra, lấy tạm phim đầu tiên
          setHeroMovie(candidates[0])
        }

      } catch (err) {
        console.error('Failed to fetch movies:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <LoadingSpinner />

  return (
    <div>
      {heroMovie && <HeroBanner movie={heroMovie} />}
      <div className={heroMovie ? 'relative z-10' : 'pt-20'} style={{ marginTop: '3rem' }}>
        <ContinueWatchingRow />
        <MovieRow title="Phim Mới Cập Nhật" movies={latest} link="/danh-sach/phim-moi-cap-nhat" />
        <MovieRow title="Phim Lẻ" movies={singles} link="/danh-sach/phim-le" />
        <MovieRow title="Phim Bộ" movies={series} link="/danh-sach/phim-bo" />
      </div>
    </div>
  )
}
