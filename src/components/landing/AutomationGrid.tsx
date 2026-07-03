import { Banknote, ScanLine, BookOpen, Receipt, ShieldAlert, LineChart } from "lucide-react";

const ITEMS = [
  { icon: Banknote, title: "Matchar banktransaktioner", desc: "Kontinuerlig bankavstämning mot verifikat — automatisk matchning mot fakturor och underlag." },
  { icon: ScanLine, title: "Tolkar kvitton och fakturor", desc: "AI extraherar belopp, moms, motpart och datum direkt från PDF eller bild (konto 5000–6999)." },
  { icon: BookOpen, title: "Föreslår och bokför kontering", desc: "Konterar mot BAS-kontoplanen automatiskt med spårbar förklaring per transaktion." },
  { icon: Receipt, title: "Räknar moms och deklaration", desc: "Momsperioder och deklarationsunderlag förbereds kontinuerligt (konto 2610–2650)." },
  { icon: ShieldAlert, title: "Upptäcker avvikelser och risker", desc: "Dubbletter, saknade underlag och ovanliga belopp flaggas tidigt." },
  { icon: LineChart, title: "Skapar prognoser och åtgärder", desc: "Resultat- och balansräkning alltid uppdaterad — likviditet och nästa steg baserat på din faktiska data." },
];

export const AutomationGrid = () => {
  return (
    <section className="section-shell">
      <div className="section-inner">
        <p className="text-[11px] uppercase tracking-[0.1em] text-[#3b82f6] mb-3">DU SLIPPER</p>
        <p className="section-label">Vad Ledger.io gör</p>
        <h2
          className="section-headline"
          style={{
            fontSize: "clamp(28px, 4vw, 40px)",
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.8px",
          }}
        >
          Det här gör Ledger.io <span style={{ color: "#3b82f6" }}>åt dig</span>
        </h2>
        <p className="text-white/50 text-[16px] max-w-xl mt-2">
          Det som tar 40 timmar manuellt — Ledger.io gör det på sekunder.
        </p>
        <p className="section-lede max-w-2xl" style={{ fontSize: 16, lineHeight: 1.6 }}>
          Sex återkommande arbetsmoment som körs automatiskt i bakgrunden — så du kan fokusera på besluten istället för bokföringen.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ITEMS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="dark-surface-card" style={{ padding: "28px 24px" }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  background: "rgba(29,217,240,0.12)",
                  borderRadius: 10,
                  padding: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon style={{ width: 20, height: 20, color: "#3b82f6" }} />
              </div>
              <h3 style={{ marginTop: 16, color: "#fff", fontSize: 16, fontWeight: 600 }}>
                {title}
              </h3>
              <p style={{ marginTop: 8, color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 1.6 }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
