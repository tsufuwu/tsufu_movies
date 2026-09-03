import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useLocation } from 'react-router-dom'
import MovieCard from '../components/MovieCard'
import Pagination from '../components/Pagination'
import LoadingSpinner from '../components/LoadingSpinner'
import { getMoviesByGenre, getMoviesByCountry } from '../api/movieApi'

const SLUG_TO_VIET = {
  'hanh-dong': 'Hành Động', 'tinh-cam': 'Tình Cảm', 'hai-huoc': 'Hài Hước',
  'kinh-di': 'Kinh Dị', 'vien-tuong': 'Viễn Tưởng', 'hoat-hinh': 'Hoạt Hình',
  'phieu-luu': 'Phiêu Lưu', 'tam-ly': 'Tâm Lý', 'hinh-su': 'Hình Sự',
  'chien-tranh': 'Chiến Tranh', 'co-trang': 'Cổ Trang', 'am-nhac': 'Âm Nhạc',
  'the-thao': 'Thể Thao', 'vo-thuat': 'Võ Thuật', 'bi-an': 'Bí Ẩn',
  'au-my': 'Âu Mỹ', 'han-quoc': 'Hàn Quốc', 'trung-quoc': 'Trung Quốc',
  'nhat-ban': 'Nhật Bản', 'thai-lan': 'Thái Lan', 'viet-nam': 'Việt Nam',
  'an-do': 'Ấn Độ', 'dai-loan': 'Đài Loan', 'hong-kong': 'Hồng Kông',
}

export default function GenrePage() {
  const { slug } = useParams()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parseInt(searchParams.get('page') || '1', 10)
  const [movies, setMovies] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const isCountry = location.pathname.startsWith('/quoc-gia')
  const title = SLUG_TO_VIET[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const fetcher = isCountry ? getMoviesByCountry : getMoviesByGenre
        const data = await fetcher(slug, page)
        setMovies(data.items || [])
        setTotalPages(data.paginate?.total_page || 1)
      } catch (err) {
        console.error('Failed to fetch:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [slug, page, isCountry])

  const handlePageChange = (newPage) => {
    setSearchParams({ page: newPage.toString() })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="px-4 sm:px-6 max-w-7xl mx-auto min-h-screen" style={{ paddingTop: '120px' }}>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          {isCountry ? 'Quốc Gia' : 'Thể Loại'}: <span className="text-[var(--color-accent)]">{title}</span>
        </h1>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : movies.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-lg text-[var(--color-text-muted)]">Không có phim nào</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {movies.map(movie => (
              <MovieCard key={movie.slug} movie={movie} />
            ))}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
        </>
      )}
    </div>
  )
}
