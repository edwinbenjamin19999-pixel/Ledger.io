import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";

const ICON_CLASS = "w-6 h-6 text-[#3b82f6] mb-4";

const ZapIcon = () => (
  <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const BankIcon = () => (
  <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18" />
    <path d="M3 10h18" />
    <path d="M5 6l7-3 7 3" />
    <path d="M4 10v11" />
    <path d="M20 10v11" />
    <path d="M8 14v3" />
    <path d="M12 14v3" />
    <path d="M16 14v3" />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const PercentIcon = () => (
  <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="5" x2="5" y2="19" />
    <circle cx="6.5" cy="6.5" r="2.5" />
    <circle cx="17.5" cy="17.5" r="2.5" />
  </svg>
);

const FileTextIcon = () => (
  <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="9" y1="17" x2="15" y2="17" />
  </svg>
);

const RefreshIcon = () => (
  <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
    <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
  </svg>
);

const UploadIcon = () => (
  <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const CalendarIcon = () => (
  <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const UsersIcon = () => (
  <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const DownloadIcon = () => (
  <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const FEATURES: { icon: () => JSX.Element; title: string; body: string }[] = [
  {
    icon: ZapIcon,
    title: "Automatisk kontering",
    body: "Varje transaktion klassificeras mot rätt konto i BAS-kontoplanen. Moms beräknas per rad. Precision över 94% direkt ur lådan.",
  },
  {
    icon: BankIcon,
    title: "Bankintegration i realtid",
    body: "Direktkoppling mot din bank via Open Banking. Transaktioner hämtas automatiskt — inga manuella importer eller CSV-filer.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Du godkänner alltid",
    body: "AI bokför — du granskar. Varje post är spårbar till källtransaktionen och låses först när du godkänner.",
  },
  {
    icon: UsersIcon,
    title: "Bjud in hela teamet",
    body: "VD bjuder in CFO, ekonom eller kollega. Alla ser samma bokföring i realtid — med rätt behörighet för varje roll. Utlägg registreras av den som gjort dem, inte av administratören.",
  },
  {
    icon: PercentIcon,
    title: "Momshantering",
    body: "Utgående och ingående moms beräknas automatiskt per transaktion. Momsdeklarationen är alltid redo.",
  },
  {
    icon: FileTextIcon,
    title: "Löpande bokslut",
    body: "Resultat- och balansräkning uppdateras i realtid. Du ser alltid var företaget står — ingen väntan på månadsslut.",
  },
  {
    icon: RefreshIcon,
    title: "Kontinuerlig bankavstämning",
    body: "Banksaldo stäms av mot verifikat automatiskt. Avvikelser flaggas direkt — inte vid nästa revision.",
  },
  {
    icon: UploadIcon,
    title: "Kvittohantering",
    body: "Fotografera kvittot — AI tolkar, konterar och matchar mot rätt transaktion. Fysiska kvitton behövs aldrig.",
  },
  {
    icon: CalendarIcon,
    title: "Deklarationsredo",
    body: "Momsdeklaration, arbetsgivardeklaration och årsredovisning förbereds automatiskt. Du eller din revisor granskar och signerar.",
  },
  {
    icon: DownloadIcon,
    title: "SIE-export",
    body: "Exportera all bokföring i SIE-format när som helst. Fullt kompatibelt med alla svenska bokföringsprogram. Ingen inlåsning.",
  },
];

export default function Funktioner() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050d1a]">
      <Header />

      {/* Page header */}
      <section className="pt-32 pb-16 text-center px-6">
        <p className="text-[11px] uppercase tracking-[0.12em] text-[#3b82f6] mb-3">
          FUNKTIONER
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-white mt-2 mb-4">
          Allt du behöver. Inget du inte behöver.
        </h1>
        <p className="text-white/50 text-lg max-w-xl mx-auto">
          Ledger.io sköter hela bokföringen i bakgrunden — från transaktion till deklaration.
        </p>
      </section>

      {/* Features grid */}
      <div className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-16">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="bg-[#0a1525] rounded-2xl p-7 border border-white/5 hover:border-white/10 transition-colors"
            >
              <Icon />
              <h3 className="text-white font-semibold text-base mb-2">{title}</h3>
              <p className="text-white/45 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <section className="py-20 text-center border-t border-white/5 mt-8 px-6">
        <h2 className="text-2xl font-bold text-white mb-4">
          Redo att sluta bokföra manuellt?
        </h2>
        <p className="text-white/40 text-sm mb-8">
          Pilotfas pågår — begränsat antal platser.
        </p>
        <button
          onClick={() => navigate("/")}
          className="bg-white text-black font-semibold px-8 py-3 rounded-xl hover:bg-white/90 transition"
        >
          Säkra din plats →
        </button>
      </section>
    </div>
  );
}
