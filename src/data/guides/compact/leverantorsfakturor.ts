import type { CompactGuide } from "./index";

export const leverantorsfakturor: CompactGuide = {
  slug: "leverantorsfakturor",
  h1: "Leverantörsfakturor — så bokför du dem rätt",
  metaTitle: "Leverantörsfakturor — så bokför du rätt | Cogniq",
  metaDescription:
    "Komplett guide till leverantörsfakturor: bokföring, attestflöde, periodisering och betalningsmatchning. För småföretagare.",
  intent: "transactional",
  readingTime: 5,
  updatedAt: "2026-04-18",
  excerpt: "Allt om hantering, attest och bokföring av leverantörsfakturor.",
  category: "Bokföring",
  lead: "En leverantörsfaktura är en räkning du fått från någon du köpt av. Hanteringen följer en tydlig kedja: ankomst, attest, bokföring och betalning.",
  keywords: ["leverantörsfaktura", "ap automation", "attestflöde", "konto 2440"],
  sections: [
    {
      heading: "Faktura kommer in",
      body: [
        "Leverantörsfakturor kan komma via e-post (PDF), e-faktura (Peppol) eller papper. Varje faktura ska innehålla: leverantörens namn och org.nr, fakturanummer, datum, momsbelopp och OCR/bankgiro.",
        "Säkerställ alltid att fakturan är ställd till ditt företag och avser något du faktiskt beställt — annars är det en bluffaktura.",
      ],
    },
    {
      heading: "Attestflöde",
      body: [
        "Innan bokföring ska någon på företaget godkänna fakturan. För småföretag räcker det att ägaren attesterar — för större företag finns ofta tvåstegsattest (mottagare + chef).",
      ],
    },
    {
      heading: "Bokföring vid mottagande",
      body: [
        "Bokför fakturan på det konto kostnaden tillhör (t.ex. 5410 Förbrukningsinventarier), ingående moms (2641) och leverantörsskuld (2440).",
      ],
      list: [
        "Debet: kostnadskonto + 2641 (ingående moms)",
        "Kredit: 2440 (leverantörsskuld)",
      ],
    },
    {
      heading: "Betalning",
      body: [
        "När fakturan betalas: debet 2440 (skulden minskar), kredit 1930 (bankkonto). Bankavstämning matchar betalningen mot fakturan automatiskt om OCR används.",
      ],
    },
    {
      heading: "Periodisering",
      body: [
        "Faktura som täcker flera månader (t.ex. årsabonnemang) periodiseras via 1790 (förutbetald kostnad) och löses upp månadsvis mot kostnadskontot.",
      ],
    },
  ],
  mistakes: [
    { title: "Bokför hela kostnaden direkt på årsabonnemang", body: "Använd 1790 + månatlig upplösning så blir resultaträkningen rättvisande." },
    { title: "Glömmer kontrollera momsen", body: "Saknar fakturan moms eller har fel sats — kontakta leverantören för korrekt faktura." },
    { title: "Betalar utan attest", body: "Inför alltid attestrutin — även för enmansföretag (skydd mot egna misstag)." },
  ],
  northledgerNote:
    "Cogniq tar emot fakturor via en unik mailadress, AI-extraherar belopp/moms/leverantör, kontrollerar dubbletter och förbereder bokföringen — du bara godkänner.",
  related: ["bokfora-faktura", "bas-kontoplanen", "avdragsgill-moms"],
};
