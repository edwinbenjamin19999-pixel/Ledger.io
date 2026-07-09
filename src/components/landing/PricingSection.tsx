import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Prissektion (Cogniq Design System): Solo / Företag / Byrå.
 * Företag är featured (mörkt navy-kort + "Populärast").
 */
const TIERS = [
  {
    name: "Solo",
    tagline: "Enskild firma & mindre AB",
    price: "199",
    unit: "kr/mån",
    cta: "Kom igång",
    featured: false,
    features: ["Automatisk bokföring", "Bankkoppling", "Momsrapport", "AI Ekonom (bas)"],
  },
  {
    name: "Företag",
    tagline: "Växande aktiebolag",
    price: "499",
    unit: "kr/mån",
    cta: "Kom igång",
    featured: true,
    features: [
      "Allt i Solo",
      "Kund- & leverantörsreskontra",
      "Lön & AGI",
      "AI Ekonom (obegränsad)",
      "Prognoser & KPI:er",
    ],
  },
  {
    name: "Byrå",
    tagline: "Redovisningsbyråer",
    price: "Kontakta",
    unit: "",
    cta: "Boka demo",
    featured: false,
    features: ["Allt i Företag", "Flera klienter", "Byråöversikt & roller", "Prioriterad support"],
  },
];

export const PricingSection = () => {
  const navigate = useNavigate();
  return (
    <section id="priser" className="bg-white py-24 px-6 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-[#14181F] md:text-[2.6rem]">
            Enkel, transparent prissättning
          </h2>
          <p className="mt-4 text-base text-[#14181F]/55">
            Priser per månad exkl. moms. Ingen bindningstid.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 items-start gap-6 md:grid-cols-3">
          {TIERS.map((tier) => {
            const dark = tier.featured;
            return (
              <div
                key={tier.name}
                className={`relative flex flex-col rounded-2xl p-8 ${
                  dark
                    ? "bg-[#0B1D2A] text-white shadow-[0_30px_60px_-30px_rgba(11,29,42,0.5)] md:-translate-y-3"
                    : "border border-border bg-white text-[#14181F]"
                }`}
              >
                {dark && (
                  <span className="absolute right-6 top-8 rounded-full bg-[#0052FF] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                    Populärast
                  </span>
                )}
                <h3 className="font-display text-xl font-semibold tracking-tight">{tier.name}</h3>
                <p className={`mt-1 text-sm ${dark ? "text-white/55" : "text-[#14181F]/55"}`}>
                  {tier.tagline}
                </p>

                <div className="mt-6 flex items-baseline gap-1.5">
                  <span className="font-display text-4xl font-bold tracking-tight tabular-nums">
                    {tier.price}
                  </span>
                  {tier.unit && (
                    <span className={`text-sm ${dark ? "text-white/50" : "text-[#14181F]/50"}`}>
                      {tier.unit}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => navigate(tier.cta === "Boka demo" ? "/contact" : "/auth")}
                  className={`mt-6 h-11 w-full rounded-xl text-[14px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    dark
                      ? "bg-[#0052FF] text-white hover:bg-[#0040CC] focus-visible:ring-[#0052FF] focus-visible:ring-offset-[#0B1D2A]"
                      : "border border-border bg-white text-[#14181F] hover:border-[#0052FF]/40 hover:bg-[#F7F9FC] focus-visible:ring-[#0052FF]"
                  }`}
                >
                  {tier.cta}
                </button>

                <ul className="mt-7 flex flex-col gap-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[13.5px]">
                      <Check
                        className={`mt-0.5 h-4 w-4 flex-shrink-0 ${dark ? "text-[#7DA5FF]" : "text-[#0052FF]"}`}
                        strokeWidth={2.5}
                        aria-hidden
                      />
                      <span className={dark ? "text-white/75" : "text-[#14181F]/70"}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
