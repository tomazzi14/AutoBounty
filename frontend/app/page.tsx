import Navbar from '@/components/navbar'
import HeroSection from '@/components/hero-section'
import ProblemSection from '@/components/problem-section'
import SolutionSection from '@/components/solution-section'
import HowItWorksSection from '@/components/how-it-works-section'
import TechStackSection from '@/components/tech-stack-section'
import WhySection from '@/components/why-section'
import CtaSection from '@/components/cta-section'
import Footer from '@/components/footer'

export default function Home() {
  return (
    <main className="relative min-h-screen bg-black text-white overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <HowItWorksSection />
      <TechStackSection />
      <WhySection />
      <CtaSection />
      <Footer />
    </main>
  )
}
