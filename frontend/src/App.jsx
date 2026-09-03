import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import MovieDetailPage from './pages/MovieDetailPage'
import WatchPage from './pages/WatchPage'
import SearchPage from './pages/SearchPage'
import GenrePage from './pages/GenrePage'
import CategoryPage from './pages/CategoryPage'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-primary)]">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/phim/:slug" element={<MovieDetailPage />} />
          <Route path="/xem/:slug" element={<WatchPage />} />
          <Route path="/xem/:slug/:episodeSlug" element={<WatchPage />} />
          <Route path="/tim-kiem" element={<SearchPage />} />
          <Route path="/the-loai/:slug" element={<GenrePage />} />
          <Route path="/danh-sach/:type" element={<CategoryPage />} />
          <Route path="/quoc-gia/:slug" element={<GenrePage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
