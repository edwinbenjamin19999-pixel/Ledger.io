import { Link } from "react-router-dom";
import { ArrowRight, Building2 } from "lucide-react";

export const FinalCTABlock = () => (
  <section className="not-prose relative left-1/2 -translate-x-1/2 w-screen max-w-[1400px] my-20">
    <div className="border-y border-slate-900/[0.06] bg-gradient-to-br from-[#F0F9FF] via-[#FAFBFC] to-[#ECFEFF] py-20 px-8">
      <div className="max-w-2xl mx-auto text-center">
        <div className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[#3b82f6]">
          Redo att börja?
        </div>
        <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-[-0.02em] text-[#0f1f35]">
          Sluta bokföra manuellt
        </h2>
        <p className="mt-4 text-[17px] text-slate-600 leading-[1.75]">
          Bokfy automatiserar kvitton, fakturor, moms och bokslut — så att du kan fokusera på företaget.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/auth"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#050d1a] hover:bg-white/90 transition-all duration-200"
          >
            Testa Bokfy gratis <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center justify-center rounded-xl bg-white border border-slate-900/[0.08] px-6 py-3 text-sm font-semibold text-[#0f1f35] hover:border-slate-900/[0.15] hover:shadow-[0_4px_12px_-4px_rgba(15,23,42,0.1)] transition-all duration-200"
          >
            Boka demo
          </Link>
        </div>
      </div>
    </div>
    <div className="max-w-[760px] mx-auto px-6 mt-6">
      <Link
        to="/white-label"
        className="group flex items-center justify-between gap-4 rounded-[18px] border border-slate-900/[0.06] bg-white p-5 hover:border-[#C8DDF5] hover:shadow-[0_12px_30px_-12px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 transition-all duration-300"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFF6FF] text-indigo-600">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[15px] font-semibold text-[#0f1f35]">Är du redovisningsbyrå?</div>
            <p className="text-[13px] text-slate-600">Automatisera detta för alla dina kunder under ditt eget varumärke.</p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-[#3b82f6] group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  </section>
);
