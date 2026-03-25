import { ScrollReveal } from './ScrollReveal'
import { WaitlistForm } from './WaitlistForm'

export function WaitlistSection() {
  return (
    <section className="relative overflow-hidden px-4 py-24 sm:px-6" id="waitlist">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(124,58,237,0.18),transparent)]" />
      <div className="relative mx-auto max-w-3xl text-center">
        <ScrollReveal>
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-violet-400/80">
            Early access
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Ready to read smarter?
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Join the waitlist. We will notify you when Vizzy hits the Chrome Web Store.
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.08} className="mt-10 flex justify-center">
          <WaitlistForm id="footer-waitlist" />
        </ScrollReveal>
        <ScrollReveal delay={0.16}>
          <p className="mt-6 text-sm text-zinc-600">
            No spam, ever. Unsubscribe anytime.
          </p>
        </ScrollReveal>
      </div>
    </section>
  )
}
