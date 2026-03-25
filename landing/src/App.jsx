import { Navbar } from './components/Navbar'
import { Hero } from './components/Hero'
import { SocialProof } from './components/SocialProof'
import { HowItWorks } from './components/HowItWorks'
import { Features } from './components/Features'
import { WhoItsFor } from './components/WhoItsFor'
import { Demo } from './components/Demo'
import { WaitlistSection } from './components/WaitlistSection'
import { Footer } from './components/Footer'

function App() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0a0a0f]">
      {/* Floating gradient orbs for visual depth */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-violet-600/[0.07] blur-[120px]" />
        <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-blue-600/[0.06] blur-[100px]" />
        <div className="absolute -bottom-40 left-1/3 h-[400px] w-[400px] rounded-full bg-violet-500/[0.05] blur-[100px]" />
      </div>

      <Navbar />
      <main>
        <Hero />
        <SocialProof />
        <HowItWorks />
        <Features />
        <WhoItsFor />
        <Demo />
        <WaitlistSection />
      </main>
      <Footer />
    </div>
  )
}

export default App
