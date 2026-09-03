import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import MovieCard from '../components/MovieCard'
import Pagination from '../components/Pagination'
import LoadingSpinner from '../components/LoadingSpinner'
import { searchMovies } from '../api/movieApi'

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const hp = searchParams.get('_hp') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)
  const [movies, setMovies] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query.trim()) return
    async function fetchResults() {
      setLoading(true)
      try {
        const data = await searchMovies(query, page, hp)
        setMovies(data.items || [])
        setTotalPages(data.paginate?.total_page || 1)
      } catch (err) {
        console.error('Search failed:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchResults()
  }, [query, page, hp])

  const handlePageChange = (newPage) => {
    setSearchParams({ q: query, page: newPage.toString() })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="px-4 sm:px-6 max-w-7xl mx-auto min-h-screen" style={{ paddingTop: '120px' }}>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          {query ? (
            <>Kết quả tìm kiếm: <span className="text-[var(--color-accent)]">"{query}"</span></>
          ) : (
            'Tìm Kiếm Phim'
          )}
        </h1>
        {movies.length > 0 && (
          <p className="text-sm text-[var(--color-text-muted)] mt-2">Tìm thấy {movies.length} kết quả</p>
        )}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : movies.length === 0 && query ? (
        <div className="text-center py-20">
          <svg className="w-16 h-16 mx-auto text-[var(--color-text-muted)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-lg text-[var(--color-text-muted)]">Không tìm thấy phim nào</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Thử từ khóa khác</p>
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
