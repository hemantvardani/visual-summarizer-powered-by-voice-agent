import { motion } from 'framer-motion'

const MotionDiv = motion.div

export function DiagramMockup() {
  return (
    <MotionDiv
      className="relative mx-auto w-full max-w-[min(100%,420px)]"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="glass glow-border relative overflow-hidden rounded-2xl p-1">
        <div className="rounded-xl bg-gradient-to-br from-zinc-900/90 to-zinc-950 p-4">
          {/* Fake browser bar */}
          <div className="mb-3 flex items-center gap-2 border-b border-white/5 pb-3">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <div className="ml-2 flex-1 rounded-md bg-white/5 px-2 py-1 text-[10px] text-zinc-500">
              example.com/article
            </div>
          </div>
          {/* Fake page + overlay diagram */}
          <div className="relative h-[200px] overflow-hidden rounded-lg bg-zinc-800/50 sm:h-[220px]">
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-800/30 to-zinc-900/80" />
            <div className="absolute inset-2 opacity-40">
              <div className="h-2 w-3/4 rounded bg-zinc-600/50" />
              <div className="mt-2 h-2 w-full rounded bg-zinc-700/40" />
              <div className="mt-1 h-2 w-5/6 rounded bg-zinc-700/40" />
            </div>
            {/* Flowchart mock */}
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 280 200"
              fill="none"
              aria-hidden
            >
              <defs>
                <linearGradient id="nodeGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="#4c1d95" />
                  <stop offset="1" stopColor="#1e3a8a" />
                </linearGradient>
              </defs>
              <rect
                x="90"
                y="12"
                width="100"
                height="32"
                rx="6"
                stroke="#7c3aed"
                strokeWidth="1.5"
                fill="url(#nodeGrad)"
              />
              <text x="140" y="32" textAnchor="middle" fill="#c4b5fd" fontSize="10">
                Page topic
              </text>
              <path d="M140 44 L140 58" stroke="#6366f1" strokeWidth="1.5" />
              <path d="M60 58 L220 58" stroke="#6366f1" strokeWidth="1.5" />
              <path d="M60 58 L60 72" stroke="#6366f1" strokeWidth="1.5" />
              <path d="M140 58 L140 72" stroke="#6366f1" strokeWidth="1.5" />
              <path d="M220 58 L220 72" stroke="#6366f1" strokeWidth="1.5" />
              <rect x="20" y="72" width="80" height="28" rx="5" stroke="#57534e" fill="#1c1917" />
              <rect x="100" y="72" width="80" height="28" rx="5" stroke="#7c3aed" fill="#1e1b4b" />
              <rect x="180" y="72" width="80" height="28" rx="5" stroke="#57534e" fill="#1c1917" />
              <text x="60" y="89" textAnchor="middle" fill="#a8a29e" fontSize="8">
                Section A
              </text>
              <text x="140" y="89" textAnchor="middle" fill="#c4b5fd" fontSize="8">
                Section B ⊕
              </text>
              <text x="220" y="89" textAnchor="middle" fill="#a8a29e" fontSize="8">
                Section C
              </text>
            </svg>
            <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-zinc-400">
              <span className="text-violet-400">🎙</span> Vizzy
            </div>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-violet-600/20 via-transparent to-blue-600/15 blur-2xl" />
    </MotionDiv>
  )
}
