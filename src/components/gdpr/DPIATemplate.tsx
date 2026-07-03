import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { toast } from "sonner";

export const DPIATemplate = () => { const handleDownload = () => { const dpiaContent = `
# Dataskyddskonsekvensbedömning (DPIA)
# NorthLedger - Automatiserad Bokföringsplattform

## 1. Beskrivning av behandlingen

### 1.1 Ändamål
NorthLedger är en automatiserad bokföringsplattform som behandlar ekonomisk data och personuppgifter för att:
- Tillhandahålla bokförings- och redovisningstjänster
- Automatisera bokföring med AI-stöd
- Hantera löner och personaladministration
- Rapportera till Skatteverket (AGI, moms)
- Analysera ekonomisk data

### 1.2 Typ av personuppgifter
- **Identitetsuppgifter**: Namn, personnummer, kontaktuppgifter
- **Ekonomiska uppgifter**: Lön, skatteinformation, bankkonton
- **Anställningsuppgifter**: Anställningsform, arbetstid, ledig tid
- **Tekniska uppgifter**: IP-adress, cookies, användningsdata

### 1.3 Berörda kategorier
- Företagsägare och företagsledare
- Anställda i kundföretag
- Revisorer och externa rådgivare
- Kunder och leverantörer (via fakturor)

## 2. Nödvändighet och proportionalitet

### 2.1 Är behandlingen nödvändig?
Ja, behandlingen är nödvändig för att:
- Fullgöra avtalet med kunden (GDPR Art. 6.1.b)
- Uppfylla rättsliga förpliktelser enligt bokföringslagen (GDPR Art. 6.1.c)
- Tillhandahålla efterfrågade tjänster

### 2.2 Uppnås ändamålet med mindre ingripande medel?
Vi minimerar datainsamlingen genom att:
- Endast samla in nödvändig data
- Pseudonymisera data där möjligt
- Implementera dataportabilitet och raderingsmöjligheter
- Tillämpa strikt åtkomstkontroll

## 3. Risker för registrerades rättigheter

### 3.1 Identifierade risker

#### RISK 1: Obehörig åtkomst till känsliga personuppgifter
- **Sannolikhet**: Medel
- **Allvarlighetsgrad**: Hög
- **Konsekvens**: Identitetsstöld, ekonomisk skada, integritetsintrång

#### RISK 2: Dataförlust eller förstöring
- **Sannolikhet**: Låg
- **Allvarlighetsgrad**: Hög
- **Konsekvens**: Förlust av bokföringsdata, rättsliga konsekvenser

#### RISK 3: Felaktig AI-behandling av data
- **Sannolikhet**: Medel
- **Allvarlighetsgrad**: Medel
- **Konsekvens**: Felaktig bokföring, ekonomiska konsekvenser

#### RISK 4: Dataintrång eller cyberattack
- **Sannolikhet**: Medel
- **Allvarlighetsgrad**: Mycket hög
- **Konsekvens**: Massiv dataexponering, reputationsskada

## 4. Åtgärder för att hantera riskerna

### 4.1 Tekniska säkerhetsåtgärder
✓ End-to-end kryptering (TLS 1.3)
✓ Kryptering i vila (AES-256)
✓ Tvåfaktorsautentisering (2FA)
✓ Automatisk session timeout
✓ Regelbundna säkerhetsuppdateringar
✓ Brandväggar och intrångsdetektering
✓ DDoS-skydd
✓ Säker loggning och övervakning

### 4.2 Organisatoriska åtgärder
✓ Rollbaserad åtkomstkontroll (RBAC)
✓ Princip om minsta behörighet
✓ Regelbundna säkerhetsrevisioner
✓ Säkerhetspolicy och rutiner
✓ Personalutbildning i datasäkerhet
✓ Incidenthanteringsplan
✓ Krypterad backup med geografisk redundans
✓ Regelbunden penetrationstestning

### 4.3 AI-specifika åtgärder
✓ Mänsklig granskning av AI-beslut
✓ Möjlighet att välja bort AI-behandling
✓ Transparens i AI-processer
✓ Kontinuerlig övervakning av AI-noggrannhet
✓ AI-feedback och korrigeringssystem

### 4.4 GDPR-efterlevnad
✓ Samtyckehantering
✓ Dataportabilitet (export)
✓ Rätt till radering (med 30 dagars grace period)
✓ Rätt till rättelse
✓ Data retention policies (7 år för bokföring)
✓ Utökad audit logging
✓ Dataskyddsombud (vid behov)

## 5. Bedömning av återstående risk

### 5.1 Riskmatris efter åtgärder

| Risk | Initial | Efter åtgärder | Acceptabel? |
|------|---------|----------------|-------------|
| Obehörig åtkomst | Hög | Låg | Ja |
| Dataförlust | Hög | Mycket låg | Ja |
| Felaktig AI-behandling | Medel | Låg | Ja |
| Dataintrång | Mycket hög | Låg-Medel | Ja |

### 5.2 Sammanfattande bedömning
Med implementerade åtgärder bedöms de återstående riskerna som acceptabla. 
Kontinuerlig övervakning och regelbundna säkerhetsrevisioner säkerställer 
att skyddet upprätthålls.

## 6. Intressenternas syn

### 6.1 Registrerade (användare)
Konsulterade via:
- Användarundersökningar
- Feedback-formulär
- Direktkontakt med support

**Resultat**: Användare uppskattar säkerhetsfokus och GDPR-funktioner

### 6.2 Dataskyddsombud/Säkerhetsexpert
[Om tillämpligt: Konsultation med DSO/säkerhetsexpert]

## 7. Godkännande och uppföljning

### 7.1 Godkännande
Datum: ${new Date().toLocaleDateString('sv-SE')}
Godkänd av: [VD/Dataskyddsansvarig]

### 7.2 Uppföljning
Denna DPIA ska ses över:
- Årligen
- Vid väsentliga ändringar i systemet
- Vid nya hot eller sårbarheter
- Efter säkerhetsincidenter

### 7.3 Nästa översyn
Senast: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('sv-SE')}

## 8. Dokumenthistorik

| Datum | Version | Ändringar | Av |
|-------|---------|-----------|-----|
| ${new Date().toLocaleDateString('sv-SE')} | 1.0 | Initial version | System |

---

**Kontakt**
För frågor om denna DPIA:
E-post: privacy@northledger.se
Telefon: [Ditt telefonnummer]
`;

    const blob = new Blob([dpiaContent], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DPIA-NorthLedger-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.success("DPIA-mall nedladdad");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <CardTitle>Dataskyddskonsekvensbedömning (DPIA)</CardTitle>
        </div>
        <CardDescription>
          Mall för dataskyddskonsekvensbedömning enligt GDPR artikel 35
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm space-y-3">
          <p>
            En dataskyddskonsekvensbedömning (DPIA) är obligatorisk när behandlingen 
            innebär en hög risk för de registrerades rättigheter och friheter.
          </p>
          
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">DPIA-mallen innehåller:</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Beskrivning av behandlingsverksamheten</li>
              <li>Bedömning av nödvändighet och proportionalitet</li>
              <li>Identifierade risker och konsekvenser</li>
              <li>Säkerhetsåtgärder och riskhantering</li>
              <li>Riskmatris och bedömning</li>
              <li>Uppföljningsplan</li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            <strong>OBS:</strong> Denna mall är en utgångspunkt. Du bör anpassa den 
            till din specifika verksamhet och konsultera med juridisk expertis eller 
            dataskyddsombud vid behov.
          </p>
        </div>

        <Button onClick={handleDownload} className="w-full">
          <Download className="mr-2 h-4 w-4" />
          Ladda ner DPIA-mall
        </Button>
      </CardContent>
    </Card>
  );
};
