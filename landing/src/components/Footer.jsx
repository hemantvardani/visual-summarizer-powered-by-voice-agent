export function Footer() {
  return (
    <footer className="border-t border-white/5 px-4 py-12 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-3">
          <span className="text-gradient text-lg font-bold">Vizzy</span>
          <span className="text-sm text-zinc-600">|</span>
          <p className="text-sm text-zinc-500">
            Built by <span className="text-zinc-400">Hemant Vardani</span>
          </p>
        </div>
        <div className="flex gap-8 text-sm">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 transition hover:text-white"
          >
            GitHub
          </a>
          <a
            href="https://x.com/17vardani"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 transition hover:text-white"
          >
            @17vardani
          </a>
        </div>
      </div>
    </footer>
  )
}
