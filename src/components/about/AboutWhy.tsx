const stats = [
  { value: "98%", label: "Mindre manuellt arbete", desc: "AI hanterar kontering och momskoder automatiskt." },
  { value: "10x", label: "Färre fel", desc: "Inbyggda valideringar fångar avvikelser i realtid." },
  { value: "0 dgr", label: "Snabbare beslut", desc: "Rapporter är alltid à jour – inte veckor efteråt." },
  { value: "🇸🇪", label: "Byggt för Sverige", desc: "BAS 2026, K2/K3, AGI och Skatteverket-integration." },
];

export const AboutWhy = () => (
  <section className="bg-[#0F172A] py-24 md:py-32">
    <div className="container mx-auto max-w-6xl px-6">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <h2 className="text-4xl md:text-5xl font-bold text-white leading-[1.05]" style={{ letterSpacing: "-0.8px" }}>
          Varför välja <span className="text-[#3b82f6]">Cogniq?</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-7 text-center">
            <div className="text-4xl font-bold text-[#3b82f6]" style={{ letterSpacing: "-0.5px" }}>{s.value}</div>
            <div className="mt-3 text-white font-semibold text-[14px]">{s.label}</div>
            <p className="mt-2 text-[13px] text-white/50 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
