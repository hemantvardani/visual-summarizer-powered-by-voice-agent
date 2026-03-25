import { ScrollReveal } from './ScrollReveal'

const personas = [
  {
    emoji: '🎓',
    title: 'Students',
    body: 'Digest research papers and dense articles in seconds, not hours.',
  },
  {
    emoji: '📋',
    title: 'Product managers',
    body: 'Scan competitor pages, specs, and docs without reading every word.',
  },
  {
    emoji: '🔬',
    title: 'Researchers',
    body: 'Map out any paper or documentation page into explorable visual nodes.',
  },
  {
    emoji: '⚖️',
    title: 'Legal & compliance',
    body: 'Navigate privacy policies, T&Cs, and regulatory docs at a glance.',
  },
  {
    emoji: '🧑‍💻',
    title: 'Developers',
    body: 'Understand API docs, changelogs, and Stack Overflow threads visually.',
  },
  {
    emoji: '♿',
    title: 'Accessibility',
    body: 'Voice-first interaction makes dense content accessible to everyone.',
  },
]

export function WhoItsFor() {
  return (
    <section className="border-t border-white/5 px-4 py-20 sm:px-6" id="who">
      <div className="mx-auto max-w-6xl">
        <ScrollReveal>
          <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Built for anyone who reads the web
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-zinc-400">
            If you have ever stared at a page and thought "what am I supposed to take away from this?"—Vizzy is for you.
          </p>
        </ScrollReveal>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {personas.map((p, i) => (
            <ScrollReveal key={p.title} delay={i * 0.05}>
              <div className="glass glow-border flex h-full items-start gap-4 rounded-xl p-5">
                <span className="shrink-0 text-2xl" aria-hidden>{p.emoji}</span>
                <div>
                  <h3 className="font-semibold text-white">{p.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-400">{p.body}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
