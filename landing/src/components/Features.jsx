import { ScrollReveal } from './ScrollReveal'

const features = [
  {
    title: 'Visual summaries',
    subtitle: 'Maps, not walls of text',
    body: 'Any webpage, instantly mapped into expandable flowcharts. Nodes reveal detail on demand—so you stay in control of how deep you go.',
    accent: 'from-violet-600/30 to-violet-600/5',
    icon: (
      <svg className="h-10 w-10" viewBox="0 0 40 40" fill="none" aria-hidden>
        <rect x="4" y="2" width="32" height="10" rx="3" stroke="#8b5cf6" strokeWidth="1.5" fill="#1e1b4b" />
        <path d="M20 12v4M10 16h20M10 16v4M20 16v4M30 16v4" stroke="#6366f1" strokeWidth="1.5" />
        <rect x="2" y="20" width="16" height="8" rx="2" stroke="#57534e" fill="#1c1917" />
        <rect x="22" y="20" width="16" height="8" rx="2" stroke="#7c3aed" fill="#1e1b4b" />
        <path d="M30 28v4" stroke="#6366f1" strokeWidth="1.5" />
        <rect x="22" y="32" width="16" height="6" rx="2" stroke="#57534e" fill="#1c1917" />
      </svg>
    ),
  },
  {
    title: 'Voice agent',
    subtitle: 'Talk to your content',
    body: 'Just ask. Vizzy listens, searches the page, expands sections, and reads you answers. No clicking required when you are in flow.',
    accent: 'from-blue-600/30 to-blue-600/5',
    icon: (
      <svg className="h-10 w-10" viewBox="0 0 40 40" fill="none" aria-hidden>
        <circle cx="20" cy="18" r="10" stroke="#3b82f6" strokeWidth="1.5" fill="#172554" />
        <rect x="17" y="12" width="6" height="10" rx="3" stroke="#60a5fa" strokeWidth="1.5" fill="#1e3a8a" />
        <path d="M14 20a6 6 0 0012 0" stroke="#60a5fa" strokeWidth="1.5" fill="none" />
        <path d="M20 28v4M16 32h8" stroke="#3b82f6" strokeWidth="1.5" />
        <circle cx="32" cy="10" r="2" fill="#8b5cf6" opacity="0.6" />
        <circle cx="8" cy="10" r="1.5" fill="#8b5cf6" opacity="0.4" />
        <circle cx="34" cy="24" r="1" fill="#60a5fa" opacity="0.5" />
      </svg>
    ),
  },
]

export function Features() {
  return (
    <section className="border-t border-white/5 px-4 py-20 sm:px-6" id="features">
      <div className="mx-auto max-w-6xl">
        <ScrollReveal>
          <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Built for how you actually read
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-zinc-400">
            Diagrams for structure. Voice for speed.
          </p>
        </ScrollReveal>
        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          {features.map((f, i) => (
            <ScrollReveal key={f.title} delay={i * 0.1}>
              <div
                className={`glass glow-border relative overflow-hidden rounded-2xl bg-gradient-to-br ${f.accent} p-8`}
              >
                <div className="mb-4">{f.icon}</div>
                <h3 className="text-2xl font-bold text-white">{f.title}</h3>
                <p className="mt-1 text-sm font-medium text-violet-300/80">{f.subtitle}</p>
                <p className="mt-4 leading-relaxed text-zinc-300">{f.body}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
