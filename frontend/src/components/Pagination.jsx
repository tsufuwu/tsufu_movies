export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  const pages = []
  const maxVisible = 5
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages, start + maxVisible - 1)
  
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1)
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  const baseBtnClass = "w-10 h-10 flex items-center justify-center rounded-full text-base font-bold transition-all duration-300 select-none"
  const inactiveBtnClass = "bg-white/5 text-gray-300 hover:bg-white/20 hover:text-white border border-white/5 hover:border-white/20"
  const activeBtnClass = "bg-[#E50914] text-white shadow-[0_0_15px_rgba(229,9,20,0.6)] transform scale-110"
  const disabledBtnClass = "bg-transparent text-gray-600 cursor-not-allowed opacity-50"

  return (
    <div 
      className="flex items-center justify-center gap-2" 
      style={{ marginTop: '4rem', marginBottom: '4rem', paddingTop: '1rem', clear: 'both' }}
    >
      {/* Prev Button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`${baseBtnClass} ${currentPage === 1 ? disabledBtnClass : inactiveBtnClass}`}
        aria-label="Trang trước"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* First Page */}
      {start > 1 && (
        <>
          <button onClick={() => onPageChange(1)} className={`${baseBtnClass} ${inactiveBtnClass}`}>1</button>
          {start > 2 && <span className="text-gray-500 font-bold px-1">...</span>}
        </>
      )}

      {/* Pages */}
      {pages.map(p => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`${baseBtnClass} ${p === currentPage ? activeBtnClass : inactiveBtnClass}`}
        >
          {p}
        </button>
      ))}

      {/* Last Page */}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="text-gray-500 font-bold px-1">...</span>}
          <button onClick={() => onPageChange(totalPages)} className={`${baseBtnClass} ${inactiveBtnClass}`}>{totalPages}</button>
        </>
      )}

      {/* Next Button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`${baseBtnClass} ${currentPage === totalPages ? disabledBtnClass : inactiveBtnClass}`}
        aria-label="Trang sau"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}
