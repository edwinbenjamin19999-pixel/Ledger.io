import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => { const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Integritetspolicy</CardTitle>
            <p className="text-sm text-muted-foreground">
              Senast uppdaterad: 2026-03-18
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <h2>1. Introduktion</h2>
            <p>
              Bokfy AB, org.nr 559196-8208 ("vi", "oss", "vår") respekterar din integritet och är 
              engagerade i att skydda dina personuppgifter. Denna integritetspolicy förklarar hur vi 
              samlar in, använder, lagrar och skyddar din information i enlighet med EU:s allmänna 
              dataskyddsförordning (GDPR) och svensk dataskyddslagstiftning.
            </p>

            <h2>2. Personuppgiftsansvarig</h2>
            <p>
              Bokfy AB är personuppgiftsansvarig för behandlingen av dina personuppgifter.
            </p>
            <p>
              <strong>Kontaktuppgifter:</strong><br />
              Bokfy AB<br />
              Org.nr: 559196-8208<br />
              Karl Viedegangs gata 15, Stockholms innerstad<br />
              E-post: privacy@bokfy.se
            </p>

            <h2>3. Vilka personuppgifter samlar vi in?</h2>
            <h3>3.1 Uppgifter du ger oss direkt:</h3>
            <ul>
              <li><strong>Kontoinformation:</strong> Namn, e-postadress, telefonnummer</li>
              <li><strong>Företagsinformation:</strong> Företagsnamn, organisationsnummer, adress</li>
              <li><strong>Ekonomiska uppgifter:</strong> Bokföringsdata, fakturor, kvitton, transaktioner</li>
              <li><strong>Anställningsuppgifter:</strong> Personnummer (krypterat), löneinformation, skatteinformation</li>
            </ul>

            <h3>3.2 Uppgifter vi samlar in automatiskt:</h3>
            <ul>
              <li><strong>Teknisk information:</strong> IP-adress, webbläsartyp, enhetsinformation</li>
              <li><strong>Användningsdata:</strong> Sidvisningar, klick, tid på sidan</li>
              <li><strong>Cookies:</strong> Se avsnitt 10 för detaljer</li>
            </ul>

            <h3>3.3 Uppgifter från tredjeparter:</h3>
            <ul>
              <li><strong>Banktransaktioner:</strong> Via Open Banking (Enable Banking) med ditt uttryckliga samtycke</li>
              <li><strong>Företagsinformation:</strong> Från Bolagsverket vid registrering</li>
              <li><strong>BankID-verifiering:</strong> Verifieringsresultat vid KYC-kontroll</li>
            </ul>

            <h2>4. Ändamål och rättslig grund</h2>
            <table className="w-full border-collapse border">
              <thead>
                <tr className="bg-muted">
                  <th className="border p-2 text-left">Ändamål</th>
                  <th className="border p-2 text-left">Uppgifter</th>
                  <th className="border p-2 text-left">Rättslig grund</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-2">Tillhandahålla bokföringstjänsten</td>
                  <td className="border p-2">Bokföringsdata, kvitton, transaktioner</td>
                  <td className="border p-2">Fullgörande av avtal (Art. 6.1.b)</td>
                </tr>
                <tr>
                  <td className="border p-2">AI-analys av dokument och transaktioner</td>
                  <td className="border p-2">Kvitton, fakturor, bankdata</td>
                  <td className="border p-2">Fullgörande av avtal (Art. 6.1.b)</td>
                </tr>
                <tr>
                  <td className="border p-2">Lagstadgad bokföring och skatterapportering</td>
                  <td className="border p-2">All ekonomisk data</td>
                  <td className="border p-2">Rättslig förpliktelse (Art. 6.1.c) — Bokföringslagen</td>
                </tr>
                <tr>
                  <td className="border p-2">Kundservice och support</td>
                  <td className="border p-2">Kontaktuppgifter, ärenden</td>
                  <td className="border p-2">Fullgörande av avtal (Art. 6.1.b)</td>
                </tr>
                <tr>
                  <td className="border p-2">Förbättra tjänsten och AI-modeller</td>
                  <td className="border p-2">Anonymiserad användningsdata</td>
                  <td className="border p-2">Berättigat intresse (Art. 6.1.f)</td>
                </tr>
                <tr>
                  <td className="border p-2">KYC/AML-kontroll</td>
                  <td className="border p-2">BankID, personuppgifter</td>
                  <td className="border p-2">Rättslig förpliktelse (Art. 6.1.c)</td>
                </tr>
                <tr>
                  <td className="border p-2">Marknadsföring och nyhetsbrev</td>
                  <td className="border p-2">E-post, namn</td>
                  <td className="border p-2">Samtycke (Art. 6.1.a)</td>
                </tr>
              </tbody>
            </table>

            <h2>5. Datadelning och mottagare</h2>
            <p>Vi delar dina personuppgifter med följande kategorier av mottagare, och endast i den utsträckning som krävs:</p>
            
            <h3>5.1 API-partners</h3>
            <ul>
              <li><strong>Skatteverket:</strong> AGI-rapportering och momsdeklarationer (rättslig förpliktelse)</li>
              <li><strong>Bolagsverket:</strong> Årsredovisningsinlämning</li>
              <li><strong>Enable Banking:</strong> Open Banking-transaktionshämtning (med ditt samtycke)</li>
              <li><strong>Stripe:</strong> Betalningshantering för prenumerationer</li>
            </ul>

            <h3>5.2 Underleverantörer</h3>
            <ul>
              <li><strong>Supabase (EU):</strong> Hosting, databas och autentisering</li>
              <li><strong>AI-tjänster (Google/OpenAI):</strong> Dokumentanalys och klassificering — data behandlas men lagras inte</li>
              <li><strong>Resend:</strong> Transaktionell e-post</li>
            </ul>

            <h3>5.3 På din begäran</h3>
            <ul>
              <li><strong>Revisorer:</strong> När du aktivt delar åtkomst via plattformen</li>
              <li><strong>Andra användare:</strong> Baserat på rollbehörigheter du konfigurerar</li>
            </ul>

            <h2>6. Internationell dataöverföring</h2>
            <p>
              Huvuddelen av din data lagras inom EU/EES (Supabase EU-region). Vissa AI-bearbetningar 
              kan ske via tjänster med servrar utanför EU. Vi säkerställer att överföringar sker 
              i enlighet med GDPR genom:
            </p>
            <ul>
              <li>EU:s standardavtalsklausuler (SCC)</li>
              <li>Adekvat skyddsnivå enligt EU-kommissionens beslut</li>
              <li>Lämpliga tekniska och organisatoriska säkerhetsåtgärder</li>
              <li>Minimering av överförd data — inga personuppgifter skickas till AI-tjänster utöver dokumentinnehåll</li>
            </ul>

            <h2>7. Lagringstid</h2>
            <p>Vi lagrar dina personuppgifter enligt följande:</p>
            <table className="w-full border-collapse border">
              <thead>
                <tr className="bg-muted">
                  <th className="border p-2 text-left">Uppgiftstyp</th>
                  <th className="border p-2 text-left">Lagringstid</th>
                  <th className="border p-2 text-left">Grund</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-2">Bokföringsmaterial (verifikat, fakturor, kvitton)</td>
                  <td className="border p-2">7 år efter räkenskapsårets slut</td>
                  <td className="border p-2">Bokföringslagen (BFL 7 kap. 2§)</td>
                </tr>
                <tr>
                  <td className="border p-2">Anställningsuppgifter & lönedata</td>
                  <td className="border p-2">7 år efter anställningens slut</td>
                  <td className="border p-2">Skattelagstiftning</td>
                </tr>
                <tr>
                  <td className="border p-2">Kontoinformation</td>
                  <td className="border p-2">Under avtalstiden + 3 månader</td>
                  <td className="border p-2">Avtal</td>
                </tr>
                <tr>
                  <td className="border p-2">KYC/AML-data</td>
                  <td className="border p-2">5 år efter affärsrelationens slut</td>
                  <td className="border p-2">Penningtvättslagen</td>
                </tr>
                <tr>
                  <td className="border p-2">Auditloggar</td>
                  <td className="border p-2">2 år</td>
                  <td className="border p-2">Berättigat intresse</td>
                </tr>
                <tr>
                  <td className="border p-2">Marknadsföringsdata</td>
                  <td className="border p-2">Tills du återkallar samtycket</td>
                  <td className="border p-2">Samtycke</td>
                </tr>
              </tbody>
            </table>

            <h2>8. Dina rättigheter enligt GDPR</h2>
            <p>Du har följande rättigheter avseende dina personuppgifter:</p>
            <ul>
              <li><strong>Rätt till tillgång (Art. 15):</strong> Begär en kopia av alla personuppgifter vi behandlar om dig</li>
              <li><strong>Rätt till rättelse (Art. 16):</strong> Korrigera felaktig eller ofullständig information</li>
              <li><strong>Rätt till radering (Art. 17):</strong> Be om att få din data raderad (med undantag för data som måste sparas enligt lag, t.ex. bokföringsmaterial i 7 år)</li>
              <li><strong>Rätt till begränsning (Art. 18):</strong> Begränsa behandlingen av din data</li>
              <li><strong>Rätt till dataportabilitet (Art. 20):</strong> Exportera din data i maskinläsbart format (JSON/CSV)</li>
              <li><strong>Rätt att göra invändningar (Art. 21):</strong> Invända mot behandling baserad på berättigat intresse</li>
              <li><strong>Rätt att återkalla samtycke (Art. 7.3):</strong> När som helst återkalla samtycke för marknadsföring eller AI-analys</li>
            </ul>
            <p>
              <strong>Så utövar du dina rättigheter:</strong> Gå till{" "}
              <a href="/gdpr" className="text-primary hover:underline">GDPR-inställningar</a> i din profil 
              för dataexport, radering och samtyckshantering. Du kan också kontakta oss direkt 
              på privacy@bokfy.se. Vi svarar inom 30 dagar.
            </p>

            <h2>9. Säkerhetsåtgärder</h2>
            <p>Vi skyddar dina personuppgifter genom:</p>
            <ul>
              <li>Kryptering av data i transit (TLS 1.3) och i vila (AES-256)</li>
              <li>BankID-verifiering vid registrering (KYC)</li>
              <li>Rollbaserad åtkomstkontroll (RBAC) med modulbehörigheter</li>
              <li>Kryptering av känsliga personuppgifter (personnummer, bankkontonummer)</li>
              <li>Automatiserad åtkomstloggning via audit_events</li>
              <li>Row Level Security (RLS) — varje företag ser bara sin egen data</li>
              <li>Regelbundna säkerhetsrevisioner och penetrationstester</li>
            </ul>

            <h2>10. Cookies</h2>
            <p>
              Vi använder cookies för att förbättra din upplevelse. Du kan hantera dina 
              cookie-inställningar via cookie-bannern som visas vid första besöket, eller via{" "}
              <a href="/gdpr" className="text-primary hover:underline">GDPR-inställningar</a>.
            </p>
            <table className="w-full border-collapse border">
              <thead>
                <tr className="bg-muted">
                  <th className="border p-2 text-left">Typ</th>
                  <th className="border p-2 text-left">Syfte</th>
                  <th className="border p-2 text-left">Grund</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-2">Nödvändiga</td>
                  <td className="border p-2">Autentisering, sessionshantering</td>
                  <td className="border p-2">Berättigat intresse</td>
                </tr>
                <tr>
                  <td className="border p-2">Funktionella</td>
                  <td className="border p-2">Språk, cookie-preferenser</td>
                  <td className="border p-2">Samtycke</td>
                </tr>
                <tr>
                  <td className="border p-2">Analytiska</td>
                  <td className="border p-2">Förbättra tjänsten</td>
                  <td className="border p-2">Samtycke</td>
                </tr>
              </tbody>
            </table>

            <h2>11. AI-behandling</h2>
            <p>
              Bokfy använder artificiell intelligens för att automatisera bokföring. Detta innebär att:
            </p>
            <ul>
              <li>Kvitton och fakturor analyseras av AI för att extrahera belopp, datum och kontoinformation</li>
              <li>Banktransaktioner klassificeras automatiskt med AI-förslag</li>
              <li>Alla AI-förslag kräver mänsklig granskning innan de bokförs</li>
              <li>AI-modeller tränas på anonymiserad och aggregerad data — inte på individuella kunders data</li>
              <li>Du kan när som helst välja bort AI-analys via inställningarna</li>
            </ul>

            <h2>12. Barn</h2>
            <p>
              Vår tjänst är en affärstjänst och är inte avsedd för personer under 18 år. 
              Vi samlar inte medvetet in personuppgifter från barn.
            </p>

            <h2>13. Ändringar av integritetspolicyn</h2>
            <p>
              Vi kan uppdatera denna integritetspolicy. Väsentliga ändringar meddelas via 
              e-post minst 30 dagar i förväg. Den senaste versionen finns alltid tillgänglig 
              på denna sida.
            </p>

            <h2>14. Klagomål till tillsynsmyndighet</h2>
            <p>
              Du har rätt att lämna in ett klagomål till Integritetsskyddsmyndigheten (IMY) 
              om du anser att vi behandlar dina personuppgifter på ett felaktigt sätt.
            </p>
            <p>
              <strong>Integritetsskyddsmyndigheten:</strong><br />
              Box 8114<br />
              104 20 Stockholm<br />
              E-post: imy@imy.se<br />
              Telefon: 08-657 61 00
            </p>

            <h2>15. Kontakt</h2>
            <p>
              Har du frågor om denna integritetspolicy eller hur vi behandlar dina 
              personuppgifter? Kontakta oss:
            </p>
            <p>
              Bokfy AB<br />
              E-post: privacy@bokfy.se<br />
              Karl Viedegangs gata 15, Stockholms innerstad
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;