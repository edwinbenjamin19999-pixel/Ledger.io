// ar-generate-management-report — generates a complete draft of the
// Förvaltningsberättelse (or just one section if `sectionKind` is provided).
import { handleCors, corsError, corsJson } from "../_shared/cors.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const TOOL = {
  type: "function",
  function: {
    name: "generate_management_report",
    description:
      "Returnera utkast till förvaltningsberättelsens text-sektioner i formell svensk ton.",
    parameters: {
      type: "object",
      properties: {
        sections: {
          type: "object",
          description: "Map där nyckeln är sektionens 'kind' och värdet är HTML/text.",
          additionalProperties: { type: "string" },
        },
        warnings: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["sections", "warnings"],
    },
  },
} as const;

interface ReqBody {
  framework: "K2" | "K3";
  fiscalYear: number;
  /** Om null/undef: generera samtliga textsektioner. Annars bara denna. */
  sectionKind?: string;
  company: {
    name: string;
    orgNumber?: string | null;
    seat?: string | null;
    businessDescription?: string | null;
    industry?: string | null;
  };
  ceo?: string | null;
  chairman?: string | null;
  /** Aktuella nyckeltal för innevarande år. */
  kpis?: {
    revenue?: number | null;
    operatingResult?: number | null;
    netResult?: number | null;
    totalEquity?: number | null;
    totalAssets?: number | null;
    avgEmployees?: number | null;
  };
  /** Föregående år — för jämförelser. */
  prevKpis?: {
    revenue?: number | null;
    netResult?: number | null;
  };
  /** AI-fynd (top customers, top costs, large transactions). */
  insights?: {
    topCustomers?: Array<{ name: string; amount: number }>;
    topCostCategories?: Array<{ name: string; amount: number }>;
    largestTransactions?: Array<{ description: string; amount: number }>;
    cashChange?: number | null;
  };
}

const SECTION_DESCRIPTIONS: Record<string, string> = {
  general: "Allmänt om verksamheten — beskriv firma, säte, ledning, verksamhet (2–3 meningar).",
  significant_events:
    "Väsentliga händelser under räkenskapsåret — använd insights (stora transaktioner, kundkoncentration, investeringar). 1–2 stycken.",
  future_outlook:
    "Förväntad framtida utveckling — återhållsamt baserat på omsättningstrend och kassa. 2–3 meningar.",
  research_development:
    "Forskning och utveckling — om FoU-konton är tomma, skriv standardtext. Annars beskriv kortfattat.",
  branches: "Filial — standardtext om inga filialer finns.",
  environment: "Miljö och hållbarhet — kort om miljöpåverkan eller 'inte tillämpligt'.",
  personnel:
    "Personal — sammanfatta medelantal anställda. Hänvisa till not Anställda för detaljer.",
};

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = (await req.json().catch(() => ({}))) as ReqBody;
    const {
      framework = "K2",
      fiscalYear,
      sectionKind,
      company,
      ceo,
      chairman,
      kpis,
      prevKpis,
      insights,
    } = body;

    if (!company?.name || !fiscalYear) return corsError("company och fiscalYear krävs", 400);

    const wantedSections = sectionKind
      ? { [sectionKind]: SECTION_DESCRIPTIONS[sectionKind] ?? "Generera text för denna sektion." }
      : SECTION_DESCRIPTIONS;

    const fmt = (n: number | null | undefined) =>
      n == null ? "saknas" : `${Math.round(n).toLocaleString("sv-SE")} kr`;

    const revenueDelta =
      kpis?.revenue != null && prevKpis?.revenue != null && prevKpis.revenue !== 0
        ? `${(((kpis.revenue - prevKpis.revenue) / Math.abs(prevKpis.revenue)) * 100).toFixed(1)} %`
        : "okänd";

    const sysPrompt = [
      "Du är en svensk redovisningskonsult som skriver förvaltningsberättelser enligt ÅRL 6 kap.",
      `Ramverk: ${framework}. Räkenskapsår: ${fiscalYear}.`,
      "Stil: formell, koncis, faktabaserad svenska. INGA marknadsföringsformuleringar.",
      "Använd belopp i hela kronor med svenska tusentalsavgränsare.",
      "Om data saknas: skriv 'data saknas' istället för fiktiva siffror.",
      "Returnera HTML i `<p>...</p>`-form per sektion.",
    ].join("\n");

    const userPrompt = [
      `Bolag: ${company.name} (org.nr ${company.orgNumber ?? "saknas"})`,
      `Säte: ${company.seat ?? "saknas"}`,
      `Verksamhet: ${company.businessDescription ?? "saknas"}`,
      `Bransch: ${company.industry ?? "saknas"}`,
      `VD: ${ceo ?? "saknas"} | Styrelseordförande: ${chairman ?? "saknas"}`,
      "",
      "Nyckeltal innevarande år:",
      `- Nettoomsättning: ${fmt(kpis?.revenue)}`,
      `- Rörelseresultat: ${fmt(kpis?.operatingResult)}`,
      `- Årets resultat: ${fmt(kpis?.netResult)}`,
      `- Eget kapital: ${fmt(kpis?.totalEquity)}`,
      `- Balansomslutning: ${fmt(kpis?.totalAssets)}`,
      `- Medelantal anställda: ${kpis?.avgEmployees ?? "saknas"}`,
      `- Förändring nettoomsättning vs föregående år: ${revenueDelta}`,
      "",
      "AI-fynd (för 'Väsentliga händelser'):",
      `- Top 3 kunder: ${insights?.topCustomers?.map((c) => `${c.name} (${fmt(c.amount)})`).join(", ") ?? "saknas"}`,
      `- Top 3 kostnadskategorier: ${insights?.topCostCategories?.map((c) => `${c.name} (${fmt(c.amount)})`).join(", ") ?? "saknas"}`,
      `- Största transaktioner: ${insights?.largestTransactions?.map((t) => `${t.description} (${fmt(t.amount)})`).join(", ") ?? "saknas"}`,
      `- Kassaflöde under året: ${fmt(insights?.cashChange)}`,
      "",
      "Generera följande sektioner:",
      ...Object.entries(wantedSections).map(([k, desc]) => `- ${k}: ${desc}`),
    ].join("\n");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sysPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "generate_management_report" } },
      }),
    });

    if (aiResp.status === 429) return corsError("AI-rate limit nådd, försök igen senare.", 429);
    if (aiResp.status === 402) return corsError("AI-krediter slut — fyll på i Inställningar.", 402);
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return corsError("AI-anrop misslyckades", 500);
    }

    const j = await aiResp.json();
    const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return corsError("AI returnerade ingen text", 500);

    const parsed = JSON.parse(args) as { sections: Record<string, string>; warnings: string[] };
    return corsJson(parsed);
  } catch (e) {
    console.error("ar-generate-management-report error:", e);
    return corsError(e instanceof Error ? e.message : "Internal error", 500);
  }
});
