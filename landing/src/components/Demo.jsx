import { ScrollReveal } from './ScrollReveal'

export function Demo() {
  return (
    <section className="border-t border-white/5 px-4 py-20 sm:px-6" id="demo">
      <div className="mx-auto max-w-5xl">
        <ScrollReveal>
          <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            See it in context
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-zinc-400">
            Vizzy floating over real content—summary on top, page underneath.
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <div className="glass glow-border mt-12 overflow-hidden rounded-2xl p-2 sm:p-3">
            <img
              src="/demo-screenshot.svg"
              alt="Vizzy overlay showing an interactive flowchart on a webpage"
              className="h-auto w-full rounded-xl"
              width={960}
              height={540}
              loading="lazy"
            />
          </div>
          <p className="mt-4 text-center text-sm text-zinc-500">
            Illustration: Vizzy running on a privacy-policy style page
          </p>
        </ScrollReveal>
      </div>
    </section>
  )
}
