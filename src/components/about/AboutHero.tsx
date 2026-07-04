import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export const AboutHero = () => (
  <section className="relative bg-[#0F172A] overflow-hidden">
    {/* glow orbs */}
    <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-[#3b82f6]/10 blur-[120px]" />
    <div className="pointer-events-none absolute top-40 right-0 w-[400px] h-[400px] rounded-full bg-[#3b82f6]/10 blur-[100px]" />

    <div className="relative container mx-auto max-w-5xl px-6 pt-32 pb-24 md:pt-40 md:pb-32 text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-wider text-white/60 font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
        Om Cogniq
      </span>
      <h1
        className="mt-6 text-5xl md:text-7xl font-bold text-white leading-[1.02]"
        style={{ letterSpacing: "-1.2px" }}
      >
        Bokföring.{" "}
        <span className="text-[#3b82f6]">Ombyggd från grunden.</span>
      </h1>
      <p className="mt-6 max-w-2xl mx-auto text-lg text-white/60 leading-relaxed">
        Cogniq är en AI-driven ekonomiplattform byggd för svenska bolag – där bokföring, moms och rapportering sker automatiskt, korrekt och i realtid.
      </p>
      <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/auth"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white text-[#0F172A] hover:bg-white/90 font-semibold text-sm transition-all"
        >
          Testa Cogniq <ArrowRight className="w-4 h-4" />
        </Link>
        <a
          href="mailto:demo@cogniq.se?subject=Demo Cogniq"
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-white/20 bg-white/[0.03] text-white/90 font-medium text-sm hover:bg-white/[0.08] hover:border-white/30 transition-all"
        >
          Boka demo
        </a>
      </div>
    </div>
  </section>
);
