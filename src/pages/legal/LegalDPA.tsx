import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect } from "react";

const VERSION = "v2025-01";
const EFFECTIVE_DATE = "2025-01-15";

const LegalDPA = () => {
  useEffect(() => {
    document.title = `Personuppgiftsbiträdesavtal (DPA) ${VERSION} – Bokfy`;
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#0f1f35]">

      <Header lightBg />

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
          <div className="mb-10 pb-6 border-b border-slate-200">
            <p className="text-sm text-[#3b82f6] font-semibold tabular-nums mb-2">
              {VERSION} · Gäller från {EFFECTIVE_DATE}
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-[#0f1f35] mb-3">
              Personuppgiftsbiträdesavtal (DPA)
            </h1>
            <p className="text-base text-slate-600">
              Detta avtal reglerar Bokfy:s behandling av personuppgifter för Kundens räkning
              enligt GDPR artikel 28. Avtalet utgör en integrerad del av kundavtalet.
            </p>
          </div>

          <article className="prose prose-slate max-w-none prose-headings:text-[#0f1f35] prose-h2:text-2xl prose-h2:font-semibold prose-h2:mt-10 prose-h2:mb-3 prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-2 prose-p:text-slate-700 prose-p:leading-relaxed prose-li:text-slate-700 prose-strong:text-[#0f1f35]">
            <h2>1. Roller</h2>
            <p>
              <strong>Kunden</strong> är personuppgiftsansvarig för de uppgifter som behandlas
              i Tjänsten. <strong>Bokfy</strong> är personuppgiftsbiträde och behandlar
              uppgifterna endast enligt Kundens dokumenterade instruktioner.
            </p>

            <h2>2. Föremål, varaktighet och syfte</h2>
            <ul>
              <li><strong>Föremål:</strong> tillhandahållande av Bokfy:s plattform för bokföring, fakturering, lön, AI-analys och tillhörande tjänster.</li>
              <li><strong>Varaktighet:</strong> under kundavtalets löptid samt 90 dagar efter dess upphörande för export och radering.</li>
              <li><strong>Syfte:</strong> fullgörande av kundavtalet.</li>
            </ul>

            <h2>3. Kategorier av registrerade och uppgifter</h2>
            <ul>
              <li><strong>Registrerade:</strong> Kundens anställda, kunder, leverantörer, kontaktpersoner.</li>
              <li><strong>Uppgifter:</strong> namn, kontaktuppgifter, personnummer (vid behov), bankuppgifter, lön, transaktionsdata, dokument bifogade verifikationer.</li>
            </ul>

            <h2>4. Bokfy:s skyldigheter</h2>
            <ul>
              <li>Behandla personuppgifter endast enligt Kundens instruktioner.</li>
              <li>Säkerställa att personal med tillgång till uppgifterna omfattas av sekretess.</li>
              <li>Vidta tekniska och organisatoriska åtgärder enligt artikel 32 GDPR.</li>
              <li>Bistå Kunden vid registrerades begäran om utövande av rättigheter.</li>
              <li>Anmäla personuppgiftsincidenter utan onödigt dröjsmål, senast inom 48 timmar.</li>
              <li>Vid avtalets upphörande radera eller återlämna uppgifterna enligt Kundens val.</li>
            </ul>

            <h2>5. Tekniska och organisatoriska åtgärder</h2>
            <ul>
              <li>Kryptering i transit (TLS 1.2+) och vila (AES-256).</li>
              <li>Multi-tenant-isolering via Row-Level Security (RLS) i databasen.</li>
              <li>Tvåfaktorsautentisering (MFA) för administratörsåtkomst.</li>
              <li>Regelbundna säkerhetsgranskningar och penetrationstester.</li>
              <li>Loggning, övervakning och anomali-detektion.</li>
              <li>Backuper med kryptering, geo-redundans inom EU.</li>
              <li>Behörighetsstyrning enligt principen om minsta nödvändiga åtkomst.</li>
            </ul>

            <h2>6. Underbiträden</h2>
            <p>
              Kunden ger generell förhandstillåtelse för Bokfy att anlita underbiträden
              enligt nedanstående lista. Tillkommande eller ersättande underbiträden meddelas
              med 30 dagars varsel; Kunden har då rätt att göra invändning.
            </p>

            <div className="not-prose overflow-x-auto mt-4 mb-6">
              <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-50">
                  <tr className="text-left text-[#0f1f35]">
                    <th className="px-4 py-2.5 font-semibold">Underbiträde</th>
                    <th className="px-4 py-2.5 font-semibold">Tjänst</th>
                    <th className="px-4 py-2.5 font-semibold">Plats</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  <tr className="border-t border-slate-200">
                    <td className="px-4 py-2.5">Supabase</td>
                    <td className="px-4 py-2.5">Databas, autentisering, lagring</td>
                    <td className="px-4 py-2.5">EU (Frankfurt)</td>
                  </tr>
                  <tr className="border-t border-slate-200 bg-slate-50/50">
                    <td className="px-4 py-2.5">Google Cloud (Vertex AI)</td>
                    <td className="px-4 py-2.5">AI-modeller (Gemini)</td>
                    <td className="px-4 py-2.5">EU</td>
                  </tr>
                  <tr className="border-t border-slate-200">
                    <td className="px-4 py-2.5">OpenAI (via EU-region)</td>
                    <td className="px-4 py-2.5">AI-modeller (GPT)</td>
                    <td className="px-4 py-2.5">EU / SCC</td>
                  </tr>
                  <tr className="border-t border-slate-200 bg-slate-50/50">
                    <td className="px-4 py-2.5">Resend</td>
                    <td className="px-4 py-2.5">Transaktionsmail</td>
                    <td className="px-4 py-2.5">EU</td>
                  </tr>
                  <tr className="border-t border-slate-200">
                    <td className="px-4 py-2.5">Enable Banking</td>
                    <td className="px-4 py-2.5">PSD2 bankintegration</td>
                    <td className="px-4 py-2.5">EU (Finland)</td>
                  </tr>
                  <tr className="border-t border-slate-200 bg-slate-50/50">
                    <td className="px-4 py-2.5">BankID (Finansiell ID-Teknik)</td>
                    <td className="px-4 py-2.5">eID och signering</td>
                    <td className="px-4 py-2.5">Sverige</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2>7. Överföring till tredje land</h2>
            <p>
              Personuppgifter behandlas i första hand inom EU/EES. Vid eventuell överföring
              utanför EU/EES tillämpas EU-kommissionens standardavtalsklausuler (SCC) samt
              kompletterande tekniska skyddsåtgärder enligt EDPB:s rekommendationer.
            </p>

            <h2>8. Granskningsrätt</h2>
            <p>
              Bokfy tillhandahåller på Kundens begäran den information som behövs för att
              visa efterlevnad. Kunden har rätt att en gång per år utföra revision, vilken
              normalt sker via ifyllda säkerhetsfrågeformulär (SOC 2-rapport eller motsvarande)
              för att minimera störning i driften.
            </p>

            <h2>9. Ansvar</h2>
            <p>
              Ansvarsbegränsningen i kundavtalets punkt 10 gäller även för detta DPA, dock
              med undantag för bötesbelopp som ålagts en part direkt av tillsynsmyndighet på
              grund av motpartens brott mot GDPR.
            </p>

            <h2>10. Versioner</h2>
            <p className="tabular-nums">
              Denna version: <strong>{VERSION}</strong>, ikraftträdande{" "}
              <strong>{EFFECTIVE_DATE}</strong>. Frågor:{" "}
              <a href="mailto:dpo@bokfy.se" className="text-[#3b82f6] no-underline hover:underline">
                dpo@bokfy.se
              </a>
              .
            </p>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LegalDPA;
