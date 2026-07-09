/**
 * Social proof-remsa (Cogniq Design System). Top-padding kompenserar heros
 * svävande produktskärm (-mb-28/-32 i Hero.tsx). Bolagsnamn utbytta mot
 * bransch-/kundsegment (inga påhittade kundlogotyper).
 */
const SEGMENTS = [
  "Startups",
  "Redovisningsbyråer",
  "E-handel",
  "Konsulter",
  "Fastighet",
  "Restaurang",
];

export const SocialProofStrip = () => {
  return (
    <section id="kunder" className="border-b border-t border-border bg-white py-12">
      <div className="mx-auto max-w-5xl px-6">
        <p className="text-center font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
          Byggt för svenska bolag och byråer
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
          {SEGMENTS.map((name) => (
            <span
              key={name}
              className="font-display text-lg font-semibold tracking-[-0.01em] text-[#0F172A]/40"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
