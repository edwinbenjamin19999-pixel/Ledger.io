const pillars = [
  {
    title: "Automatiserad bokföring",
    desc: "Lägg noll tid på bokföring. Ledger.io konterar mot BAS-kontoplanen automatiskt — du fokuserar på företaget.",
  },
  {
    title: "Direkt till myndigheter",
    desc: "Moms (konto 2610–2650), AGI och inkomstskatt lämnas direkt till Skatteverket. Inga formulär, inga glömda deadlines.",
  },
  {
    title: "Bankintegrationer",
    desc: "Koppla din bank en gång. Kontinuerlig bankavstämning mot verifikat — varje transaktion matchas och konteras automatiskt.",
  },
  {
    title: "Revision & kontroll",
    desc: "Resultat- och balansräkning alltid uppdaterad. Varje post är spårbar, verifierbar och revisionssäker.",
  },
];

export const Pillars = () => {
  return (
    <section className="section-shell">
      <div className="section-inner">
        <p className="section-label">Plattformen</p>
        <h2 className="section-headline text-3xl md:text-4xl font-semibold tracking-tight">
          Fyra grundpelare — ett enda system.
        </h2>
        <p className="section-lede text-[15px] leading-relaxed max-w-2xl">
          Allt du behöver för automatiserad bokföring och rapportering, integrerat från dag ett.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {pillars.map((p) => (
            <div key={p.title} className="dark-surface-card" style={{ padding: "28px 24px" }}>
              <div className="h-px w-8 bg-[#3b82f6] mb-6" />
              <h3 className="text-white font-medium text-base mb-2">{p.title}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
