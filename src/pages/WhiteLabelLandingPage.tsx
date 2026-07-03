import { lazy, Suspense } from "react";
import { Header } from "@/components/Header";
import { WLHero } from "@/components/landing/whitelabel/WLHero";
import { WLBusinessModel } from "@/components/landing/whitelabel/WLBusinessModel";
import { WLWhatYouGet } from "@/components/landing/whitelabel/WLWhatYouGet";
import { WLSocialProof } from "@/components/landing/whitelabel/WLSocialProof";
import { WLWhyWins } from "@/components/landing/whitelabel/WLWhyWins";
import { WLAIDifferentiation } from "@/components/landing/whitelabel/WLAIDifferentiation";
import { WLHowItWorks } from "@/components/landing/whitelabel/WLHowItWorks";
import { TrustCompliance } from "@/components/landing/TrustCompliance";
import { WLFinalCTA } from "@/components/landing/whitelabel/WLFinalCTA";

const Footer = lazy(() => import("@/components/Footer").then((m) => ({ default: m.Footer })));

export default function WhiteLabelLandingPage() {
  return (
    <div className="min-h-screen bg-[#0F1B2D]">
      <Header />
      <main>
        <WLHero />
        <WLBusinessModel />
        <WLWhatYouGet />
        <WLSocialProof />
        <WLWhyWins />
        <WLAIDifferentiation />
        <WLHowItWorks />
        <TrustCompliance />
        <WLFinalCTA />
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
}
