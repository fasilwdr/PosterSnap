export default function Header() {
  return (
    <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-pink-500 font-bold text-white">
          P
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white">PosterSnap</h1>
          <p className="text-xs text-white/50">HTML → PNG / JPG / GIF</p>
        </div>
      </div>
      <p className="hidden text-sm text-white/50 sm:block">
        No backend · runs entirely in your browser
      </p>
    </header>
  )
}
