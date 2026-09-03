export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] w-full">
      <div className="relative flex items-center justify-center w-16 h-16">
        {/* Outer track */}
        <div className="absolute inset-0 rounded-full border-4 border-[var(--color-bg-hover)]"></div>
        {/* Outer spinner */}
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[var(--color-accent)] animate-spin"></div>
        
        {/* Inner track */}
        <div className="absolute inset-3 rounded-full border-4 border-[var(--color-bg-hover)]"></div>
        {/* Inner spinner */}
        <div className="absolute inset-3 rounded-full border-4 border-transparent border-b-white animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
      </div>
    </div>
  )
}
