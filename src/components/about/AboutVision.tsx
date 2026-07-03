const pillars = [
  { title: "AI-first redovisning", desc: "Beslut, kontering och kontroll drivs av AI – människan godkänner, inte bokför." },
  { title: "Realtidsekonomi", desc: "Bokslut är inte ett tillfälle utan ett tillstånd – alltid uppdaterat, alltid korrekt." },
  { title: "Inga manuella steg", desc: "Från transaktion till rapport till deklaration – ett enda automatiserat flöde." },
];

export const AboutVision = () => (
  <section className="bg-[#0F1B2D] py-24 md:py-32 relative overflow-hidden">
    <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#3b82f6]/5 blur-[120px]" />

    <div className="relative container mx-auto max-w-3xl px-6 text-center">
      <div className="inline-flex items-center justify-center">
        <div className="h-px w-12 bg-[#3b82f6]/40" />
        <span className="px-3 text-[11px] uppercase tracking-wider text-[#3b82f6] font-medium">Vision</span>
        <div className="h-px w-12 bg-[#3b82f6]/40" />
      </div>
      <h2 className="mt-6 text-4xl md:text-5xl font-bold text-white leading-[1.05]" style={{ letterSpacing: "-0.8px" }}>
        Framtiden för bokföring är <span className="text-[#3b82f6]">autonom.</span>
      </h2>
      <p className="mt-6 text-[15px] text-white/60 leading-relaxed max-w-xl mx-auto">
        Vi bygger en värld där ekonomi inte längre är ett administrativt arbete, utan en realtidsspegel av ditt företag.
      </p>

      <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
        {pillars.map((p) => (
          <div key={p.title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
            <h3 className="text-white font-semibold text-[14px]">{p.title}</h3>
            <p className="mt-2 text-[13px] text-white/55 leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
