const STEPS = [
  { n: 1, title: "Förstå grunderna", desc: "Vad är en verifikation, kontoplan och dubbelbokföring?" },
  { n: 2, title: "Hantera kvitton", desc: "Fota, attestera och bokför digitalt enligt BFL." },
  { n: 3, title: "Fakturera korrekt", desc: "Skapa fakturor som följer momslagen och betalas i tid." },
  { n: 4, title: "Stäng månaden", desc: "Avstämning, momsdeklaration och rapport till ledningen." },
];

export const BeginnerPath = () => (
  <section className="py-16 bg-slate-50/60 border-y border-slate-100">
    <div className="container mx-auto max-w-5xl px-6">
      <div className="text-center max-w-xl mx-auto mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-[#0F1B2D] tracking-tight">Nybörjarväg</h2>
        <p className="mt-3 text-[#64748b]">Fyra steg som tar dig från osäker till självgående på en eftermiddag.</p>
      </div>
      <div className="grid md:grid-cols-4 gap-4">
        {STEPS.map((s) => (
          <div key={s.n} className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm">
            <div className="w-9 h-9 rounded-full bg-[#3b82f6] text-white font-bold flex items-center justify-center">{s.n}</div>
            <h3 className="mt-4 font-semibold text-[#0F1B2D]">{s.title}</h3>
            <p className="mt-2 text-sm text-[#64748b] leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
