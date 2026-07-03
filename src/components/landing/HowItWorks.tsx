const BankIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 10l9-6 9 6" />
    <path d="M5 10v9" />
    <path d="M9 10v9" />
    <path d="M15 10v9" />
    <path d="M19 10v9" />
    <path d="M3 21h18" />
  </svg>
);

const CpuIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="5" width="14" height="14" rx="2" />
    <rect x="9" y="9" width="6" height="6" />
    <path d="M9 2v3" /><path d="M15 2v3" />
    <path d="M9 19v3" /><path d="M15 19v3" />
    <path d="M2 9h3" /><path d="M2 15h3" />
    <path d="M19 9h3" /><path d="M19 15h3" />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

type Step = {
  n: string;
  Icon: () => JSX.Element;
  title: string;
  body: string;
  example?: string;
};

const STEPS: Step[] = [
  {
    n: "1",
    Icon: BankIcon,
    title: "Koppla ditt bankkonto",
    body: "Direktintegration mot din bank via Open Banking. Transaktioner hämtas automatiskt i realtid — inga manuella importer.",
  },
  {
    n: "2",
    Icon: CpuIcon,
    title: "AI konterar automatiskt",
    body: "Varje transaktion klassificeras mot rätt konto i BAS-kontoplanen. Moms beräknas per rad. Precision över 94% direkt ur lådan.",
    example: "Telia AB → Konto 6110 · Telefon & datakommunikation · 25% moms",
  },
  {
    n: "3",
    Icon: ShieldCheckIcon,
    title: "Du granskar — klart",
    body: "Granska AI:ns arbete på sekunder. Godkänn, justera eller flagga. Allt låses med revisionsspår. Din bokföring är alltid redo för deklaration.",
  },
];

export const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 px-6 scroll-mt-20">
      <div className="max-w-4xl mx-auto">
        <p className="text-[11px] uppercase tracking-[0.12em] text-[#3b82f6] text-center mb-3">
          SÅ HÄR FUNGERAR DET
        </p>
        <h2 className="text-3xl font-bold text-white text-center mb-4">
          Bokföring som sköter sig själv.
        </h2>
        <p className="text-white/40 text-base text-center mb-16">
          Tre steg. Inga förkunskaper. Alltid korrekt.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map(({ n, Icon, title, body, example }) => (
            <div
              key={n}
              className="relative bg-[#0a1525] rounded-2xl p-8 border border-white/5"
            >
              <div className="absolute -top-4 left-8 w-8 h-8 rounded-full bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#3b82f6] text-sm font-bold flex items-center justify-center">
                {n}
              </div>
              <div className="text-[#3b82f6] mb-4">
                <Icon />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
              <p className="text-white/45 text-sm leading-relaxed">{body}</p>
              {example && (
                <div className="bg-[#0f2040] rounded-lg p-3 mt-4 text-[11px] font-mono text-[#3b82f6]">
                  {example}
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-white/25 text-xs text-center mt-12">
          Genomsnittlig tid för att bokföra en transaktion med Ledger.io: under 3 sekunder.
        </p>
      </div>
    </section>
  );
};
