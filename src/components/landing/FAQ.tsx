import { useState } from "react";

const FAQS = [
  {
    q: "Vad händer om AI:n konterar fel?",
    a: "NorthLedger bokför med hög precision mot BAS-kontoplanen, men du godkänner alltid innan något låses. Varje post är granskbar och spårbar till källtransaktionen. Du behåller full kontroll — AI:n tar bort arbetet, inte ansvaret.",
  },
  {
    q: "Måste jag kunna bokföring för att använda NorthLedger?",
    a: "Nej. NorthLedger är byggt för dig som vill slippa tänka på bokföring helt — inte för dig som redan kan det. Du kopplar ditt bankkonto, laddar upp kvitton, och AI:n sköter resten. Ingen förkunskap krävs.",
  },
  {
    q: "Är NorthLedger godkänt och i linje med svenska regler?",
    a: "Ja. Systemet följer bokföringslagen, BAS 2026 och Skatteverkets riktlinjer. Moms hanteras korrekt per transaktion och alla poster uppfyller kraven för en godkänd verifikation.",
  },
  {
    q: "Var lagras min bokföringsdata?",
    a: "Din data lagras på servrar i Sverige, krypteras i vila och transit med AES-256, och delas aldrig med tredje part. Du äger din data och kan exportera allt när som helst i SIE-format.",
  },
  {
    q: "Vad händer när jag ska deklarera?",
    a: "NorthLedger håller din bokföring löpande uppdaterad så att momsdeklaration, arbetsgivardeklaration (AGI) och inkomstdeklaration kan lämnas direkt till Skatteverket via plattformen — utan manuella formulär eller sista-minuten-stress.",
  },
  {
    q: "Kan jag byta från min nuvarande bokföringstjänst?",
    a: "Ja. Du importerar din historik via SIE-fil eller direktkoppling från Fortnox, Visma och andra system. NorthLedger matchar konton, ingående balanser och öppna poster automatiskt — du är igång samma dag.",
  },
];

export const FAQ = () => {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="py-24 px-6">
      <div className="max-w-2xl mx-auto">
        <p className="text-[11px] uppercase tracking-[0.12em] text-[#3b82f6] text-center mb-3">
          VANLIGA FRÅGOR
        </p>
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          Bra frågor förtjänar raka svar.
        </h2>

        <div>
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className="border-b border-white/10 py-5">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="w-full flex justify-between items-center text-left cursor-pointer"
                >
                  <span className="text-white font-medium text-base pr-4">
                    {item.q}
                  </span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className={`text-white/50 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {isOpen && (
                  <p className="text-white/50 text-sm leading-relaxed pt-3 pb-1">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
