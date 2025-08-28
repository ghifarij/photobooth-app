export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-200/50 shadow-sm">
      <div className="container">
        <div className="px-4 py-3">
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-3">
              <img src="/Assessio.png" alt="Assessio" className="h-6 w-auto" />
              <span className="text-sm muted">Assessio</span>
            </div>

            <div className="w-px h-4 bg-gray-300"></div>

            <a
              href="/"
              className="text-sm px-3 py-1.5 rounded-md transition-all duration-200 hover:bg-gray-100 hover:text-blue-600 hover:scale-105 active:scale-95"
            >
              Home
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
