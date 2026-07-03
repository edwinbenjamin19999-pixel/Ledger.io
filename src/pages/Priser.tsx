import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { ChevronDown } from "lucide-react";

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

const FeatureItem = ({ text }: { text: string }) => (
  <div className="flex gap-3 items-start py-2">
    <span className="text-[#3b82f6] text-sm leading-6">✓</span>
    <span className="text-white/70 text-[14px] leading-6">{text}</span>
  </div>
);

const Priser = () => {
  const navigate = useNavigate();
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-[#0a1525]">
      <Header />
      <main>
        {/* Header */}
        <section className="bg-[#0a1525] pt-24 pb-16 text-center px-6">
          <div className="text-[11px] uppercase tracking-[0.12em] text-[#3b82f6] mb-3">
            PRISER
          </div>
          <h1 className="text-4xl font-bold text-white">Enkel prissättning.</h1>
          <p className="text-white/50 text-lg mt-3 max-w-xl mx-auto">
            Välj det som passar din verksamhet. Byt plan när du vill.
          </p>
        </section>

        {/* Cards */}
        <section className="bg-[#0a1525] pb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto px-6">
            {/* Standard */}
            <div className="bg-[#0f1f35] border border-white/10 rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white">Standard</h2>
              <p className="text-white/50 text-sm mt-1">
                För företag som vill automatisera sin bokföring
              </p>
              <div className="mt-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-white tabular-nums">
                    199 kr
                  </span>
                  <span className="text-white/40 text-lg">/mån</span>
                </div>
                <p className="text-white/35 text-sm mt-2">
                  Därefter 399 kr/mån · Introerbjudande
                </p>
                <p className="text-white/25 text-xs mt-1">Exkl. moms</p>
              </div>
              <button
                onClick={() => navigate("/auth")}
                className="mt-6 w-full h-12 rounded-xl bg-white hover:bg-white/90 text-[#050d1a] font-semibold text-[15px] transition-colors"
              >
                Kom igång gratis →
              </button>
              <p className="text-white/30 text-xs text-center mt-3">
                14 dagar gratis · Ingen bindningstid
              </p>
              <div className="border-t border-white/[0.08] mt-6 pt-6">
                <p className="text-white/30 text-[10px] uppercase tracking-wider mb-4">
                  Vad som ingår
                </p>
                {standardFeatures.map((f) => (
                  <FeatureItem key={f} text={f} />
                ))}
                <p className="text-white/30 text-[11px] mt-3 italic">
                  Utlägg registreras av den som gjort dem — inte av dig.
                </p>
              </div>
            </div>

            {/* Enterprise */}
            <div className="relative bg-[#0f1f35] border border-[#3b82f6]/30 rounded-2xl p-8">
              <span className="absolute top-4 right-4 bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20 rounded-full text-[10px] px-3 py-1 uppercase tracking-wide">
                För specifika behov
              </span>
              <h2 className="text-xl font-semibold text-white">Enterprise</h2>
              <p className="text-white/50 text-sm mt-1 pr-32">
                För dig som behöver något utöver standard — anpassad kontoplan, egna integrationer eller skräddarsydd implementation.
              </p>
              <div className="mt-6">
                <div className="text-3xl font-bold text-white">
                  Anpassat pris
                </div>
                <p className="text-white/40 text-sm mt-2">
                  Baserat på antal klienter, användare och behov
                </p>
                <p className="text-white/25 text-xs mt-1">
                  Vi återkommer inom 24h
                </p>
              </div>
              <button
                onClick={() => (window.location.href = "mailto:kontakt@northledger.se")}
                className="mt-6 w-full h-12 rounded-xl bg-transparent hover:bg-white/5 text-white font-semibold border border-white/20 hover:border-white/40 text-[15px] transition-colors"
              >
                Boka demo →
              </button>
              <p className="text-white/30 text-xs text-center mt-3">
                Vi återkommer inom 24h · Ingen bindningstid
              </p>
              <div className="border-t border-white/[0.08] mt-6 pt-6">
                <p className="text-white/30 text-[10px] uppercase tracking-wider mb-4">
                  Allt i Standard, plus
                </p>
                {enterpriseFeatures.map((f) => (
                  <FeatureItem key={f} text={f} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-[#0a1525] py-16 border-t border-white/5">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-white text-center mb-10">
              Vanliga frågor
            </h2>
            <div>
              {faqs.map((f, i) => {
                const open = openIdx === i;
                return (
                  <div
                    key={f.q}
                    className="border-b border-white/[0.08] py-5 cursor-pointer"
                    onClick={() => setOpenIdx(open ? null : i)}
                  >
                    <div className="text-white font-medium flex justify-between items-center">
                      <span>{f.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-white/40 transition-transform ${
                          open ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                    {open && (
                      <p className="text-white/55 text-[14px] mt-3 leading-relaxed">
                        {f.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="bg-[#0f1f35] py-16 text-center border-t border-white/5 px-6">
          <h2 className="text-3xl font-bold text-white">Redo att börja?</h2>
          <p className="text-white/50 mt-3">
            Kom igång på några minuter. Ingen bindningstid.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={() => navigate("/auth")}
              className="h-12 px-8 rounded-xl bg-white hover:bg-white/90 text-[#050d1a] font-semibold transition-colors"
            >
              Kom igång gratis →
            </button>
            <button
              onClick={() => (window.location.href = "mailto:kontakt@northledger.se")}
              className="h-12 px-8 rounded-xl bg-transparent border border-white/20 text-white hover:bg-white/5 transition-colors"
            >
              Boka demo
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Priser;
