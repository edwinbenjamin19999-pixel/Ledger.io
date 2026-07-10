const pillars = [
  { title: "AI-first redovisning", desc: "Beslut, kontering och kontroll drivs av AI – människan godkänner, inte bokför." },
  { title: "Realtidsekonomi", desc: "Bokslut är inte ett tillfälle utan ett tillstånd – alltid uppdaterat, alltid korrekt." },
  { title: "Inga manuella steg", desc: "Från transaktion till rapport till deklaration – ett enda automatiserat flöde." },
];

export const AboutVision = () => (
  <section className="bg-white py-24 md:py-32 relative overflow-hidden">
    <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#0052FF]/5 blur-[120px]" />

    <div className="relative container mx-auto max-w-3xl px-6 text-center">
      <div className="inline-flex items-center justify-center">
        <div className="h-px w-12 bg-[#0052FF]/40" />
        <span className="px-3 text-[11px] uppercase tracking-wider text-[#0052FF] font-medium">Vision</span>
        <div className="h-px w-12 bg-[#0052FF]/40" />
      </div>
      <h2 className="mt-6 text-4xl md:text-5xl font-bold text-[#0F172A] leading-[1.05]" style={{ letterSpacing: "-0.8px" }}>
        Framtiden för bokföring är <span className="text-[#0052FF]">autonom.</span>
      </h2>
      <p className="mt-6 text-[15px] text-slate-600 leading-relaxed max-w-xl mx-auto">
        Vi bygger en värld där ekonomi inte längre är ett administrativt arbete, utan en realtidsspegel av ditt företag.
      </p>

      <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
        {pillars.map((p) => (
          <div key={p.title} className="rounded-xl border border-[#E2E8F0] bg-white p-6">
            <h3 className="text-[#0F172A] font-semibold text-[14px]">{p.title}</h3>
            <p className="mt-2 text-[13px] text-slate-500 leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
