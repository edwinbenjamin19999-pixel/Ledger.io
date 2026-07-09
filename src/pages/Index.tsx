import { lazy, Suspense, ReactNode } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/landing/Hero";
import { Reveal } from "@/components/landing/Reveal";
import { SocialProofStrip } from "@/components/landing/SocialProofStrip";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { AIEkonomSection } from "@/components/landing/AIEkonomSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { ClosingCTA } from "@/components/landing/ClosingCTA";

const Footer = lazy(() => import("@/components/Footer").then((m) => ({ default: m.Footer })));

const NavyBlock = ({ children }: { children: ReactNode }) => (
  <div className="bg-[#0a1628]">{children}</div>
);

/**
 * Marknadssida enligt Cogniq Design System:
 * hero → social proof → features → AI Ekonom → pricing → closing CTA → footer.
 */
const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <Hero />
        <SocialProofStrip />
        <Reveal><FeaturesSection /></Reveal>
        <AIEkonomSection />
        <Reveal><PricingSection /></Reveal>
        <Reveal><ClosingCTA /></Reveal>
      </main>
      <Suspense fallback={null}>
        <NavyBlock>
          <Footer />
        </NavyBlock>
      </Suspense>
    </div>
  );
};

export default Index;
