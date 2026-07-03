import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StickyTOC } from "@/components/guides/StickyTOC";
import { VatRateCard } from "@/components/guides/VatRateCard";
import { FAQAccordion } from "@/components/guides/FAQAccordion";
import { Button } from "@/components/ui/button";
import { Calculator, ArrowRight, AlertTriangle, Sparkles, CalendarClock } from "lucide-react";

const TOC = [
  { id: "vad-ar-moms", label: "Vad är moms?" },
  { id: "momssatser", label: "Svenska momssatser" },
  { id: "sankt-matmoms", label: "Sänkt matmoms 2026–2027" },
  { id: "bokforing", label: "Hur moms bokförs" },
  { id: "deklaration", label: "Momsdeklaration" },
  { id: "vanliga-fel", label: "Vanliga fel" },
  { id: "automation", label: "NorthLedger & moms" },
  { id: "faq", label: "FAQ" },
];

const FAQS = [
  { q: "När gäller sänkt matmoms?", a: "Riksdagen har beslutat att tillfälligt sänka momsen på livsmedel från 12 % till 6 % under perioden 1 april 2026 – 31 december 2027 (Prop. 2025/26:100). Sänkningen omfattar livsmedel, alkoholfria drycker och mat för avhämtning." },
  { q: "Påverkas restaurangbesök av sänkt matmoms?", a: "Nej. Restaurang- och cateringtjänster på plats är kvar på 12 %. Det är endast livsmedel som säljs som vara — inklusive avhämtning, leverans och take-away — som omfattas av den tillfälliga 6 %-satsen." },
  { q: "Hur ofta ska jag deklarera moms?", a: "Det beror på omsättning. Under 1 mkr: helår. 1–40 mkr: kvartal. Över 40 mkr: månad. Du kan välja kortare period frivilligt." },
  { q: "Vad är skillnaden mellan ingående och utgående moms?", a: "Utgående moms är den du tar betalt av kunder. Ingående är den du betalar till leverantörer. Du betalar mellanskillnaden till Skatteverket." },
  { q: "Får jag dra av moms på representation?", a: "Ja — men begränsat. För måltider får du dra av moms på max 300 kr per person och tillfälle." },
  { q: "Hur fungerar omvänd skattskyldighet?", a: "Vid EU-handel mellan företag fakturerar säljaren utan moms. Köparen redovisar både utgående och ingående moms i sin deklaration — netto noll." },
  { q: "Kan NorthLedger lämna in min momsdeklaration?", a: "Ja. Med koppling till Skatteverket kan NorthLedger förbereda och lämna in SKV 4700 automatiskt vid varje period." },
];

export default function VatGuidePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header lightBg />
      <main className="flex-1">
        {/* Hero */}
        <section className="pt-32 pb-12 bg-gradient-to-b from-amber-50/40 to-white">
          <div className="container mx-auto max-w-3xl px-6 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/60 bg-[#FAEEDA] px-3 py-1 text-xs font-medium text-[#7A5417]">
              <Calculator className="w-3 h-3" />
              Svensk momsguide
            </div>
            <h1 className="mt-5 text-4xl md:text-5xl font-bold tracking-tight text-[#0f1f35]">Allt om svensk moms</h1>
            <p className="mt-5 text-lg text-[#475569] leading-relaxed">
              Momssatser, kontoplan, deklaration och vanliga fel — i en guide. Uppdaterad enligt regler 2026.
            </p>
            <a href="#sankt-matmoms" className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-[#F0DDB7] bg-white px-4 py-2.5 text-sm text-[#7A5417] shadow-sm hover:shadow transition-shadow">
              <CalendarClock className="w-4 h-4 text-[#7A5417]" />
              <span><b>Aktuellt:</b> Sänkt matmoms 12 % → 6 % från 1 april 2026 till 31 december 2027</span>
            </a>
          </div>
        </section>

        {/* Body */}
        <section className="py-12">
          <div className="container mx-auto max-w-6xl px-6 grid lg:grid-cols-[200px_1fr] gap-12">
            <StickyTOC items={TOC} />
            <article className="max-w-3xl space-y-14">
              <section id="vad-ar-moms" className="scroll-mt-24">
                <h2 className="text-2xl md:text-3xl font-bold text-[#0f1f35] tracking-tight">Vad är moms?</h2>
                <p className="mt-4 text-[#334155] leading-[1.8] text-[17px]">
                  Mervärdesskatt (moms) är en konsumtionsskatt som läggs på varor och tjänster. Företag agerar som uppbördsmän — de tar in momsen från kunder och betalar in skillnaden mellan utgående och ingående moms till Skatteverket.
                </p>
              </section>

              <section id="momssatser" className="scroll-mt-24">
                <h2 className="text-2xl md:text-3xl font-bold text-[#0f1f35] tracking-tight">Svenska momssatser</h2>
                <p className="mt-3 text-[#334155] leading-[1.8] text-[17px]">Sverige har tre momssatser plus momsfri försäljning.</p>
                <div className="mt-6 grid sm:grid-cols-3 gap-4">
                  <VatRateCard rate="25 %" label="Standardsats" examples={["Konsulttjänster", "Mjukvara", "Kontorsmaterial", "De flesta varor"]} accent="text-[#3b82f6]" />
                  <VatRateCard rate="12 %" label="Reducerad" examples={["Restaurang & catering (på plats)", "Hotell & camping", "Konstverk"]} accent="text-[#7A5417]" />
                  <VatRateCard rate="6 %" label="Lägsta" examples={["Böcker & tidningar", "Persontransport", "Kultur & idrott", "Livsmedel & avhämtning (tillfälligt 2026–2027)"]} accent="text-[#085041]" />
                </div>
                <p className="mt-3 text-xs text-[#7A5417]">
                  Notera: Livsmedel och mat för avhämtning är tillfälligt 6 % under perioden 1 april 2026 – 31 december 2027 (Prop. 2025/26:100). Restaurang/café på plats är kvar på 12 %.
                </p>
              </section>

              <section id="sankt-matmoms" className="scroll-mt-24">
                <h2 className="text-2xl md:text-3xl font-bold text-[#0f1f35] tracking-tight flex items-center gap-2">
                  <CalendarClock className="w-6 h-6 text-[#7A5417]" />
                  Sänkt matmoms 2026–2027
                </h2>
                <div className="mt-5 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/60 to-white p-6 md:p-7">
                  <p className="text-[#334155] leading-[1.8] text-[17px]">
                    Riksdagen har beslutat att tillfälligt sänka momsen på <b>livsmedel</b> från 12 % till <b>6 %</b> under perioden <b>1 april 2026 – 31 december 2027</b> (Prop. 2025/26:100). Syftet är att dämpa hushållens matkostnader.
                  </p>
                  <ul className="mt-4 space-y-2 text-[#334155] leading-[1.7] text-[16px] list-disc pl-6 marker:text-[#7A5417]">
                    <li><b>Omfattas (6 %):</b> råvaror, förädlade livsmedel, alkoholfria drycker — samt <b>mat för avhämtning</b>, leverans och take-away (Foodora, Wolt, Uber Eats).</li>
                    <li><b>Kvar på 12 %:</b> restaurang- och cateringtjänster <b>på plats</b>, hotell, camping, konstverk.</li>
                    <li><b>Kvar på 25 %:</b> alkoholhaltiga drycker (öl, vin, sprit) — oavsett serveringsform.</li>
                    <li><b>Prispåverkan:</b> en sänkning från 12 % till 6 % motsvarar ca <b>−5,36 %</b> till konsumenten om hela sänkningen förs vidare.</li>
                  </ul>
                  <p className="mt-4 text-sm text-[#475569]">
                    Källor:{" "}
                    <a href="https://www.skatteverket.se/foretag/moms/saljavarorochtjanster/momsforlivsmedel.4.html" target="_blank" rel="noopener noreferrer" className="text-[#3b82f6] underline underline-offset-2">Skatteverket — Moms på livsmedel</a>{" · "}
                    <a href="https://www.verksamt.se" target="_blank" rel="noopener noreferrer" className="text-[#3b82f6] underline underline-offset-2">Verksamt.se</a>
                  </p>
                </div>
                <p className="mt-4 text-[#334155] leading-[1.8] text-[17px]">
                  NorthLedger hanterar övergången automatiskt: alla transaktioner med leveransdatum inom perioden bokförs på 6 %-konton (2630/3012), medan transaktioner före och efter perioden använder 12 %-konton (2620/3011). Du behöver inte ställa om något manuellt.
                </p>
              </section>

              <section id="bokforing" className="scroll-mt-24">
                <h2 className="text-2xl md:text-3xl font-bold text-[#0f1f35] tracking-tight">Hur moms bokförs</h2>
                <p className="mt-3 text-[#334155] leading-[1.8] text-[17px]">
                  Moms bokförs på BAS-konton i 2600-serien. Varje momssats har egna konton för in- och utgående moms.
                </p>
                <ul className="mt-5 space-y-2 text-[#334155] leading-[1.7] text-[17px] list-disc pl-6 marker:text-[#3b82f6]">
                  <li><b>2611</b> — Utgående moms 25 %</li>
                  <li><b>2621</b> — Utgående moms 12 %</li>
                  <li><b>2631</b> — Utgående moms 6 %</li>
                  <li><b>2641</b> — Ingående moms (alla satser)</li>
                  <li><b>2650</b> — Redovisningskonto för moms (skuld/fordran till Skatteverket)</li>
                </ul>
              </section>

              <section id="deklaration" className="scroll-mt-24">
                <h2 className="text-2xl md:text-3xl font-bold text-[#0f1f35] tracking-tight">Hur momsdeklaration fungerar</h2>
                <ol className="mt-4 space-y-3 list-decimal pl-6 text-[#334155] leading-[1.7] text-[17px] marker:text-[#3b82f6] marker:font-bold">
                  <li>Sammanställ utgående moms (rutorna 10–12) från försäljning under perioden</li>
                  <li>Sammanställ ingående moms (ruta 48) från inköp</li>
                  <li>Kontrollera EU-handel (rutorna 20, 21, 30, 31)</li>
                  <li>Beräkna nettoskuld (utgående minus ingående) — ruta 49</li>
                  <li>Lämna in via Skatteverkets e-tjänst eller automatiskt via NorthLedger</li>
                </ol>
              </section>

              <section id="vanliga-fel" className="scroll-mt-24">
                <h2 className="text-2xl md:text-3xl font-bold text-[#0f1f35] tracking-tight">Vanliga fel</h2>
                <div className="mt-5 space-y-3">
                  {[
                    "Restaurangnota med alkohol bokförd som 12 % istället för 25 %",
                    "Blandat ihop avhämtning (6 % under 2026–2027) med restaurang på plats (12 %)",
                    "Glömt bort representation-tak på 300 kr/person",
                    "Felaktig hantering av EU-tjänsteinköp (omvänd skattskyldighet)",
                    "Bokfört faktura i fel period (kontant vs faktureringsmetod)",
                    "Missat att rapportera EU-försäljning i ruta 35 / VIES-deklaration",
                  ].map((f) => (
                    <div key={f} className="flex gap-3 rounded-xl bg-amber-50/50 border border-amber-100 p-4">
                      <AlertTriangle className="w-4 h-4 text-[#7A5417] shrink-0 mt-0.5" />
                      <span className="text-[#475569] text-sm leading-relaxed">{f}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section id="automation" className="scroll-mt-24">
                <h2 className="text-2xl md:text-3xl font-bold text-[#0f1f35] tracking-tight">Hur NorthLedger automatiserar moms</h2>
                <div className="mt-5 rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-100 p-6 md:p-8">
                  <Sparkles className="w-6 h-6 text-[#3b82f6]" />
                  <p className="mt-3 text-[#334155] leading-[1.8] text-[17px]">
                    NorthLedger väljer momskod automatiskt baserat på leverantör, produkttyp och historik. Vid periodslut sammanställs deklarationen automatiskt med alla rutor på SKV 4700 — du behöver bara godkänna inlämningen.
                  </p>
                  <div className="mt-4">
                    <Button asChild className="bg-[#3b82f6] text-white hover:bg-[#3b82f6]">
                      <Link to="/resources/ai-bookkeeping">Läs om AI-bokföring <ArrowRight className="w-4 h-4 ml-1" /></Link>
                    </Button>
                  </div>
                </div>
              </section>

              <section id="faq" className="scroll-mt-24">
                <h2 className="text-2xl md:text-3xl font-bold text-[#0f1f35] tracking-tight mb-5">FAQ</h2>
                <FAQAccordion items={FAQS} />
              </section>

              <section className="rounded-2xl bg-[#0f1f35] p-8 md:p-10 text-white text-center">
                <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Slipp tänka på moms</h3>
                <p className="mt-2 text-white/70 max-w-md mx-auto">Låt NorthLedger sköta kodning, beräkning och inlämning automatiskt.</p>
                <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
                  <Button asChild className="bg-[#3b82f6] text-[#0a1428] hover:bg-[#3b82f6] font-semibold">
                    <Link to="/auth">Testa gratis <ArrowRight className="w-4 h-4 ml-1" /></Link>
                  </Button>
                  <Button asChild variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white">
                    <Link to="/contact">Boka demo</Link>
                  </Button>
                </div>
              </section>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
