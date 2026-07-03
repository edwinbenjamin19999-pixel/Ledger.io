import { Button } from "@/components/ui/button";
import { Check, ShieldCheck, FileText, BookOpen, Lock, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const trustItems = [
  { icon: BookOpen, label: "Svensk redovisningsstandard" },
  { icon: FileText, label: "BAS-kontoplan" },
  { icon: ShieldCheck, label: "K2/K3-stöd" },
  { icon: Lock, label: "GDPR-säker" },
  { icon: Eye, label: "Spårbar AI & revisionslogg" },
];

const includedFeatures = [
  "Automatisk bokföring",
  "Realtidsanalys",
  "Moms & deklaration",
  "Bankintegrationer",
  "Spårbar AI & revisionslogg",
];

export const Pricing = () => {
  const navigate = useNavigate();
  const reveal = useScrollReveal<HTMLDivElement>();

  return (
    <section id="pricing" className="bg-[#0f1f35] py-24 md:py-32">
      <div ref={reveal.ref} className={`container mx-auto max-w-3xl px-6 ${reveal.className}`}>
        {/* [1] Trust bar */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 pb-2">
          {trustItems.map(({ icon: Icon, label }) => (
            <div key={label} className="inline-flex items-center gap-1.5 text-[12px] text-white/50">
              <Icon className="w-3.5 h-3.5 text-white/40" strokeWidth={1.75} />
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* [2] Section header */}
        <div className="text-center mt-12">
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
            Enkel prissättning. Full kontroll.
          </h2>
          <p className="mt-4 text-lg text-white/70 max-w-xl mx-auto">
            Ett system för bokföring, rapportering och skatt — utan manuellt arbete.
          </p>
        </div>

        {/* [3] Pricing card */}
        <div className="mt-14 flex justify-center">
          <div
            className="w-full max-w-[460px] bg-[#0a1628] border border-white/10 rounded-3xl p-8 md:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.3)] hover:shadow-[0_24px_70px_rgba(0,0,0,0.4)] transition-shadow duration-150"
          >
            {/* [4] Intro badge */}
            <div className="flex justify-center">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[rgba(34,211,238,0.1)] text-[#3b82f6] text-[11px] font-medium uppercase tracking-wider">
                Introerbjudande
              </span>
            </div>

            {/* [5] Price hierarchy */}
            <div className="mt-6 text-center">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-[44px] font-bold tabular-nums text-white leading-none">
                  199 kr
                </span>
                <span className="text-lg text-white/60">/mån</span>
              </div>
              <p className="mt-2 text-sm text-white/60">Första 3 månaderna</p>

              <div className="border-t border-white/10 my-6" />

              <p className="text-base text-white/80">
                Därefter <span className="tabular-nums font-medium text-white">399 kr</span>/mån per bolag
              </p>
            </div>

            {/* [6] Included */}
            <div className="mt-8">
              <p className="text-[11px] uppercase tracking-wider text-white/40 font-medium">
                Det här ingår
              </p>
              <ul className="mt-4 space-y-3">
                {includedFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#3b82f6] shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span className="text-sm text-white/60">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* [7] CTAs */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                onClick={() => navigate("/auth")}
                className="h-12 rounded-xl bg-[#3b82f6] hover:bg-[#3b82f6] text-white font-semibold shadow-[0_2px_8px_rgba(8,145,178,0.2)] hover:shadow-[0_4px_12px_rgba(8,145,178,0.28)] hover:-translate-y-px transition-all duration-150"
              >
                Kom igång
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = "mailto:kontakt@northledger.se")}
                className="h-12 rounded-xl border-white/15 bg-transparent text-white/80 hover:bg-white/5 hover:text-white font-medium"
              >
                Boka demo
              </Button>
            </div>

            {/* [8] Reassurance */}
            <p className="mt-5 text-center text-[13px] text-white/50">
              Ingen bindning · Start på några minuter
            </p>
          </div>
        </div>

        {/* [9] Integration footnote */}
        <div className="mt-12 text-center space-y-1">
          <p className="text-xs text-white/40">
            Bankintegrationer: SEB · Nordea · Handelsbanken · Swedbank
          </p>
          <p className="text-xs text-white/40">
            Ekosystem: Shopify · Stripe · Fortnox-import
          </p>
        </div>
      </div>
    </section>
  );
};
