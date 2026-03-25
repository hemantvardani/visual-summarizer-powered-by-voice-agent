import { ScrollReveal } from './ScrollReveal'

const logos = [
  { label: 'Powered by Claude', icon: '🧠' },
  { label: 'Built with Firecrawl', icon: '🔥' },
  { label: 'Voice by ElevenLabs', icon: '🗣' },
  { label: 'Chrome Extension', icon: '🌐' },
]

export function SocialProof() {
  return (
    <section className="border-t border-white/5 px-4 py-10 sm:px-6">
      <ScrollReveal>
        <p className="mb-6 text-center text-xs font-medium uppercase tracking-widest text-zinc-600">
          Powered by
        </p>
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-6 sm:gap-10">
          {logos.map((l) => (
            <div
              key={l.label}
              className="flex items-center gap-2 text-sm text-zinc-500"
            >
              <span className="text-lg" aria-hidden>{l.icon}</span>
              <span>{l.label}</span>
            </div>
          ))}
        </div>
      </ScrollReveal>
    </section>
  )
}
