import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import MovieCard from '../components/MovieCard'
import Pagination from '../components/Pagination'
import LoadingSpinner from '../components/LoadingSpinner'
import { getMoviesByType, getLatestMovies } from '../api/movieApi'

const TYPE_LABELS = {
  'phim-le': 'Phim Lẻ',
  'phim-bo': 'Phim Bộ',
  'hoat-hinh': 'Hoạt Hình',
  'tv-shows': 'TV Shows',
  'phim-moi-cap-nhat': 'Phim Mới Cập Nhật',
}

export default function CategoryPage() {
  const { type } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parseInt(searchParams.get('page') || '1', 10)
  const [movies, setMovies] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const title = TYPE_LABELS[type] || type

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        let data
        if (type === 'phim-moi-cap-nhat') {
          data = await getLatestMovies(page)
        } else {
          data = await getMoviesByType(type, page)
        }
        setMovies(data.items || [])
        setTotalPages(data.paginate?.total_page || 1)
      } catch (err) {
        console.error('Failed to fetch:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [type, page])

  const handlePageChange = (newPage) => {
    setSearchParams({ page: newPage.toString() })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="px-4 sm:px-6 max-w-7xl mx-auto min-h-screen" style={{ paddingTop: '120px' }}>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">{title}</h1>
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
