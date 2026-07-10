import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export const AboutFinalCTA = () => (
  <section className="bg-white py-24 md:py-32 border-t border-[#E2E8F0]">
    <div className="container mx-auto max-w-3xl px-6 text-center">
      <h2 className="text-4xl md:text-5xl font-bold text-[#0F172A] leading-[1.05]" style={{ letterSpacing: "-0.8px" }}>
        Redo att testa <span className="text-[#0052FF]">framtidens bokföring?</span>
      </h2>
      <p className="mt-5 text-[15px] text-slate-600 leading-relaxed">
        Kom igång på minuter. Migrera från ditt nuvarande system utan friktion.
      </p>
      <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/auth"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#0052FF] text-white hover:bg-[#0040CC] font-semibold text-sm transition-all"
        >
          Testa Cogniq <ArrowRight className="w-4 h-4" />
        </Link>
        <a
          href="mailto:demo@cogniq.se?subject=Demo Cogniq"
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] font-medium text-sm hover:bg-white hover:border-[#E2E8F0] transition-all"
        >
          Boka demo
        </a>
      </div>
    </div>
  </section>
);
