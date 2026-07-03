// AI Chat Action Detector
// Parses Swedish natural-language commands into structured action intents
// for confirmation-before-execute flow in the chat assistant.

export type AIActionKind =
  | "send_reminder"
  | "create_invoice"
  | "mark_invoice_paid"
  | "post_journal"
  | "periodize_cost"
  | "open_journal_form"
  | "generate_monthly_report"
  | "export_pnl_pdf"
  | "decline_delete"
  | "decline_settings"
  | "decline_payment";

export interface AIAction {
  kind: AIActionKind;
  title: string;
  summary: string;
  details: { label: string; value: string }[];
  confirmLabel?: string;
  cancelLabel?: string;
  declined?: boolean;
  declineMessage?: string;
  alternative?: string;
  payload?: Record<string, unknown>;
}

const num = (s: string) => {
  const m = s.match(/([\d\s]+(?:[.,]\d+)?)\s*(kr|sek)?/i);
  if (!m) return null;
  return Number(m[1].replace(/\s/g, "").replace(",", "."));
};

const monthMap: Record<string, number> = {
  januari: 1, februari: 2, mars: 3, april: 4, maj: 5, juni: 6,
  juli: 7, augusti: 8, september: 9, oktober: 10, november: 11, december: 12,
};

export function detectAIAction(input: string): AIAction | null {
  const text = input.trim();
  const t = text.toLowerCase();

  // ─── Decline patterns first ───
  if (/\b(radera|ta bort|delete)\b/.test(t)) {
    return {
      kind: "decline_delete",
      title: "Det kan jag inte göra här",
      summary: "Borttagning av data sker inte via chatten.",
      details: [],
      declined: true,
      declineMessage: "Det kan jag inte göra via chatten — gå till respektive vy för att hantera borttagningar.",
      alternative: "Öppna listvyn (t.ex. Fakturor eller Verifikationer) och välj posten du vill hantera.",
    };
  }
  if (/\b(ändra|byt|uppdatera)\b.*(inställning|behörighet|användare|roll)/.test(t)) {
    return {
      kind: "decline_settings",
      title: "Det faller utanför min räckvidd",
      summary: "Ändringar av inställningar och behörigheter görs av en administratör.",
      details: [],
      declined: true,
      declineMessage: "Det faller utanför vad jag kan göra här, men du kan öppna Inställningar → Användare och behörigheter.",
      alternative: "Öppna Inställningar för att hantera roller.",
    };
  }
  if (/\b(godkänn|skicka)\s+(betalning|överföring)|bankbetalning/.test(t)) {
    return {
      kind: "decline_payment",
      title: "Betalningar bekräftas inte här",
      summary: "Av säkerhetsskäl kan jag inte initiera bankbetalningar via chatten.",
      details: [],
      declined: true,
      declineMessage: "Det faller utanför vad jag kan göra här. Öppna Betalningar → Förslag och godkänn med BankID.",
      alternative: "Gå till Betalningar för att signera utbetalningar.",
    };
  }

  // ─── Reminder ───
  let m = t.match(/(skicka|skapa).*(påminnelse|reminder).*(till|åt)\s+([\wåäöÅÄÖ\s&-]+)/);
  if (m) {
    const customer = text.slice(m.index! + m[0].indexOf(m[4])).split(/[.,!?]/)[0].trim();
    return {
      kind: "send_reminder",
      title: "Skicka betalningspåminnelse",
      summary: `Påminnelse till ${customer} för förfallna fakturor.`,
      details: [
        { label: "Mottagare", value: customer },
        { label: "Mall", value: "Vänlig påminnelse (1:a nivå)" },
        { label: "Avgift", value: "60 kr lagstadgad påminnelseavgift" },
      ],
      confirmLabel: "Ja, skicka påminnelsen",
      payload: { customer },
    };
  }

  // ─── Create invoice ───
  m = t.match(/skapa.*faktura.*(till|åt)\s+([\wåäöÅÄÖ\s&-]+?)(?:\s+på\s+|\s+om\s+|\s+för\s+)([\d\s.,]+\s*(?:kr|sek)?)/);
  if (m) {
    const customer = m[2].trim();
    const amount = num(m[3]);
    return {
      kind: "create_invoice",
      title: "Skapa ny faktura",
      summary: `Förifylld faktura till ${customer}${amount ? ` på ${amount.toLocaleString("sv-SE")} kr` : ""}.`,
      details: [
        { label: "Kund", value: customer },
        { label: "Belopp (exkl. moms)", value: amount ? `${amount.toLocaleString("sv-SE")} kr` : "—" },
        { label: "Moms 25%", value: amount ? `${(amount * 0.25).toLocaleString("sv-SE")} kr` : "—" },
        { label: "Förfallodag", value: "30 dagar netto" },
      ],
      confirmLabel: "Öppna fakturaformuläret",
      payload: { customer, amount },
    };
  }

  // ─── Mark invoice paid ───
  m = t.match(/markera.*faktura.*?(?:nr\.?|nummer)?\s*([\w\d-]+).*(betald|paid)/);
  if (m) {
    return {
      kind: "mark_invoice_paid",
      title: "Markera faktura som betald",
      summary: `Faktura ${m[1]} markeras som fullt betald idag.`,
      details: [
        { label: "Fakturanummer", value: m[1] },
        { label: "Betaldatum", value: new Date().toLocaleDateString("sv-SE") },
        { label: "Bokas mot", value: "1930 Företagskonto" },
      ],
      confirmLabel: "Ja, markera som betald",
      payload: { invoiceNumber: m[1] },
    };
  }

  // ─── Post journal entry on account ───
  m = t.match(/kontera.*?([\d\s.,]+\s*(?:kr|sek)?)\s+(?:på|mot)\s+(?:konto\s+)?(\d{4})/);
  if (m) {
    const amount = num(m[1]);
    const account = m[2];
    return {
      kind: "post_journal",
      title: "Bokför verifikation",
      summary: `Föreslagen kontering på konto ${account}.`,
      details: [
        { label: "Belopp", value: amount ? `${amount.toLocaleString("sv-SE")} kr` : "—" },
        { label: "Debet", value: `${account}` },
        { label: "Kredit", value: "1930 Företagskonto" },
        { label: "Datum", value: new Date().toLocaleDateString("sv-SE") },
      ],
      confirmLabel: "Ja, bokför verifikationen",
      payload: { amount, account },
    };
  }

  // ─── Periodize ───
  m = t.match(/periodisera.*?(\d+)\s*(månader|mån|months)/);
  if (m) {
    const months = parseInt(m[1], 10);
    const today = new Date();
    const schedule = Array.from({ length: months }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      return d.toLocaleDateString("sv-SE", { month: "short", year: "numeric" });
    }).join(", ");
    return {
      kind: "periodize_cost",
      title: "Periodisera kostnad",
      summary: `Kostnaden fördelas jämnt över ${months} månader.`,
      details: [
        { label: "Antal perioder", value: `${months} månader` },
        { label: "Schema", value: schedule },
        { label: "Konto", value: "1790 Förutbetalda kostnader" },
      ],
      confirmLabel: "Ja, skapa periodiseringen",
      payload: { months },
    };
  }

  // ─── Open manual journal form ───
  if (/skapa.*(manuell\s+verifikation|verifikat)/.test(t)) {
    return {
      kind: "open_journal_form",
      title: "Öppna verifikationsformulär",
      summary: "Jag öppnar formuläret för manuell verifikation.",
      details: [{ label: "Vy", value: "Bokföring → Ny verifikation" }],
      confirmLabel: "Öppna formuläret",
    };
  }

  // ─── Generate monthly report ───
  m = t.match(/(generera|skapa).*månadsrapport(?:en)?(?:\s+för\s+([a-zåäö]+))?/);
  if (m) {
    const month = m[2] && monthMap[m[2]] ? m[2] : new Date().toLocaleDateString("sv-SE", { month: "long" });
    return {
      kind: "generate_monthly_report",
      title: "Generera månadsrapport",
      summary: `Skapar månadsrapport med AI-kommentarer för ${month}.`,
      details: [
        { label: "Period", value: month },
        { label: "Innehåll", value: "Resultat, balans, kassaflöde + kommentar" },
      ],
      confirmLabel: "Ja, generera rapporten",
      payload: { month },
    };
  }

  // ─── Export PnL PDF ───
  if (/exportera.*(resultat|pnl|p&l).*(pdf)/.test(t)) {
    return {
      kind: "export_pnl_pdf",
      title: "Exportera resultatrapport",
      summary: "Genererar PDF av resultatrapporten och laddar ner.",
      details: [
        { label: "Format", value: "PDF (A4)" },
        { label: "Period", value: "Innevarande räkenskapsår till idag" },
      ],
      confirmLabel: "Ja, exportera nu",
    };
  }

  return null;
}
