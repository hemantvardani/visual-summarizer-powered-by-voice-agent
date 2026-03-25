import { ScrollReveal } from './ScrollReveal'

const steps = [
  {
    num: '01',
    title: 'Click Summarize',
    body: 'Open Vizzy on any page. We extract clean content via Firecrawl and build a structured map with Claude.',
    icon: '⚡',
  },
  {
    num: '02',
    title: 'See the visual map',
    body: 'Explore an interactive flowchart overlaid on the page. Expand nodes only when you need more detail.',
    icon: '🗺',
  },
  {
    num: '03',
    title: 'Ask Vizzy anything',
    body: 'Use your voice to search the page, open sections, or zoom the diagram—completely hands-free.',
    icon: '🎙',
  },
]

export function HowItWorks() {
  return (
    <section className="px-4 py-20 sm:px-6" id="how">
      <div className="mx-auto max-w-6xl">
        <ScrollReveal>
          <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            How it works
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-zinc-400">
            Three steps from overwhelm to clarity.
          </p>
        </ScrollReveal>
        <div className="relative mt-14 grid gap-6 sm:grid-cols-3">
          <div className="pointer-events-none absolute top-14 right-0 left-0 hidden h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent sm:block" />
          {steps.map((step, i) => (
            <ScrollReveal key={step.title} delay={i * 0.1}>
              <div className="glass glow-border relative h-full rounded-2xl p-6 text-center">
                <div className="mb-3 text-xs font-bold tracking-widest text-violet-400/60">
                  STEP {step.num}
                </div>
                <div className="text-3xl" aria-hidden>
                  {step.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{step.body}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
