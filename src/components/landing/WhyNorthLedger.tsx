import { Check, X, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const TRADITIONAL = [
  "AI tillagt ovanpå ett 20 år gammalt system",
  "Separata moduler för varje funktion",
  "Manuell export mellan bokföring och rapporter",
  "Reaktiv kontroll — fel hittas vid revision",
  "Prognos i ett separat kalkylblad",
];

const CONTO = [
  "AI som kärna — byggt från grunden för automation",
  "Ett system: bokföring, moms, löner, budget, prognos",
  "Realtidsdata — resultat och balans alltid uppdaterad",
  "Proaktiv kontroll — avvikelser flaggas direkt",
  "Prognos baserad på din faktiska bokföring",
];

export const WhyNorthLedger = () => {
  const reveal = useScrollReveal<HTMLDivElement>();
  const navigate = useNavigate();
  return (
    <section className="section-shell">
      <div ref={reveal.ref} className={`section-inner ${reveal.className}`}>
        <p className="section-label">Jämförelse</p>
        <h2
          className="section-headline text-4xl md:text-5xl font-[700] leading-[1.05]"
          style={{ letterSpacing: "-0.8px" }}
        >
          Inte ett bokföringsprogram. <span style={{ color: "#3b82f6" }}>Ett ekonomisystem.</span>
        </h2>
        <p className="section-lede text-[15px] leading-relaxed max-w-2xl">
          Skillnaden mellan att lappa ett gammalt system med AI — och att bygga ett nytt från grunden.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          {/* Traditional — muted */}
          <div className="dark-surface-card" style={{ padding: "28px 24px" }}>
            <div
              style={{
                color: "rgba(255,255,255,0.3)",
                fontSize: 11,
                letterSpacing: "2px",
                fontWeight: 500,
                textTransform: "uppercase",
                marginBottom: 20,
              }}
            >
              Legacy-system + AI-tillägg
            </div>
            <ul className="space-y-4">
              {TRADITIONAL.map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <div
                    className="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    <X className="w-3 h-3" style={{ color: "rgba(239,68,68,0.6)" }} />
                  </div>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
                    {t}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* NorthLedger — superior */}
          <div
            className="rounded-xl relative"
            style={{
              padding: "28px 24px",
              background: "rgba(29,217,240,0.05)",
              border: "1px solid rgba(29,217,240,0.25)",
              boxShadow:
                "0 0 40px rgba(29,217,240,0.08), inset 0 1px 0 rgba(29,217,240,0.15)",
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <div
                style={{
                  color: "#3b82f6",
                  fontSize: 11,
                  letterSpacing: "2px",
                  fontWeight: 500,
                  textTransform: "uppercase",
                }}
              >
                NorthLedger
              </div>
              <span
                style={{
                  background: "#3b82f6",
                  color: "#0B1F2F",
                  fontWeight: 700,
                  padding: "4px 12px",
                  borderRadius: 100,
                  fontSize: 10,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                ✓ Rekommenderas
              </span>
            </div>
            <ul className="space-y-4">
              {CONTO.map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <div
                    className="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(29,217,240,0.15)" }}
                  >
                    <Check className="w-3 h-3" style={{ color: "#3b82f6" }} strokeWidth={3} />
                  </div>
                  <span style={{ fontSize: 14, color: "#fff", lineHeight: 1.6 }}>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA below */}
        <div className="flex justify-center" style={{ marginTop: 32 }}>
          <button
            type="button"
            onClick={() => navigate("/auth")}
            className="inline-flex items-center gap-2 font-semibold transition-all hover:bg-white/90 hover:scale-[1.02]"
            style={{
              background: "#ffffff",
              color: "#050d1a",
              fontSize: 15,
              padding: "14px 28px",
              borderRadius: 12,
            }}
          >
            Säkra din plats — 14 dagar utan kostnad vid lansering
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

