import { Shield, Brain, FileText, Building2, Users, GraduationCap, ArrowRightLeft, Clock, ArrowRight } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const faqs = [
  {
    icon: Shield,
    q: "Stämmer bokföringen verkligen?",
    a: "NorthLedger följer svenska redovisningsstandarder (BAS 2026, K2/K3) och validerar varje post med regelbaserad logik kombinerad med AI. Inget slutförs utan ditt godkännande — du har alltid full kontroll.",
  },
  {
    icon: Brain,
    q: "Kan jag verkligen lita på AI med min ekonomi?",
    a: "Ja — NorthLedger ersätter inte kontrollen, det tar bort manuellt arbete. AI:n hanterar repetitiva uppgifter medan du granskar och godkänner. All data krypteras med bank-level säkerhet (AES-256).",
  },
  {
    icon: FileText,
    q: "Vad händer om något blir fel?",
    a: "Alla poster är fullt spårbara och redigerbara. Du kan korrigera, justera eller reversera vilken transaktion som helst, när som helst. Fullständig revisionslogg finns alltid tillgänglig.",
  },
  {
    icon: Building2,
    q: "Fungerar det med Skatteverket och svenska regler?",
    a: "NorthLedger har direktkoppling till Skatteverket för moms (SKV 4700), AGI och INK2. Deklarationer förbereds automatiskt och skickas med ett klick — alltid enligt gällande regelverk.",
  },
  {
    icon: Users,
    q: "Vem passar NorthLedger för?",
    a: "NorthLedger är designat för små och medelstora företag, konsulter och e-handelsföretag som vill ersätta sin ekonomifunktion med AI — oavsett om du har en eller hundra anställda.",
  },
  {
    icon: GraduationCap,
    q: "Behöver jag kunna bokföring?",
    a: "Nej. Systemet är byggt så att du inte behöver förstå debet och kredit. NorthLedger fungerar som din personliga ekonomiavdelning.",
  },
  {
    icon: ArrowRightLeft,
    q: "Kan jag byta från mitt nuvarande system?",
    a: "Ja. NorthLedger importerar SIE4-filer och migrerar din data automatiskt. Hela övergången tar bara några minuter.",
  },
  {
    icon: Clock,
    q: "Hur mycket tid kan jag spara?",
    a: "De flesta användare minskar sitt manuella ekonomiarbete med 70–90%. Allt från bokföring till deklarationer sköts autonomt.",
  },
];

export const FAQ = () => {
  return (
    <section className="py-20 sm:py-28 bg-[#0B1D2A]">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="font-[800] text-white mb-3"
              style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-1.5px" }}
            >
              Frågor innan du kommer igång?
            </h2>
            <p className="text-white/50 text-lg">
              Allt du behöver veta innan du låter AI sköta din ekonomi
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border-0 bg-white/[0.03] rounded-xl border border-white/[0.08] hover:border-white/[0.12] transition-colors"
              >
                <AccordionTrigger className="px-5 py-4 hover:no-underline gap-3 text-left">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-9 h-9 rounded-lg bg-[rgba(8,145,178,0.08)] flex items-center justify-center flex-shrink-0">
                      <faq.icon className="w-[18px] h-[18px] text-[#3b82f6]" />
                    </div>
                    <span className="text-[15px] sm:text-base font-semibold text-white/90">{faq.q}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5 pt-0 pl-[4.25rem]">
                  <p className="text-white/50 text-sm leading-relaxed">{faq.a}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-14 text-center">
            <p className="text-white/80 font-semibold text-lg mb-4">Fortfarande osäker?</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                asChild
                className="h-11 px-6 bg-white text-[#050d1a] hover:bg-white/90 font-semibold rounded-lg"
              >
                <a href="/auth">
                  Testa NorthLedger
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </a>
              </Button>
              <Button
                asChild
                variant="glass"
                className="h-11 px-6 rounded-lg"
              >
                <a href="mailto:kontakt@northledger.se">Boka demo</a>
              </Button>
            </div>
            <p className="text-xs text-white/30 mt-3">Ingen bindningstid. Kom igång på några minuter.</p>
          </div>
        </div>
      </div>
    </section>
  );
};
