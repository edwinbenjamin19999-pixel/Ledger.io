import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Privacy = () => { const navigate = useNavigate();

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
              Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <h2>1. Personuppgiftsansvarig</h2>
            <p>
              RE Equity Partners AB, org.nr 559164-8208 ("NorthLedger", "vi", "oss"), är 
              personuppgiftsansvarig för behandlingen av dina personuppgifter i enlighet 
              med EU:s allmänna dataskyddsförordning (GDPR) och svensk dataskyddslagstiftning.
            </p>
            <p>
              <strong>Kontaktuppgifter:</strong><br />
              RE Equity Partners AB<br />
              Org.nr: 559164-8208<br />
              Karlsviksgatan 15, Stockholm, Sverige<br />
              E-post: info@northledger.se
            </p>

            <h2>2. Vilka personuppgifter samlar vi in?</h2>
            <h3>2.1 Uppgifter du lämnar till oss</h3>
            <ul>
              <li><strong>Kontoinformation:</strong> Namn, e-postadress</li>
              <li><strong>Företagsuppgifter:</strong> Organisationsnummer, företagsnamn, adress</li>
              <li><strong>Ekonomiska uppgifter:</strong> Bokföringsdata, fakturor, kvitton, verifikat</li>
              <li><strong>Anställningsuppgifter:</strong> Personnummer (krypterat), löneinformation</li>
            </ul>

            <h3>2.2 Uppgifter vi samlar in automatiskt</h3>
            <ul>
              <li><strong>Teknisk data:</strong> IP-adress, webbläsartyp, enhetsinformation</li>
              <li><strong>Användningsdata:</strong> Sidvisningar, funktioner som används</li>
            </ul>

            <h3>2.3 Uppgifter från tredjeparter</h3>
            <ul>
              <li><strong>Banktransaktioner:</strong> Via Open Banking (Enable Banking) efter ditt samtycke</li>
              <li><strong>Företagsinformation:</strong> Från Bolagsverket vid registrering</li>
            </ul>

            <h2>3. Ändamål och rättslig grund</h2>
            <table className="w-full border-collapse border">
              <thead>
                <tr className="bg-muted">
                  <th className="border p-2 text-left">Ändamål</th>
                  <th className="border p-2 text-left">Rättslig grund (GDPR)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-2">Tillhandahålla bokföringstjänsten</td>
                  <td className="border p-2">Fullgörande av avtal (Art. 6.1.b)</td>
                </tr>
                <tr>
                  <td className="border p-2">AI-analys av kvitton och transaktioner</td>
                  <td className="border p-2">Fullgörande av avtal (Art. 6.1.b)</td>
                </tr>
                <tr>
                  <td className="border p-2">Kundservice och support</td>
                  <td className="border p-2">Fullgörande av avtal (Art. 6.1.b)</td>
                </tr>
                <tr>
                  <td className="border p-2">Lagstadgad bokföring och skatterapportering</td>
                  <td className="border p-2">Rättslig förpliktelse (Art. 6.1.c)</td>
                </tr>
                <tr>
                  <td className="border p-2">Förbättra tjänsten</td>
                  <td className="border p-2">Berättigat intresse (Art. 6.1.f)</td>
                </tr>
                <tr>
                  <td className="border p-2">Marknadsföring</td>
                  <td className="border p-2">Samtycke (Art. 6.1.a)</td>
                </tr>
              </tbody>
            </table>

            <h2>4. Tredjepartsleverantörer (personuppgiftsbiträden)</h2>
            <p>Vi delar dina uppgifter med följande kategorier av mottagare, och enbart i den utsträckning som krävs:</p>
            <table className="w-full border-collapse border">
              <thead>
                <tr className="bg-muted">
                  <th className="border p-2 text-left">Leverantör</th>
                  <th className="border p-2 text-left">Syfte</th>
                  <th className="border p-2 text-left">Plats</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-2">Supabase</td>
                  <td className="border p-2">Hosting, databas, autentisering</td>
                  <td className="border p-2">EU</td>
                </tr>
                <tr>
                  <td className="border p-2">Enable Banking</td>
                  <td className="border p-2">Open Banking — banktransaktioner</td>
                  <td className="border p-2">EU (Finland)</td>
                </tr>
                <tr>
                  <td className="border p-2">Stripe</td>
                  <td className="border p-2">Betalningshantering, prenumerationer</td>
                  <td className="border p-2">EU/USA (SCC)</td>
                </tr>
                <tr>
                  <td className="border p-2">Resend</td>
                  <td className="border p-2">Transaktionell e-post</td>
                  <td className="border p-2">USA (SCC)</td>
                </tr>
              </tbody>
            </table>
            <p className="text-sm text-muted-foreground mt-2">
              Överföringar utanför EU/EES skyddas genom EU:s standardavtalsklausuler (SCC) 
              och lämpliga tekniska säkerhetsåtgärder.
            </p>

            <h2>5. Lagringstid</h2>
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
                  <td className="border p-2">Anställningsuppgifter och lönedata</td>
                  <td className="border p-2">7 år efter anställningens slut</td>
                  <td className="border p-2">Skattelagstiftning</td>
                </tr>
                <tr>
                  <td className="border p-2">Kontoinformation</td>
                  <td className="border p-2">Under avtalstiden + 3 månader</td>
                  <td className="border p-2">Avtal</td>
                </tr>
                <tr>
                  <td className="border p-2">Marknadsföringsdata</td>
                  <td className="border p-2">Tills samtycket återkallas</td>
                  <td className="border p-2">Samtycke</td>
                </tr>
              </tbody>
            </table>

            <h2>6. Dina rättigheter enligt GDPR</h2>
            <p>Du har följande rättigheter avseende dina personuppgifter:</p>
            <ul>
              <li><strong>Rätt till tillgång (Art. 15):</strong> Begär en kopia av alla personuppgifter vi behandlar</li>
              <li><strong>Rätt till rättelse (Art. 16):</strong> Korrigera felaktig eller ofullständig information</li>
              <li><strong>Rätt till radering (Art. 17):</strong> Be om att få din data raderad (undantag: bokföringsmaterial som måste sparas i 7 år)</li>
              <li><strong>Rätt till dataportabilitet (Art. 20):</strong> Exportera din data i maskinläsbart format (JSON/CSV)</li>
              <li><strong>Rätt att göra invändningar (Art. 21):</strong> Invända mot behandling baserad på berättigat intresse</li>
              <li><strong>Rätt att återkalla samtycke (Art. 7.3):</strong> När behandlingen baseras på samtycke</li>
            </ul>
            <p>
              Utöva dina rättigheter via <a href="/gdpr" className="text-primary hover:underline">GDPR-inställningar</a> i 
              din profil eller kontakta oss på info@northledger.se. Vi svarar inom 30 dagar.
            </p>

            <h2>7. Cookies</h2>
            <p>
              Vi använder nödvändiga cookies för autentisering och sessionshantering (berättigat intresse), 
              samt valfria analytiska cookies (samtycke). Du kan hantera dina cookie-inställningar via 
              cookie-bannern som visas vid första besöket.
            </p>

            <h2>8. Säkerhetsåtgärder</h2>
            <ul>
              <li>Kryptering av data i transit (TLS 1.3) och i vila (AES-256)</li>
              <li>Rollbaserad åtkomstkontroll (RBAC)</li>
              <li>Kryptering av känsliga personuppgifter (personnummer, bankkontonummer)</li>
              <li>Row Level Security — varje företag ser bara sin egen data</li>
              <li>Automatiserad åtkomstloggning</li>
            </ul>

            <h2>9. Klagomål</h2>
            <p>
              Du har rätt att lämna in ett klagomål till Integritetsskyddsmyndigheten (IMY) 
              om du anser att vi behandlar dina personuppgifter felaktigt.
            </p>
            <p>
              <strong>Integritetsskyddsmyndigheten:</strong><br />
              Box 8114, 104 20 Stockholm<br />
              E-post: imy@imy.se · Telefon: 08-657 61 00
            </p>

            <h2>10. Kontakt</h2>
            <p>
              Frågor om denna policy? Kontakta oss:<br />
              RE Equity Partners AB<br />
              Karlsviksgatan 15, Stockholm<br />
              E-post: info@northledger.se
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Privacy;