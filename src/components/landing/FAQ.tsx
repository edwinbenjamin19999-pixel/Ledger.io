import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "Är Cogniq bara ännu ett AI-bokföringsverktyg?",
    a: "Nej. Att bokföra automatiskt är utgångspunkten, inte målet. Cogniq förvandlar din löpande bokföring till prognoser, avvikelser och beslutsunderlag i realtid — en hel ekonomifunktion, inte bara en robot som konterar. Det är skillnaden mellan att se bakåt och att ligga steget före.",
  },
  {
    q: "Vad händer om AI:n konterar fel?",
    a: "Cogniq bokför med hög precision mot BAS-kontoplanen, men du godkänner alltid innan något låses. Varje post är granskbar och spårbar till källtransaktionen. Du behåller full kontroll — AI:n tar bort arbetet, inte ansvaret.",
  },
  {
    q: "Måste jag kunna bokföring för att använda Cogniq?",
    a: "Nej. Cogniq är byggt för dig som vill slippa tänka på bokföring helt — inte för dig som redan kan det. Du kopplar ditt bankkonto, laddar upp kvitton, och AI:n sköter resten. Ingen förkunskap krävs.",
  },
  {
    q: "Är Cogniq godkänt och i linje med svenska regler?",
    a: "Ja. Systemet följer bokföringslagen, BAS 2026 och Skatteverkets riktlinjer. Moms hanteras korrekt per transaktion och alla poster uppfyller kraven för en godkänd verifikation.",
  },
  {
    q: "Var lagras min bokföringsdata?",
    a: "Din data lagras på servrar i Sverige, krypteras i vila och transit med AES-256, och delas aldrig med tredje part. Du äger din data och kan exportera allt när som helst i SIE-format.",
  },
  {
    q: "Vad händer när jag ska deklarera?",
    a: "Cogniq håller din bokföring löpande uppdaterad så att momsdeklaration, arbetsgivardeklaration (AGI) och inkomstdeklaration kan lämnas direkt till Skatteverket via plattformen — utan manuella formulär eller sista-minuten-stress.",
  },
  {
    q: "Kan jag byta från min nuvarande bokföringstjänst?",
    a: "Ja. Du importerar din historik via SIE-fil eller direktkoppling från Fortnox, Visma och andra system. Cogniq matchar konton, ingående balanser och öppna poster automatiskt — du är igång samma dag.",
  },
];

/**
 * FLAT FAQ — vit sektion, mörk text, tjocka border-2-avdelare mellan
 * frågor (flat-systemets enda tillåtna divider). Öppen fråga markeras
 * med blå kant — färg som struktur, inte skugga.
 */
export const FAQ = () => {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="bg-[#F5F8FF] py-24 px-6">
      <div className="mx-auto max-w-2xl">
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.15em] text-[#0052FF]">
          Vanliga frågor
        </p>
        <h2 className="mb-12 text-center text-3xl md:text-4xl font-extrabold tracking-tight text-[#0F172A]">
          Bra frågor förtjänar raka svar.
        </h2>

        <div>
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={item.q}
                className={`border-b-2 py-5 transition-colors duration-200 ${
                  isOpen ? "border-[#0052FF]" : "border-gray-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full cursor-pointer items-center justify-between rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF] focus-visible:ring-offset-2"
                >
                  <span
                    className={`pr-4 text-base font-semibold transition-colors duration-200 ${
                      isOpen ? "text-[#0052FF]" : "text-[#0F172A]"
                    }`}
                  >
                    {item.q}
                  </span>
                  <ChevronDown
                    aria-hidden
                    className={`h-5 w-5 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-[#0052FF]" : "text-[#0F172A]/40"
                    }`}
                    strokeWidth={2.5}
                  />
                </button>
                {isOpen && (
                  <p className="pt-3 pb-1 text-sm leading-relaxed text-[#0F172A]/60">
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
