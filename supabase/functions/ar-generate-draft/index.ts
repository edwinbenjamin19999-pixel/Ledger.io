// ar-generate-draft — generates the initial AR v2 structure + AI text blocks.
// Idempotent: skips sections/blocks where locked=true / is_locked=true.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, handleCors, corsError, corsJson } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

interface NoteCtx {
  framework: "K2" | "K3";
  hasEmployees: boolean;
  hasFixedAssets: boolean;
  hasLeases: boolean;
  hasFinancialInstruments: boolean;
  hasRelatedParties: boolean;
  hasPledgedAssets: boolean;
  hasContingentLiabilities: boolean;
  hasIntangibles: boolean;
  hasInventory: boolean;
}

const NOTES: Array<{ code: string; title: string; framework: ("K2" | "K3")[]; required: (c: NoteCtx) => boolean; defaultText: string }> = [
  { code: "accounting_principles", title: "Redovisningsprinciper", framework: ["K2", "K3"], required: () => true,
    defaultText: "Årsredovisningen har upprättats i enlighet med årsredovisningslagen och {framework}." },
  { code: "employees", title: "Medelantal anställda", framework: ["K2", "K3"], required: (c) => c.hasEmployees,
    defaultText: "Medelantalet anställda under räkenskapsåret." },
  { code: "depreciation", title: "Avskrivningar", framework: ["K2", "K3"], required: (c) => c.hasFixedAssets,
    defaultText: "Avskrivningar enligt plan baseras på ursprungliga anskaffningsvärden." },
  { code: "tax", title: "Skatt på årets resultat", framework: ["K2", "K3"], required: () => true,
    defaultText: "Aktuell skatt och uppskjuten skatt." },
  { code: "tangible_assets", title: "Materiella anläggningstillgångar", framework: ["K2", "K3"], required: (c) => c.hasFixedAssets,
    defaultText: "Specifikation av materiella anläggningstillgångar." },
  { code: "intangibles", title: "Immateriella anläggningstillgångar", framework: ["K3"], required: (c) => c.hasIntangibles,
    defaultText: "Specifikation av immateriella tillgångar." },
  { code: "inventory", title: "Varulager", framework: ["K2", "K3"], required: (c) => c.hasInventory,
    defaultText: "Varulagret är värderat till lägsta värdets princip." },
  { code: "leases", title: "Leasingavtal", framework: ["K2", "K3"], required: (c) => c.hasLeases,
    defaultText: "Operationella leasingavtal." },
  { code: "contingent_liabilities", title: "Eventualförpliktelser", framework: ["K2", "K3"], required: (c) => c.hasContingentLiabilities,
    defaultText: "Eventualförpliktelser per balansdagen." },
  { code: "pledged_assets", title: "Ställda säkerheter", framework: ["K2", "K3"], required: (c) => c.hasPledgedAssets,
    defaultText: "Ställda säkerheter per balansdagen." },
  { code: "related_parties", title: "Närstående", framework: ["K3"], required: (c) => c.hasRelatedParties,
    defaultText: "Transaktioner med närstående parter." },
  { code: "auditor_fees", title: "Arvode till revisor", framework: ["K3"], required: () => true,
    defaultText: "Arvode och kostnadsersättning till revisor." },
  { code: "cash_flow_statement", title: "Kassaflödesanalys", framework: ["K3"], required: () => true,
    defaultText: "Kassaflödesanalys upprättad enligt indirekt metod." },
];

interface Section {
  key: string;
  parentKey?: string;
  section_type: string;
  label: string;
  is_required: boolean;
  blocks: Array<{ block_type: string; content: Record<string, unknown>; ai_generated?: boolean; ai_confidence?: number }>;
}

function generateStructure(framework: "K2" | "K3", ctx: NoteCtx): Section[] {
  const out: Section[] = [];
  out.push({
    key: "forvaltning", section_type: "forvaltning", label: "Förvaltningsberättelse", is_required: true,
    blocks: [
      { block_type: "heading", content: { text: "Förvaltningsberättelse", level: 1 } },
      { block_type: "text", content: { html: "<p>Genereras av AI...</p>" }, ai_generated: true, ai_confidence: 0.7 },
    ],
  });
  out.push({
    key: "rr", section_type: "rr", label: "Resultaträkning", is_required: true,
    blocks: [
      { block_type: "heading", content: { text: "Resultaträkning", level: 1 } },
      { block_type: "financial_table", content: { table: "income_statement", framework } },
    ],
  });
  out.push({
    key: "br", section_type: "br", label: "Balansräkning", is_required: true,
    blocks: [
      { block_type: "heading", content: { text: "Balansräkning", level: 1 } },
      { block_type: "financial_table", content: { table: "balance_sheet", framework } },
    ],
  });
  if (framework === "K3") {
    out.push({
      key: "kf", section_type: "kf", label: "Kassaflödesanalys", is_required: true,
      blocks: [
        { block_type: "heading", content: { text: "Kassaflödesanalys", level: 1 } },
        { block_type: "financial_table", content: { table: "cash_flow", framework } },
      ],
    });
  }
  out.push({
    key: "noter", section_type: "noter", label: "Noter", is_required: true,
    blocks: [{ block_type: "heading", content: { text: "Noter", level: 1 } }],
  });
  const applicable = NOTES.filter((n) => n.framework.includes(framework) && n.required(ctx));
  applicable.forEach((n, i) => {
    out.push({
      key: `note_${n.code}`, parentKey: "noter", section_type: "note",
      label: `Not ${i + 1} – ${n.title}`, is_required: false,
      blocks: [
        { block_type: "heading", content: { text: n.title, level: 2 } },
        { block_type: "text", content: { html: `<p>${n.defaultText.replace("{framework}", framework)}</p>` }, ai_generated: true, ai_confidence: 0.6 },
      ],
    });
  });
  out.push({
    key: "signering", section_type: "signering", label: "Underskrifter", is_required: true,
    blocks: [
      { block_type: "heading", content: { text: "Underskrifter", level: 1 } },
      { block_type: "signature", content: { roles: ["Styrelseledamot"], required: 1 } },
    ],
  });
  out.push({
    key: "fastställelse", section_type: "fastställelse", label: "Fastställelseintyg", is_required: true,
    blocks: [
      { block_type: "heading", content: { text: "Fastställelseintyg", level: 1 } },
      { block_type: "text", content: { html: "<p>Resultat- och balansräkningen har fastställts på årsstämma.</p>" } },
    ],
  });
  return out;
}

async function aiText(prompt: string): Promise<string> {
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Du är en svensk redovisningsexpert. Skriv kort, formell text för en årsredovisning." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!r.ok) return "";
    const j = await r.json();
    return j.choices?.[0]?.message?.content?.trim() ?? "";
  } catch {
    return "";
  }
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return corsError("Saknar auth", 401);

    const { annualReportId } = await req.json();
    if (!annualReportId) return corsError("annualReportId krävs", 400);

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) return corsError("Ej inloggad", 401);

    const { data: report, error: rerr } = await sb
      .from("annual_reports")
      .select("id, company_id, fiscal_year, report_type")
      .eq("id", annualReportId)
      .single();
    if (rerr || !report) return corsError("Utkast hittades inte", 404);

    const framework = (report.report_type === "K3" ? "K3" : "K2") as "K2" | "K3";

    // Probe ledger for context
    const { data: jeLines } = await sb
      .from("journal_entry_lines")
      .select("account_number")
      .eq("company_id", report.company_id)
      .limit(2000);
    const accountNumbers = new Set((jeLines || []).map((l: { account_number: string }) => l.account_number));
    const has = (from: number, to: number) => Array.from(accountNumbers).some((a) => {
      const n = parseInt(a, 10);
      return Number.isFinite(n) && n >= from && n <= to;
    });
    const ctx: NoteCtx = {
      framework,
      hasEmployees: has(7000, 7699),
      hasFixedAssets: has(1100, 1299),
      hasLeases: has(5210, 5219),
      hasFinancialInstruments: has(1310, 1399),
      hasRelatedParties: false,
      hasPledgedAssets: has(2390, 2399),
      hasContingentLiabilities: false,
      hasIntangibles: has(1010, 1099),
      hasInventory: has(1400, 1499),
    };

    const sections = generateStructure(framework, ctx);

    // Existing sections (skip locked / preserve)
    const { data: existing } = await sb
      .from("annual_report_sections")
      .select("id, section_type, label, locked, metadata")
      .eq("annual_report_id", annualReportId);
    const existingByType = new Map(
      (existing || []).map((s: { id: string; section_type: string; label: string; locked: boolean; metadata: Record<string, unknown> }) => [`${s.section_type}::${s.label}`, s]),
    );

    const sectionIdByKey = new Map<string, string>();
    let order = 0;

    for (const s of sections) {
      const lookupKey = `${s.section_type}::${s.label}`;
      const ex = existingByType.get(lookupKey);
      let sectionId: string;
      const parentId = s.parentKey ? sectionIdByKey.get(s.parentKey) ?? null : null;

      if (ex) {
        if (ex.locked) {
          sectionIdByKey.set(s.key, ex.id);
          order++;
          continue;
        }
        sectionId = ex.id;
        await sb.from("annual_report_sections").update({
          parent_id: parentId,
          order_index: order++,
          ai_generated: true,
          metadata: { is_required: s.is_required },
        }).eq("id", sectionId);
      } else {
        const { data: ins, error: insErr } = await sb
          .from("annual_report_sections")
          .insert({
            annual_report_id: annualReportId,
            company_id: report.company_id,
            parent_id: parentId,
            section_type: s.section_type,
            label: s.label,
            order_index: order++,
            visible: true,
            ai_generated: true,
            locked: false,
            metadata: { is_required: s.is_required },
          })
          .select("id")
          .single();
        if (insErr || !ins) continue;
        sectionId = ins.id;
      }
      sectionIdByKey.set(s.key, sectionId);

      // Replace blocks (skip locked)
      const { data: existingBlocks } = await sb
        .from("ar_blocks")
        .select("id, is_locked, block_type")
        .eq("section_id", sectionId);
      const lockedIds = new Set((existingBlocks || []).filter((b: { is_locked: boolean; id: string }) => b.is_locked).map((b: { id: string }) => b.id));
      const toDelete = (existingBlocks || []).filter((b: { id: string; is_locked: boolean }) => !b.is_locked).map((b: { id: string }) => b.id);
      if (toDelete.length) await sb.from("ar_blocks").delete().in("id", toDelete);

      let bOrder = lockedIds.size;
      for (const b of s.blocks) {
        let content = b.content;
        // AI fill for forvaltning text
        if (s.key === "forvaltning" && b.block_type === "text") {
          const aiTxt = await aiText(
            `Skriv en kort förvaltningsberättelse (max 4 meningar) för räkenskapsåret ${report.fiscal_year}. Inkludera "Styrelsen för bolaget får härmed avge årsredovisning" och en mening om verksamheten.`,
          );
          if (aiTxt) content = { html: `<p>${aiTxt.replace(/\n/g, "</p><p>")}</p>` };
        }
        await sb.from("ar_blocks").insert({
          annual_report_id: annualReportId,
          company_id: report.company_id,
          section_id: sectionId,
          block_type: b.block_type,
          sort_order: bOrder++,
          content,
          ai_generated: !!b.ai_generated,
          ai_confidence: b.ai_confidence ?? null,
          is_locked: false,
        });
      }
    }

    // Auto-mapping of accounts to sections (basic)
    const RANGES: Array<{ from: number; to: number; sectionType: string }> = [
      { from: 3000, to: 3999, sectionType: "rr" },
      { from: 4000, to: 6999, sectionType: "rr" },
      { from: 7000, to: 8999, sectionType: "rr" },
      { from: 1000, to: 1999, sectionType: "br" },
      { from: 2000, to: 2999, sectionType: "br" },
    ];
    const allSections = await sb
      .from("annual_report_sections")
      .select("id, section_type")
      .eq("annual_report_id", annualReportId);
    const typeToId = new Map<string, string>();
    for (const s of allSections.data || []) typeToId.set((s as { section_type: string }).section_type, (s as { id: string }).id);

    await sb.from("ar_section_account_map").delete().eq("annual_report_id", annualReportId);
    const mappings: Array<Record<string, unknown>> = [];
    for (const acc of accountNumbers) {
      const n = parseInt(acc, 10);
      const r = RANGES.find((x) => n >= x.from && n <= x.to);
      if (!r) continue;
      const sid = typeToId.get(r.sectionType);
      if (!sid) continue;
      mappings.push({
        annual_report_id: annualReportId,
        company_id: report.company_id,
        section_id: sid,
        account_number: acc,
        weight: 1.0,
      });
    }
    if (mappings.length) {
      // batch insert in chunks of 500
      for (let i = 0; i < mappings.length; i += 500) {
        await sb.from("ar_section_account_map").insert(mappings.slice(i, i + 500));
      }
    }

    return corsJson({ ok: true, sectionsCreated: sectionIdByKey.size, mappings: mappings.length });
  } catch (e) {
    console.error("ar-generate-draft error:", e);
    return corsError(e instanceof Error ? e.message : "Internal error", 500);
  }
});
