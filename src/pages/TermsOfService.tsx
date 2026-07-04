import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TermsOfService = () => { const navigate = useNavigate();

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
            <CardTitle className="text-3xl">Användarvillkor</CardTitle>
            <p className="text-sm text-muted-foreground">
              Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <h2>1. Allmänt</h2>
            <p>
              Dessa användarvillkor ("Villkoren") reglerar din användning av Cogniq:s 
              plattform för automatiserad bokföring och redovisning ("Tjänsten"). 
              Genom att använda Tjänsten godkänner du dessa Villkor i sin helhet.
            </p>

            <h2>2. Definitioner</h2>
            <ul>
              <li><strong>"Tjänsten"</strong> - Cogniq:s plattform och alla relaterade funktioner</li>
              <li><strong>"Användare"</strong> - Du som använder Tjänsten</li>
              <li><strong>"Konto"</strong> - Ditt användarkonto hos Cogniq</li>
              <li><strong>"Innehåll"</strong> - All data och information du laddar upp</li>
              <li><strong>"Vi", "Oss", "Vår"</strong> - Cogniq AB</li>
            </ul>

            <h2>3. Kontoregistrering</h2>
            <p>För att använda Tjänsten måste du:</p>
            <ul>
              <li>Vara minst 18 år gammal</li>
              <li>Vara behörig att ingå bindande avtal</li>
              <li>Tillhandahålla korrekt och fullständig information</li>
              <li>Uppdatera din information när den ändras</li>
              <li>Hålla dina inloggningsuppgifter säkra och konfidentiella</li>
            </ul>
            <p>
              Du ansvarar för all aktivitet som sker under ditt konto. Vid misstänkt 
              obehörig användning ska du omedelbart meddela oss.
            </p>

            <h2>4. Tjänstens omfattning</h2>
            <p>Cogniq tillhandahåller:</p>
            <ul>
              <li>Automatiserad bokföring med AI-stöd</li>
              <li>Fakturering och faktura hantering</li>
              <li>Integration med banker och Skatteverket</li>
              <li>Rapportering och analys</li>
              <li>Lönehantering och AGI-rapportering</li>
              <li>Momsrapportering</li>
            </ul>
            <p>
              Tjänsten är inte avsedd att ersätta professionell redovisningsrådgivning. 
              Du ansvarar för att säkerställa att din bokföring följer gällande lagar 
              och regelverk.
            </p>

            <h2>5. Användaransvar</h2>
            <h3>5.1 Tillåten användning</h3>
            <p>Du får använda Tjänsten för:</p>
            <ul>
              <li>Legitim bokföring och redovisning för ditt/dina företag</li>
              <li>Lagring och bearbetning av ekonomisk data</li>
              <li>Integration med auktoriserade tredjepartstjänster</li>
            </ul>

            <h3>5.2 Förbjuden användning</h3>
            <p>Du får INTE:</p>
            <ul>
              <li>Använda Tjänsten för olagliga ändamål</li>
              <li>Försöka få obehörig åtkomst till systemet</li>
              <li>Använda bots eller automatiserade verktyg utan tillåtelse</li>
              <li>Överföra skadlig kod, virus eller malware</li>
              <li>Störa eller avbryta Tjänstens funktion</li>
              <li>Kopiera, modifiera eller distribuera Tjänsten</li>
              <li>Använda Tjänsten för att trakassera eller skada andra</li>
              <li>Kringgå säkerhetsåtgärder</li>
            </ul>

            <h2>6. Betalning och prenumeration</h2>
            <h3>6.1 Priser och avgifter</h3>
            <p>
              Priser för Tjänsten anges på vår webbplats. Alla priser är exklusive moms 
              om inte annat anges. Vi förbehåller oss rätten att ändra priser med 30 dagars 
              varsel.
            </p>

            <h3>6.2 Prenumerationsavtal</h3>
            <p>
              Tjänsten tillhandahålls genom månatliga eller årliga prenumerationer. 
              Prenumerationen förnyas automatiskt om den inte sägs upp före 
              förnyelsedatumet.
            </p>

            <h3>6.3 Betalningsvillkor</h3>
            <ul>
              <li>Betalning sker i förskott via kreditkort eller faktura</li>
              <li>Vid utebliven betalning kan Tjänsten suspenderas</li>
              <li>Du ansvarar för alla transaktionsavgifter</li>
            </ul>

            <h3>6.4 Återbetalning</h3>
            <p>
              Vi erbjuder 30 dagars pengarna-tillbaka-garanti från det datum du tecknar 
              prenumerationen, under förutsättning att Tjänsten inte används i betydande 
              omfattning.
            </p>

            <h2>7. Immateriella rättigheter</h2>
            <p>
              Alla rättigheter till Tjänsten, inklusive programvara, design, text, 
              grafik och logotyper, ägs av Cogniq. Du får en begränsad, icke-exklusiv, 
              icke-överförbar licens att använda Tjänsten enligt dessa Villkor.
            </p>

            <h2>8. Ditt innehåll</h2>
            <h3>8.1 Äganderätt</h3>
            <p>
              Du behåller alla rättigheter till det innehåll du laddar upp till Tjänsten. 
              Genom att ladda upp innehåll ger du oss en licens att använda, lagra och 
              bearbeta det för att tillhandahålla Tjänsten.
            </p>

            <h3>8.2 Ansvar för innehåll</h3>
            <p>
              Du ansvarar för att ditt innehåll:
            </p>
            <ul>
              <li>Är korrekt och fullständigt</li>
              <li>Inte kränker tredje parts rättigheter</li>
              <li>Följer gällande lagar och regelverk</li>
              <li>Inte innehåller skadligt material</li>
            </ul>

            <h2>9. Dataskydd och integritet</h2>
            <p>
              Vi behandlar dina personuppgifter i enlighet med GDPR och vår 
              <a href="/privacy-policy"> Integritetspolicy</a>. Genom att använda 
              Tjänsten samtycker du till denna behandling.
            </p>

            <h2>10. Säkerhet och tillgänglighet</h2>
            <h3>10.1 Säkerhetsåtgärder</h3>
            <p>
              Vi vidtar rimliga tekniska och organisatoriska åtgärder för att skydda 
              din data. Detta inkluderar kryptering, brandväggar och regelbundna 
              säkerhetsrevisioner.
            </p>

            <h3>10.2 Tjänstetillgänglighet</h3>
            <p>
              Vi strävar efter 99,9% tillgänglighet men kan inte garantera oavbruten 
              åtkomst. Planerat underhåll meddelas i förväg.
            </p>

            <h2>11. Ansvarsbegränsning</h2>
            <h3>11.1 Garantifriskrivning</h3>
            <p>
              Tjänsten tillhandahålls "som den är" utan garantier av något slag. 
              Vi garanterar inte att:
            </p>
            <ul>
              <li>Tjänsten är felfri eller oavbruten</li>
              <li>Resultaten är korrekta eller tillförlitliga</li>
              <li>Alla fel kommer att korrigeras</li>
            </ul>

            <h3>11.2 Skadebegränsning</h3>
            <p>
              I den utsträckning lagen tillåter ansvarar vi inte för:
            </p>
            <ul>
              <li>Indirekta skador eller följdskador</li>
              <li>Förlust av vinst eller intäkter</li>
              <li>Dataförlust</li>
              <li>Skador över det belopp du betalat under de senaste 12 månaderna</li>
            </ul>

            <h2>12. Uppsägning</h2>
            <h3>12.1 Din rätt att säga upp</h3>
            <p>
              Du kan när som helst säga upp din prenumeration via dina kontoinställningar. 
              Uppsägningen träder i kraft vid slutet av innevarande fakturaperiod.
            </p>

            <h3>12.2 Vår rätt att säga upp</h3>
            <p>
              Vi kan säga upp eller suspendera ditt konto om du:
            </p>
            <ul>
              <li>Bryter mot dessa Villkor</li>
              <li>Inte betalar avgifter i tid</li>
              <li>Använder Tjänsten på ett skadligt sätt</li>
              <li>Begår bedrägeri eller annat brott</li>
            </ul>

            <h3>12.3 Effekt av uppsägning</h3>
            <p>
              Vid uppsägning:
            </p>
            <ul>
              <li>Upphör din åtkomst till Tjänsten</li>
              <li>Kan du exportera din data inom 30 dagar</li>
              <li>Raderas ditt innehåll efter 90 dagar (med undantag för bokföringsdata 
                  som måste bevaras enligt lag)</li>
            </ul>

            <h2>13. Force majeure</h2>
            <p>
              Vi ansvarar inte för dröjsmål eller utebliven prestation orsakad av 
              omständigheter utanför vår kontroll, inklusive men inte begränsat till 
              naturkatastrofer, krig, terrordåd, cyberattacker eller myndighetsbeslut.
            </p>

            <h2>14. Ändringar av villkoren</h2>
            <p>
              Vi förbehåller oss rätten att ändra dessa Villkor. Väsentliga ändringar 
              meddelas via e-post minst 30 dagar innan de träder i kraft. Fortsatt 
              användning efter ändringarna innebär att du accepterar de nya villkoren.
            </p>

            <h2>15. Tillämplig lag och tvister</h2>
            <p>
              Dessa Villkor ska tolkas och tillämpas i enlighet med svensk lag. 
              Tvister ska i första hand lösas genom förhandling. Om förhandling 
              misslyckas ska tvisten avgöras av svensk domstol med Stockholms tingsrätt 
              som första instans.
            </p>

            <h2>16. Övrigt</h2>
            <h3>16.1 Fullständigt avtal</h3>
            <p>
              Dessa Villkor utgör det fullständiga avtalet mellan dig och Cogniq 
              avseende användningen av Tjänsten.
            </p>

            <h3>16.2 Överlåtelse</h3>
            <p>
              Du får inte överlåta dina rättigheter eller skyldigheter enligt dessa 
              Villkor utan vårt skriftliga godkännande.
            </p>

            <h3>16.3 Sparbarhet</h3>
            <p>
              Om någon bestämmelse i dessa Villkor är ogiltig eller ogenomförbar, 
              påverkar det inte giltigheten av övriga bestämmelser.
            </p>

            <h2>17. Kontakt</h2>
            <p>
              Frågor om dessa Villkor kan ställas till:
            </p>
            <p>
              <strong>Cogniq AB</strong><br />
              E-post: legal@cogniq.se<br />
              Telefon: +46 76 164 69 86<br />
              Adress: Karlsviksgatan 15, Stockholm, Sverige
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfService;
