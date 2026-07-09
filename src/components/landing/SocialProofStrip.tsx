/**
 * Social proof-remsa (Cogniq Design System). Top-padding kompenserar heros
 * svävande produktskärm (-mb-28/-32 i Hero.tsx).
 */
const LOGOS = ["Skanska", "Beijer", "Atlas Konsult", "Nordholm", "Vera Design", "Hemfrid"];

export const SocialProofStrip = () => {
  return (
    <section id="kunder" className="border-b border-t border-border bg-white pb-12 pt-32 md:pt-40">
      <div className="mx-auto max-w-5xl px-6">
        <p className="text-center font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
          Används av 4 200+ svenska bolag och byråer
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {LOGOS.map((name) => (
            <span
              key={name}
              className="font-display text-xl font-semibold tracking-[-0.01em] text-[#0F172A]/45"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
