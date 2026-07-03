import { lazy, Suspense, ReactNode } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/landing/Hero";
import { Pillars } from "@/components/landing/Pillars";

import { HowItWorks } from "@/components/landing/HowItWorks";
import { SelectedFeatures } from "@/components/landing/SelectedFeatures";
import { InteractiveDemoPreview } from "@/components/landing/InteractiveDemoPreview";
import { AutomationGrid } from "@/components/landing/AutomationGrid";
import { WhyNorthLedger } from "@/components/landing/WhyNorthLedger";
import { UseCases } from "@/components/landing/UseCases";
import { PilotCTA } from "@/components/landing/PilotCTA";

import { TrustCompliance } from "@/components/landing/TrustCompliance";
import { WhiteLabelSection } from "@/components/landing/WhiteLabelSection";
import { CountdownCTA } from "@/components/landing/CountdownCTA";
import { FAQ } from "@/components/landing/FAQ";


const Footer = lazy(() => import("@/components/Footer").then(m => ({ default: m.Footer })));

const Index = () => {
  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(
          to bottom,
          #1a3a5c 0%,
          #0f2442 8%,
          #071830 20%,
          #050d1a 40%,
          #050d1a 100%
        )`,
      }}
    >
      <Header />
      <main>
        <Hero />
        <CountdownCTA />
        <InteractiveDemoPreview />
        <Pillars />
        <HowItWorks />
        <AutomationGrid />
        <WhyNorthLedger />
        <UseCases />
        <PilotCTA />
        <SelectedFeatures />
        <TrustCompliance />
        <WhiteLabelSection />
        <FAQ />
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default Index;
