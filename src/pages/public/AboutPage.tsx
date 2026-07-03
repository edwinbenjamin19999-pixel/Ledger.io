import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AboutHero } from "@/components/about/AboutHero";
import { AboutTrustBar } from "@/components/about/AboutTrustBar";
import { AboutProblem } from "@/components/about/AboutProblem";
import { AboutSolution } from "@/components/about/AboutSolution";
import { AboutFeatures } from "@/components/about/AboutFeatures";
import { AboutWhy } from "@/components/about/AboutWhy";
import { AboutVision } from "@/components/about/AboutVision";
import { AboutFinalCTA } from "@/components/about/AboutFinalCTA";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0f1f35]">
      <Header />
      <main className="flex-1">
        <AboutHero />
        <AboutTrustBar />
        <AboutProblem />
        <AboutSolution />
        <AboutFeatures />
        <AboutWhy />
        <AboutVision />
        <AboutFinalCTA />
      </main>
      <Footer />
    </div>
  );
}
