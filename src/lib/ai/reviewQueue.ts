/**
 * Mock review queue — items where AI is waiting on a human decision.
 *
 * Single source for the "Att granska" page that aggregates pending items
 * across all agents and the autofix engine's review queue.
 */

export type ReviewSeverity = "critical" | "important" | "info";

export interface ConfidenceFactor {
  label: string;
  /** "+" boosts confidence, "-" lowers it */
  direction: "+" | "-";
}

export interface ReviewItem {
  id: string;
  agentKey: "bokforing" | "kvitto" | "autofix" | "lon" | "ar" | "skatt" | "beslutsmotor";
  agentName: string;
  action: string;
  /** SEK, signed (positive = revenue/asset effect, negative = cost/payout) */
  amount?: number;
  /** 0..100 */
  confidence: number;
  severity: ReviewSeverity;
  createdAt: Date;
  detail?: string;
  /** Factors that drove the confidence score — surfaced on hover */
  factors?: ConfidenceFactor[];
}

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);

// Representative sample — covers all agents. The console "138" tile is dynamic;
// this list is what the user actually triages.
export const MOCK_REVIEW_ITEMS: ReviewItem[] = [
  // Bokföringsagent — uncertain VAT/account picks
  { id: "bk-1", agentKey: "bokforing", agentName: "Bokföringsagent", action: "Kontera SEB-överföring till 1930 / 2440", amount: -42_180, confidence: 71, severity: "important", createdAt: minutesAgo(8), detail: "Mottagare: AAA Logistics AB · Referens: INV-22418" },
  { id: "bk-2", agentKey: "bokforing", agentName: "Bokföringsagent", action: "Klassificera faktura från Telia som tele (6212)", amount: -1_249, confidence: 84, severity: "info", createdAt: minutesAgo(22) },
  { id: "bk-3", agentKey: "bokforing", agentName: "Bokföringsagent", action: "Bokför Stripe-utbetalning, dela 25% moms / 0% utland", amount: 88_450, confidence: 78, severity: "important", createdAt: minutesAgo(35) },
  { id: "bk-4", agentKey: "bokforing", agentName: "Bokföringsagent", action: "Tolka kontantinsättning som kundbetalning #4488", amount: 12_000, confidence: 66, severity: "important", createdAt: minutesAgo(54) },

  // Kvittoagent — receipts under threshold
  { id: "kv-1", agentKey: "kvitto", agentName: "Kvittoagent", action: "Kategorisera kvitto Restaurang Pelikan som representation", amount: -1_868, confidence: 73, severity: "info", createdAt: minutesAgo(12), detail: "Moms 12% delat: 200 kr · Underlag saknar deltagare" },
  { id: "kv-2", agentKey: "kvitto", agentName: "Kvittoagent", action: "Matcha kvitto Circle K mot bilkostnad (5611)", amount: -682, confidence: 81, severity: "info", createdAt: minutesAgo(40) },
  { id: "kv-3", agentKey: "kvitto", agentName: "Kvittoagent", action: "Hantera kvitto Apple Store som inventarie eller direktkostnad", amount: -18_990, confidence: 69, severity: "important", createdAt: minutesAgo(95) },

  // Autofix — 5 pending (matches agentFleet pendingReviews)
  { id: "af-1", agentKey: "autofix", agentName: "Autofix", action: "Reversera dubblett verifikation V-2026-0118", amount: -4_521, confidence: 88, severity: "important", createdAt: minutesAgo(18) },
  { id: "af-2", agentKey: "autofix", agentName: "Autofix", action: "Korrigera negativ balans 1930 (saldo −2 414 kr)", confidence: 92, severity: "critical", createdAt: minutesAgo(48) },
  { id: "af-3", agentKey: "autofix", agentName: "Autofix", action: "Omklassificera 6212 → 6230 (felaktig konto-typ)", amount: -3_120, confidence: 76, severity: "info", createdAt: minutesAgo(130) },
  { id: "af-4", agentKey: "autofix", agentName: "Autofix", action: "Flytta post från period 2026-04 till 2026-05", amount: -9_750, confidence: 80, severity: "important", createdAt: minutesAgo(165) },
  { id: "af-5", agentKey: "autofix", agentName: "Autofix", action: "Ovanligt belopp på 5410 — 3× snittet", amount: -42_300, confidence: 67, severity: "important", createdAt: minutesAgo(230) },

  // Löneagent
  { id: "ln-1", agentKey: "lon", agentName: "Löneagent", action: "Godkänn lönekörning maj 2026 (8 anställda)", amount: -312_480, confidence: 95, severity: "critical", createdAt: minutesAgo(60), detail: "Skatt: 92 110 kr · Arb.giv.avg: 98 144 kr" },
  { id: "ln-2", agentKey: "lon", agentName: "Löneagent", action: "Tolka tillägg som OB-ersättning (kollektivavtal)", amount: -4_200, confidence: 74, severity: "info", createdAt: minutesAgo(180) },

  // AR-agent
  { id: "ar-1", agentKey: "ar", agentName: "AR-agent", action: "Skicka påminnelse till Norrlands Bygg AB (12 dgr försenat)", amount: 58_750, confidence: 89, severity: "important", createdAt: minutesAgo(20) },
  { id: "ar-2", agentKey: "ar", agentName: "AR-agent", action: "Lägg över faktura #4488 till inkasso", amount: 24_900, confidence: 82, severity: "important", createdAt: minutesAgo(75) },
  { id: "ar-3", agentKey: "ar", agentName: "AR-agent", action: "Erbjud delbetalning 3 mån till Hultins Café", amount: 18_400, confidence: 71, severity: "info", createdAt: minutesAgo(140) },

  // Skatteagent
  { id: "sk-1", agentKey: "skatt", agentName: "Skatteagent", action: "Godkänn AGI mars 2026 inför inlämning", amount: -98_144, confidence: 96, severity: "critical", createdAt: minutesAgo(30) },
  { id: "sk-2", agentKey: "skatt", agentName: "Skatteagent", action: "Kontrollera momsrapport Q1 (avvikelse 1 240 kr)", amount: -1_240, confidence: 84, severity: "important", createdAt: minutesAgo(110) },

  // Beslutsmotor
  { id: "bs-1", agentKey: "beslutsmotor", agentName: "Beslutsmotor", action: "Föreslå dröjsmålsränta för 4 förfallna fakturor", amount: 2_180, confidence: 78, severity: "info", createdAt: minutesAgo(50) },
  { id: "bs-2", agentKey: "beslutsmotor", agentName: "Beslutsmotor", action: "Investera överskott i räntefond (likviditet > 1.8x)", amount: 250_000, confidence: 72, severity: "info", createdAt: minutesAgo(200) },

  // High-confidence non-critical → triggers auto-posting demo
  { id: "bk-auto-1", agentKey: "bokforing", agentName: "Bokföringsagent", action: "Bokför Spotify-abonnemang som programvarukostnad (6540)", amount: -169, confidence: 98, severity: "info", createdAt: minutesAgo(5) },
  { id: "kv-auto-1", agentKey: "kvitto", agentName: "Kvittoagent", action: "Matcha SL-kvitto mot resekostnad (5800)", amount: -49, confidence: 97, severity: "info", createdAt: minutesAgo(7) },
];

const DEFAULT_FACTORS: ConfidenceFactor[] = [
  { label: "Leverantör känd sedan tidigare", direction: "+" },
  { label: "Belopp i normal range", direction: "+" },
  { label: "Momssats tvetydig", direction: "-" },
];

const FACTOR_TEMPLATES: Partial<Record<ReviewItem["agentKey"], ConfidenceFactor[]>> = {
  bokforing: [
    { label: "Leverantör matchar tidigare bokföring", direction: "+" },
    { label: "Kontoförslag bekräftat av regel", direction: "+" },
    { label: "Belopp avviker något från historik", direction: "-" },
  ],
  kvitto: [
    { label: "OCR-tolkning högkvalitativ", direction: "+" },
    { label: "Säljare matchar tidigare kvitton", direction: "+" },
    { label: "Saknar deltagare för representation", direction: "-" },
  ],
  autofix: [
    { label: "Mönster matchar känd avvikelse", direction: "+" },
    { label: "Reverserbar i ett steg", direction: "+" },
    { label: "Påverkar tidigare period", direction: "-" },
  ],
  lon: [
    { label: "Kollektivavtal identifierat", direction: "+" },
    { label: "Tidsrapporter kompletta", direction: "+" },
    { label: "Tillägg utanför vanligt mönster", direction: "-" },
  ],
  ar: [
    { label: "Kundens betalningshistorik stabil", direction: "+" },
    { label: "Förfallodatum entydigt", direction: "+" },
    { label: "Pågående dispyt registrerad", direction: "-" },
  ],
  skatt: [
    { label: "Underlag stämmer mot huvudbok", direction: "+" },
    { label: "SKV-period öppen", direction: "+" },
    { label: "Avvikelse mot föregående period", direction: "-" },
  ],
  beslutsmotor: [
    { label: "Likviditet täcker åtgärden", direction: "+" },
    { label: "Liknande beslut tidigare lyckat", direction: "+" },
    { label: "Marknadsdata osäker", direction: "-" },
  ],
};

export function factorsFor(item: ReviewItem): ConfidenceFactor[] {
  return item.factors ?? FACTOR_TEMPLATES[item.agentKey] ?? DEFAULT_FACTORS;
}

export function mockReviewItems(): ReviewItem[] {
  return MOCK_REVIEW_ITEMS;
}
