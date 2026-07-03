const QUOTES = [
  { text: "Momsen sköter sig själv.", who: "VD, konsultbolag" },
  { text: "Vi bokför 3× fler klienter nu.", who: "Redovisningskonsult" },
  { text: "Sparar minst 10 timmar i månaden.", who: "Grundare, tech-startup" },
  { text: "AGI klar på 5 minuter, inte 2 timmar.", who: "CFO, medelstort bolag" },
  { text: "Kvitton in, bokfört ut. Inget annat.", who: "Egenföretagare" },
  { text: "Bästa bytet vi gjort på 5 år.", who: "Ekonomiansvarig" },
];

export const SocialProofStrip = () => {
  // Duplicate for seamless infinite loop
  const items = [...QUOTES, ...QUOTES];

  return (
    <div className="bg-[#0a1628] py-3 border-t border-b border-white/5 overflow-hidden">
      <div className="sps-track flex items-center" style={{ width: "max-content" }}>
        {items.map((q, i) => (
          <div key={i} className="flex items-center">
            <span className="px-8 whitespace-nowrap text-white/35 text-[13px] italic">
              "{q.text}" — {q.who}
            </span>
            <span className="text-white/15" aria-hidden>·</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes spsScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .sps-track {
          animation: spsScroll 40s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .sps-track { animation: none; }
        }
      `}</style>
    </div>
  );
};

export default SocialProofStrip;
