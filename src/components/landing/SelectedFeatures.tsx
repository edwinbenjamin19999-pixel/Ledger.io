const features = [
  {
    title: "Auto-bokföring",
    desc: "Transaktioner med ≥95% konfidens bokförs autonomt. Lägre tröskel går till granskning.",
  },
  {
    title: "Moms & AGI till Skatteverket",
    desc: "Förbered, granska och lämna in deklarationer direkt från plattformen.",
  },
  {
    title: "Kassaflödesprognos 12 mån",
    desc: "Drivarbaserad modell med scenarier — bas, optimistiskt, pessimistiskt.",
  },
  {
    title: "Bokslut & årsredovisning",
    desc: "K2 och K3 med automatiserad mappning till SRU-koder och Bolagsverket.",
  },
  {
    title: "AI CFO",
    desc: "Löpande analys av marginaler, likviditet och avvikelser — med åtgärdsförslag.",
  },
  {
    title: "Lönehantering & arbetsgivardeklaration",
    desc: "Löner beräknas och betalas ut automatiskt. AGI lämnas direkt till Skatteverket varje månad.",
  },
];

export const SelectedFeatures = () => {
  return (
    <section id="features" className="section-shell">
      <div className="section-inner">
        <p className="section-label">Funktioner</p>
        <h2 className="section-headline text-3xl md:text-4xl font-semibold tracking-tight">
          Det som ersätter manuellt arbete.
        </h2>
        <p className="section-lede text-[15px] leading-relaxed max-w-2xl">
          Sex kärnflöden som körs autonomt — granskade, spårbara och alltid aktuella.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="dark-surface-card"
              style={{ padding: "28px 24px" }}
            >
              <h3 className="text-white font-medium text-lg mb-2">{f.title}</h3>
              <p className="text-white/60 text-sm leading-relaxed max-w-md">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
