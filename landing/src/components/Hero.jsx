import { ScrollReveal } from './ScrollReveal'
import { DiagramMockup } from './DiagramMockup'
import { WaitlistForm } from './WaitlistForm'

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-28 sm:px-6 sm:pb-28 sm:pt-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(124,58,237,0.25),transparent)]" />
      <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div>
          <ScrollReveal>
            <p className="mb-4 text-sm font-medium uppercase tracking-widest text-violet-400/90">
              Chrome extension
            </p>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-[3.25rem]">
              Talk to any webpage.{' '}
              <span className="text-gradient">Understand it instantly.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
              Vizzy turns complex pages into interactive visual summaries you can explore
              with your voice—no endless scrolling, no walls of text.
            </p>
            <div className="mt-10">
              <WaitlistForm id="hero-waitlist" />
            </div>
          </ScrollReveal>
        </div>
        <ScrollReveal delay={0.12}>
          <DiagramMockup />
        </ScrollReveal>
      </div>
    </section>
  )
}
