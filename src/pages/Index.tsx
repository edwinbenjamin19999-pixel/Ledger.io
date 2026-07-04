import { lazy, Suspense, ReactNode } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/landing/Hero";
import { Reveal } from "@/components/landing/Reveal";
import { AIEngineSection } from "@/components/landing/AIEngineSection";
import { ReceiptFlowSection } from "@/components/landing/ReceiptFlowSection";
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

/**
 * FLAT POSTER LAYOUT — sidan är en serie solida färgblock med skarpa
 * övergångar: blå → navy → vit → grå → navy → vit → emerald → amber →
 * grå → vit → navy → vit → navy. Varje sektion äger sin egen färg;
 * NavyBlock omsluter endast sektioner som ännu inte konverterats.
 */
const NavyBlock = ({ children }: { children: ReactNode }) => (
  <div className="bg-[#0F172A]">{children}</div>
);

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <Hero />
        <Reveal><CountdownCTA /></Reveal>
        <NavyBlock>
          <Reveal><InteractiveDemoPreview /></Reveal>
        </NavyBlock>
        <Reveal><Pillars /></Reveal>
        <AIEngineSection />
        <Reveal><ReceiptFlowSection /></Reveal>
        <Reveal><HowItWorks /></Reveal>
        <Reveal><AutomationGrid /></Reveal>
        <Reveal><WhyNorthLedger /></Reveal>
        <Reveal><UseCases /></Reveal>
        <Reveal><PilotCTA /></Reveal>
        <Reveal><SelectedFeatures /></Reveal>
        <Reveal><TrustCompliance /></Reveal>
        <Reveal><WhiteLabelSection /></Reveal>
        <Reveal><FAQ /></Reveal>
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
