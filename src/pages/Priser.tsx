import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Check, ChevronDown, ArrowRight } from "lucide-react";

/**
 * FLAT PRISSIDA — blå poster-header → vita priskort där huvudplanen
 * (Standard) bär "dramatic scale": större, blue-50-yta, tjock blå kant
 * och badge. Enterprise = lugnt grått block. FAQ med border-2-avdelare.
 * Avslut i ink-navy CTA-block.
 */
const standardFeatures = [
  "Automatisk bokföring med AI (≥95% konfidens)",
  "Bankintegrationer via PSD2 — SEB, Nordea, Handelsbanken, Swedbank",
  "Moms & AGI direkt till Skatteverket",
  "Bjud in teammedlemmar — VD, CFO, ekonom",
  "Kvitto- och fakturahantering via AI",
  "Kassaflödesprognos 12 månader",
  "Bokslut & årsredovisning (K2/K3)",
  "AI CFO — analys och åtgärdsförslag",
  "BankID-verifiering",
  "Revisionssäker logg",
  "Support via e-post",
];

const enterpriseFeatures = [
  "Allt i Standard",
  "Anpassad kontoplan och branschregler",
  "API-åtkomst för egna integrationer",
  "White label — egen logotyp och domän",
  "Dedikerad onboarding och implementation",
  "Kvartal- eller årsbetalning",
];

const faqs = [
  {
    q: "Kan jag byta plan när som helst?",
    a: "Ja. Du kan uppgradera eller nedgradera när du vill. Ändringar träder i kraft från nästa faktureringsperiod.",
  },
  {
    q: "Vad ingår i 14 dagars gratis-perioden?",
    a: "Full tillgång till alla funktioner i Standard-planen. Inget kreditkort krävs för att starta.",
  },
  {
    q: "Hur fungerar Enterprise-prissättning?",
    a: "Enterprise-priset baseras på antal klientbolag, antal användare och vilka tilläggsfunktioner ni behöver. Vi sätter ihop ett anpassat paket och återkommer inom 24 timmar.",
  },
  {
    q: "Är priset exklusive moms?",
    a: "Ja, alla angivna priser är exklusive moms (25%).",
  },
];

const FeatureItem = ({ text, onBlue = false }: { text: string; onBlue?: boolean }) => (
  <div className="flex items-start gap-3 py-2">
    <span
      className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md ${
        onBlue ? "bg-[#0052FF]" : "bg-white"
      }`}
    >
      <Check
        className={`h-3 w-3 ${onBlue ? "text-white" : "text-[#0052FF]"}`}
        strokeWidth={3}
        aria-hidden
      />
    </span>
    <span className="text-[14px] leading-6 text-[#0F172A]/75">{text}</span>
  </div>
);

const Priser = () => {
  const navigate = useNavigate();
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        {/* Blått poster-huvud */}
        <section className="relative overflow-hidden bg-[#0052FF] pt-[60px]">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -top-28 -right-28 h-[340px] w-[340px] rounded-full bg-white/5" />
            <div className="absolute -bottom-20 left-[12%] h-[180px] w-[180px] rotate-12 bg-white/5" />
          </div>
          <div className="relative mx-auto max-w-2xl px-6 pt-20 pb-20 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-100">
              Priser
            </p>
            <h1 className="mt-3 text-4xl md:text-5xl font-extrabold tracking-tight text-white">
              Enkel prissättning.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-blue-50">
              Välj det som passar din verksamhet. Byt plan när du vill.
            </p>
          </div>
        </section>

        {/* Priskort */}
        <section className="bg-white py-24">
          <div className="mx-auto grid max-w-4xl grid-cols-1 items-start gap-6 px-6 md:grid-cols-2">
            {/* Standard — huvudplan med dramatic scale */}
            <div className="relative rounded-lg border-2 border-[#0052FF] bg-blue-50 p-8 lg:scale-[1.03] lg:origin-top transition-transform">
              <span className="absolute -top-3.5 left-8 inline-flex items-center gap-1 rounded-full bg-[#0052FF] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                Populärast
              </span>
              <h2 className="text-xl font-bold text-[#0F172A]">Standard</h2>
              <p className="mt-1 text-sm text-[#0F172A]/60">
                För bolag som vill ha en ekonomifunktion som tänker själv
              </p>
              <div className="mt-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold tracking-tight text-[#0F172A] tabular-nums">
                    199 kr
                  </span>
                  <span className="text-lg text-[#0F172A]/50">/mån</span>
                </div>
                <p className="mt-2 text-sm text-[#0F172A]/60">
                  Därefter 399 kr/mån · Introerbjudande
                </p>
                <p className="mt-1 text-xs text-[#0F172A]/40">Exkl. moms</p>
              </div>
              <button
                onClick={() => navigate("/auth")}
                className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#0052FF] text-[15px] font-bold text-white transition-all duration-200 hover:scale-[1.02] hover:bg-[#0040CC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF] focus-visible:ring-offset-2"
              >
                Gå med i piloten
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
              <p className="mt-3 text-center text-xs text-[#0F172A]/50">
                Pilotpris · begränsat antal platser
              </p>
              <div className="mt-6 border-t-2 border-[#0052FF]/15 pt-6">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[#0F172A]/50">
                  Vad som ingår
                </p>
                {standardFeatures.map((f) => (
                  <FeatureItem key={f} text={f} onBlue />
                ))}
                <p className="mt-3 text-[11px] italic text-[#0F172A]/50">
                  Utlägg registreras av den som gjort dem — inte av dig.
                </p>
              </div>
            </div>

            {/* Enterprise — lugnt grått block */}
            <div className="relative rounded-lg bg-gray-100 p-8">
              <span className="absolute top-4 right-4 rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#0F172A]/60">
                För specifika behov
              </span>
              <h2 className="text-xl font-bold text-[#0F172A]">Enterprise</h2>
              <p className="mt-1 pr-24 text-sm text-[#0F172A]/60">
                För dig som behöver något utöver standard — anpassad kontoplan,
                egna integrationer eller skräddarsydd implementation.
              </p>
              <div className="mt-6">
                <div className="text-3xl font-extrabold tracking-tight text-[#0F172A]">
                  Anpassat pris
                </div>
                <p className="mt-2 text-sm text-[#0F172A]/60">
                  Baserat på antal klienter, användare och behov
                </p>
                <p className="mt-1 text-xs text-[#0F172A]/40">Vi återkommer inom 24h</p>
              </div>
              <button
                onClick={() => (window.location.href = "mailto:kontakt@cogniq.se")}
                className="mt-6 h-12 w-full rounded-md border-2 border-[#0F172A] bg-transparent text-[15px] font-bold text-[#0F172A] transition-colors duration-200 hover:bg-[#0F172A] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] focus-visible:ring-offset-2"
              >
                Boka demo →
              </button>
              <p className="mt-3 text-center text-xs text-[#0F172A]/50">
                Vi återkommer inom 24h · Ingen bindningstid
              </p>
              <div className="mt-6 border-t-2 border-gray-200 pt-6">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[#0F172A]/50">
                  Allt i Standard, plus
                </p>
                {enterpriseFeatures.map((f) => (
                  <FeatureItem key={f} text={f} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ — ljus blå-tonad sektion */}
        <section className="bg-[#F5F8FF] py-20">
          <div className="mx-auto max-w-2xl px-6">
            <h2 className="mb-10 text-center text-3xl font-extrabold tracking-tight text-[#0F172A]">
              Vanliga frågor
            </h2>
            <div>
              {faqs.map((f, i) => {
                const open = openIdx === i;
                return (
                  <div
                    key={f.q}
                    className={`border-b-2 py-5 transition-colors duration-200 ${
                      open ? "border-[#0052FF]" : "border-gray-200"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenIdx(open ? null : i)}
                      aria-expanded={open}
                      className="flex w-full items-center justify-between rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF] focus-visible:ring-offset-2"
                    >
                      <span
                        className={`pr-4 font-semibold transition-colors duration-200 ${
                          open ? "text-[#0052FF]" : "text-[#0F172A]"
                        }`}
                      >
                        {f.q}
                      </span>
                      <ChevronDown
                        aria-hidden
                        strokeWidth={2.5}
                        className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                          open ? "rotate-180 text-[#0052FF]" : "text-[#0F172A]/40"
                        }`}
                      />
                    </button>
                    {open && (
                      <p className="mt-3 text-[14px] leading-relaxed text-[#0F172A]/60">
                        {f.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Ink-navy avslutsblock */}
        <section className="relative overflow-hidden bg-[#0F172A] py-20 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-20 -bottom-20 h-[260px] w-[260px] rounded-full bg-white/5"
          />
          <div className="relative px-6">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              Redo att ligga steget före?
            </h2>
            <p className="mt-3 text-white/70">
              Gå med i piloten inför lansering Q3 2026. Begränsat antal platser.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                onClick={() => navigate("/auth")}
                className="inline-flex h-12 items-center gap-2 rounded-md bg-[#0052FF] px-8 font-bold text-white transition-all duration-200 hover:scale-105 hover:bg-[#0040CC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F172A]"
              >
                Gå med i piloten
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
              <button
                onClick={() => (window.location.href = "mailto:kontakt@cogniq.se")}
                className="h-12 rounded-md border-2 border-white/60 bg-transparent px-8 font-semibold text-white transition-colors duration-200 hover:bg-white hover:text-[#0F172A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F172A]"
              >
                Boka demo
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Priser;
