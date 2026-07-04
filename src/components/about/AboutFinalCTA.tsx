import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export const AboutFinalCTA = () => (
  <section className="bg-[#0F172A] py-24 md:py-32 border-t border-white/[0.05]">
    <div className="container mx-auto max-w-3xl px-6 text-center">
      <h2 className="text-4xl md:text-5xl font-bold text-white leading-[1.05]" style={{ letterSpacing: "-0.8px" }}>
        Redo att testa <span className="text-[#3b82f6]">framtidens bokföring?</span>
      </h2>
      <p className="mt-5 text-[15px] text-white/60 leading-relaxed">
        Kom igång på minuter. Migrera från ditt nuvarande system utan friktion.
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
