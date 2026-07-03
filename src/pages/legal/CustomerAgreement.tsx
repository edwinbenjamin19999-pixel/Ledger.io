import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect } from "react";

const VERSION = "v2025-01";
const EFFECTIVE_DATE = "2025-01-15";

const CustomerAgreement = () => {
  useEffect(() => {
    document.title = `Kundavtal ${VERSION} – Bokfy`;
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#0F1B2D]">

      <Header lightBg />

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
          <div className="mb-10 pb-6 border-b border-slate-200">
            <p className="text-sm text-[#3b82f6] font-semibold tabular-nums mb-2">
              {VERSION} · Gäller från {EFFECTIVE_DATE}
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-[#0F1B2D] mb-3">
              Kundavtal
            </h1>
            <p className="text-base text-slate-600">
              Detta avtal reglerar förhållandet mellan Bokfy AB (&quot;Bokfy&quot;) och kunden
              (&quot;Kunden&quot;) avseende användning av Bokfy:s tjänster.
            </p>
          </div>

          <article className="prose prose-slate max-w-none prose-headings:text-[#0F1B2D] prose-h2:text-2xl prose-h2:font-semibold prose-h2:mt-10 prose-h2:mb-3 prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-2 prose-p:text-slate-700 prose-p:leading-relaxed prose-li:text-slate-700 prose-strong:text-[#0F1B2D]">
            <h2>1. Parter och definitioner</h2>
            <p>
              Avtalet ingås mellan Bokfy AB, org.nr [556xxx-xxxx] (&quot;Bokfy&quot;) och den
              juridiska person som registrerar konto i tjänsten (&quot;Kunden&quot;). Med
              &quot;Tjänsten&quot; avses Bokfy:s molnbaserade plattform för bokföring,
              ekonomistyrning, AI-assisterad analys och tillhörande integrationer.
            </p>

            <h2>2. Tjänstens omfattning</h2>
            <p>
              Tjänsten omfattar bokföring enligt BAS-kontoplanen, AI-driven verifikationshantering,
              moms- och AGI-deklarationer, fakturering, bankintegration via PSD2, lönehantering,
              årsredovisning samt övriga moduler i den prenumerationsnivå Kunden valt.
              Funktionsutvecklingen sker löpande och nya funktioner kan tillkomma utan särskilt
              meddelande.
            </p>

            <h2>3. Avtalstid och uppsägning</h2>
            <ul>
              <li>Inledande avtalstid är 12 månader från aktiveringsdatum.</li>
              <li>Avtalet förlängs automatiskt med 12 månader åt gången om uppsägning inte sker.</li>
              <li>Uppsägning ska ske skriftligen senast 30 dagar före utgången av innevarande avtalsperiod.</li>
              <li>Kostnadsfritt testkonto erbjuds under utvärderingsperioden utan bindning.</li>
            </ul>

            <h2>4. Pris och betalning</h2>
            <h3>4.1 Prislista</h3>
            <p>
              Vid avtalsstart gäller den prislista som publiceras på{" "}
              <a href="/pricing" className="text-[#3b82f6] no-underline hover:underline">
                bokfy.se/pricing
              </a>
              .
            </p>

            <h3>4.2 Fakturering</h3>
            <p>
              Fakturering sker månadsvis i förskott med betalningsvillkor 20 dagar netto.
              Vid utebliven betalning debiteras dröjsmålsränta enligt räntelagen samt lagstadgad
              påminnelse- och inkassoavgift.
            </p>

            <h3>4.3 Årlig KPI-justering</h3>
            <p>
              Priserna justeras automatiskt den 1 januari varje år enligt förändringen i
              Konsumentprisindex (KPI, 1980 = 100) med oktober föregående år som basmånad.
              Justering om mindre än 2 % behöver inte aviseras separat.
            </p>

            <h3>4.4 Marknadsjustering vid ny avtalsperiod</h3>
            <p>
              Vid ingången av varje ny 12-månadersperiod har Bokfy rätt att justera priserna
              utöver KPI för att spegla utvecklade tjänster, ökade leverantörskostnader eller
              förändrat marknadsläge. Sådan justering meddelas skriftligen senast 90 dagar före
              ny period. Om höjningen utöver KPI överstiger 10 % har Kunden rätt att säga upp
              avtalet utan kostnad till ny periods början.
            </p>

            <h3>4.5 Tilläggstjänster</h3>
            <p>
              Tilläggstjänster (BankID-signaturer, extra användare, premium-integrationer,
              support utöver standard) prissätts enligt vid var tid gällande prislista och
              faktureras löpande.
            </p>

            <h2>5. Kundens åtaganden</h2>
            <ul>
              <li>Lämna korrekta och fullständiga uppgifter vid KYC-registrering enligt lag (2017:630) om åtgärder mot penningtvätt.</li>
              <li>Säkerställa att den som signerar avtalet har behörighet enligt Bolagsverkets registrerade firmateckningsregel.</li>
              <li>Skydda inloggningsuppgifter och BankID samt omedelbart anmäla misstanke om obehörig åtkomst.</li>
              <li>Använda Tjänsten i enlighet med svensk lag, bokföringslagen (1999:1078) och god redovisningssed.</li>
            </ul>

            <h2>6. Bokfy:s åtaganden</h2>
            <ul>
              <li>Tillgänglighet om minst 99,5 % räknat per kalendermånad, exklusive aviserat underhåll.</li>
              <li>Support på svenska under kontorstid via mejl och inbyggd chatt.</li>
              <li>Drift och lagring inom EU/EES.</li>
              <li>Säkerhetsåtgärder enligt branschstandard (kryptering i transit och vila, RLS, MFA).</li>
            </ul>

            <h2>7. Personuppgifter</h2>
            <p>
              Bokfy agerar personuppgiftsbiträde åt Kunden för de personuppgifter som behandlas
              i Tjänsten. Behandlingen regleras i separat{" "}
              <a href="/legal/dpa" className="text-[#3b82f6] no-underline hover:underline">
                personuppgiftsbiträdesavtal (DPA)
              </a>
              . För egna personuppgifter (t.ex. kontaktpersoner) gäller{" "}
              <a href="/legal/privacy" className="text-[#3b82f6] no-underline hover:underline">
                integritetspolicyn
              </a>
              .
            </p>

            <h2>8. Sekretess</h2>
            <p>
              Parterna förbinder sig att inte röja konfidentiell information om motparten till
              tredje man, varken under avtalstiden eller under fem år efter dess upphörande.
              Sekretessen gäller inte information som är allmänt känd eller som part är skyldig
              att lämna ut enligt lag eller myndighetsbeslut.
            </p>

            <h2>9. Immateriella rättigheter</h2>
            <p>
              Kunden äger samtliga rättigheter till den data som lagras i Tjänsten (bokföring,
              fakturor, kunduppgifter etc.). Bokfy äger samtliga rättigheter till plattformen,
              källkod, AI-modeller och varumärke. Kunden får under avtalstiden en
              icke-exklusiv, icke-överlåtbar nyttjanderätt till Tjänsten.
            </p>

            <h2>10. Ansvarsbegränsning</h2>
            <p>
              Bokfy:s totala ansvar gentemot Kunden är begränsat till de avgifter Kunden
              erlagt under de senaste 12 månaderna före den händelse som föranlett anspråket.
              Bokfy ansvarar inte för indirekt skada såsom utebliven vinst, förlorade affärer
              eller tredjemansskada. Begränsningen gäller inte vid uppsåt eller grov vårdslöshet.
            </p>

            <h2>11. Force majeure</h2>
            <p>
              Part är befriad från ansvar för underlåtenhet att fullgöra förpliktelse om detta
              beror på omständighet utanför partens kontroll, såsom myndighetsåtgärd, krig,
              naturkatastrof, omfattande arbetskonflikt, cyberangrepp eller avbrott i allmänna
              kommunikationer.
            </p>

            <h2>12. Underleverantörer</h2>
            <p>
              Bokfy använder underleverantörer för drift, lagring, AI-tjänster och e-post.
              Aktuell lista över underbiträden finns i{" "}
              <a href="/legal/dpa" className="text-[#3b82f6] no-underline hover:underline">
                DPA
              </a>
              . Tillkommande underleverantörer meddelas Kunden i förväg.
            </p>

            <h2>13. Ändringar i avtalsvillkor</h2>
            <p>
              Bokfy kan ändra dessa villkor med minst 60 dagars varsel. Vid väsentligt
              försämrade villkor har Kunden rätt att säga upp avtalet utan kostnad till
              ändringens ikraftträdande. Mindre justeringar (språkliga, klargöranden) gäller
              utan särskild uppsägningsrätt.
            </p>

            <h2>14. Tvist</h2>
            <p>
              På detta avtal tillämpas svensk rätt. Tvist ska i första hand lösas genom
              förhandling. Om parterna inte kommer överens ska tvisten avgöras av allmän domstol
              med Stockholms tingsrätt som första instans.
            </p>

            <h2>15. Versioner och ikraftträdande</h2>
            <p className="tabular-nums">
              Denna version: <strong>{VERSION}</strong>, ikraftträdande{" "}
              <strong>{EFFECTIVE_DATE}</strong>. Tidigare versioner finns på begäran via{" "}
              <a href="mailto:legal@bokfy.se" className="text-[#3b82f6] no-underline hover:underline">
                legal@bokfy.se
              </a>
              .
            </p>

            <div className="mt-12 p-5 rounded-2xl bg-slate-50 border border-slate-200 not-prose">
              <p className="text-sm text-slate-600 leading-relaxed">
                <strong className="text-[#0F1B2D]">Frågor?</strong> Kontakta oss på{" "}
                <a href="mailto:legal@bokfy.se" className="text-[#3b82f6] hover:underline">
                  legal@bokfy.se
                </a>{" "}
                eller läs vår{" "}
                <a href="/legal/privacy" className="text-[#3b82f6] hover:underline">
                  integritetspolicy
                </a>{" "}
                och{" "}
                <a href="/legal/dpa" className="text-[#3b82f6] hover:underline">
                  DPA
                </a>
                .
              </p>
            </div>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CustomerAgreement;
