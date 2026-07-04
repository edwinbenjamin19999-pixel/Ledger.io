import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect } from "react";

const VERSION = "v2025-01";
const EFFECTIVE_DATE = "2025-01-15";

const LegalPrivacy = () => {
  useEffect(() => {
    document.title = `Integritetspolicy ${VERSION} – Cogniq`;
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#0F172A]">

      <Header lightBg />

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
          <div className="mb-10 pb-6 border-b border-slate-200">
            <p className="text-sm text-[#3b82f6] font-semibold tabular-nums mb-2">
              {VERSION} · Gäller från {EFFECTIVE_DATE}
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-[#0F172A] mb-3">
              Integritetspolicy
            </h1>
            <p className="text-base text-slate-600">
              Denna policy beskriver hur Cogniq AB behandlar personuppgifter i egenskap av
              personuppgiftsansvarig — främst för kontaktpersoner hos våra B2B-kunder, besökare
              på vår webbplats och prospects.
            </p>
          </div>

          <article className="prose prose-slate max-w-none prose-headings:text-[#0F172A] prose-h2:text-2xl prose-h2:font-semibold prose-h2:mt-10 prose-h2:mb-3 prose-p:text-slate-700 prose-p:leading-relaxed prose-li:text-slate-700 prose-strong:text-[#0F172A]">
            <h2>1. Personuppgiftsansvarig</h2>
            <p>
              Cogniq AB, org.nr [556xxx-xxxx], med säte i Stockholm. Kontakt:{" "}
              <a href="mailto:dpo@cogniq.se" className="text-[#3b82f6] no-underline hover:underline">
                dpo@cogniq.se
              </a>
              .
            </p>

            <h2>2. Vilka uppgifter vi samlar in</h2>
            <ul>
              <li><strong>Kontaktuppgifter:</strong> namn, e-post, telefon, befattning, företag.</li>
              <li><strong>Identifieringsuppgifter:</strong> personnummer vid BankID-signering och KYC.</li>
              <li><strong>Faktura- och betalningsuppgifter:</strong> organisationsnummer, fakturaadress, transaktionshistorik.</li>
              <li><strong>Tekniska uppgifter:</strong> IP-adress, enhetsinformation, loggar, cookies (se separat cookiepolicy).</li>
              <li><strong>Bokföringsdata:</strong> behandlas separat under{" "}
                <a href="/legal/dpa" className="text-[#3b82f6] no-underline hover:underline">DPA</a>
                {" "}— Cogniq är då personuppgiftsbiträde, inte ansvarig.
              </li>
            </ul>

            <h2>3. Ändamål och rättslig grund</h2>
            <ul>
              <li><strong>Tillhandahålla Tjänsten</strong> — fullgörande av avtal (art. 6.1.b).</li>
              <li><strong>Fakturering och bokföring</strong> — rättslig förpliktelse (art. 6.1.c, BFL 1999:1078).</li>
              <li><strong>KYC enligt penningtvättslagen</strong> — rättslig förpliktelse (art. 6.1.c, PTL 2017:630).</li>
              <li><strong>Säkerhet, bedrägeribekämpning</strong> — berättigat intresse (art. 6.1.f).</li>
              <li><strong>Marknadsföring till befintliga kunder</strong> — berättigat intresse (art. 6.1.f); möjlighet att avregistrera finns alltid.</li>
            </ul>

            <h2>4. Lagringstider</h2>
            <ul>
              <li>Bokföringsmaterial och underlag: <strong>7 år</strong> enligt bokföringslagen.</li>
              <li>KYC-dokumentation: <strong>5 år</strong> efter avslutad affärsförbindelse enligt PTL.</li>
              <li>Kontaktuppgifter för aktiva kunder: under avtalstiden + 24 månader.</li>
              <li>Loggar och tekniska data: 12 månader, därefter anonymisering.</li>
            </ul>

            <h2>5. Mottagare</h2>
            <p>
              Personuppgifter delas med våra underleverantörer (drift, AI, e-post — se{" "}
              <a href="/legal/dpa" className="text-[#3b82f6] no-underline hover:underline">DPA</a>
              ), myndigheter när lag kräver det (Skatteverket, Bolagsverket,
              Finansinspektionen) samt revisorer och rådgivare under sekretessavtal.
              All behandling sker inom EU/EES.
            </p>

            <h2>6. Dina rättigheter</h2>
            <ul>
              <li>Rätt till tillgång (registerutdrag).</li>
              <li>Rätt till rättelse av felaktiga uppgifter.</li>
              <li>Rätt till radering (i den mån lag inte kräver fortsatt lagring).</li>
              <li>Rätt till begränsning och dataportabilitet.</li>
              <li>Rätt att invända mot behandling baserad på berättigat intresse.</li>
              <li>Rätt att inge klagomål till Integritetsskyddsmyndigheten (IMY).</li>
            </ul>

            <h2>7. Kontakt</h2>
            <p>
              För frågor om personuppgiftsbehandling eller för att utöva dina rättigheter,
              kontakta vårt dataskyddsombud på{" "}
              <a href="mailto:dpo@cogniq.se" className="text-[#3b82f6] no-underline hover:underline">
                dpo@cogniq.se
              </a>
              .
            </p>

            <h2>8. Versioner</h2>
            <p className="tabular-nums">
              Denna version: <strong>{VERSION}</strong>, ikraftträdande{" "}
              <strong>{EFFECTIVE_DATE}</strong>.
            </p>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LegalPrivacy;
