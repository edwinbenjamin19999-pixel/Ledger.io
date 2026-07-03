/**
 * Generates the default section + block tree for an annual report
 * based on framework (K2/K3) and ledger context.
 */
import { getApplicableNotes, type Framework, type NoteContext } from "./noteLibrary";

export interface SectionSeed {
  key: string;
  section_type:
    | "forvaltning"
    | "rr"
    | "br"
    | "kf"
    | "eget_kapital"
    | "noter"
    | "note"
    | "signering"
    | "fastställelse"
    | "custom";
  label: string;
  parentKey?: string;
  is_required: boolean;
  order: number;
  blocks: BlockSeed[];
}

export interface BlockSeed {
  block_type: "heading" | "text" | "financial_table" | "note_table" | "signature" | "attachment" | "divider";
  content: Record<string, unknown>;
  ai_generated?: boolean;
}

export function generateStructure(framework: Framework, ctx: NoteContext): SectionSeed[] {
  const sections: SectionSeed[] = [];
  let order = 0;

  sections.push({
    key: "forvaltning",
    section_type: "forvaltning",
    label: "Förvaltningsberättelse",
    is_required: true,
    order: order++,
    blocks: [
      { block_type: "heading", content: { text: "Förvaltningsberättelse", level: 1 } },
      {
        block_type: "text",
        content: {
          html: `<p>Styrelsen för bolaget får härmed avge årsredovisning för räkenskapsåret. Verksamheten har bedrivits enligt bolagsordningen och styrelsens beslut.</p><p><strong>Väsentliga händelser under räkenskapsåret:</strong> Inga väsentliga händelser att rapportera.</p>`,
        },
        ai_generated: true,
      },
    ],
  });

  sections.push({
    key: "rr",
    section_type: "rr",
    label: "Resultaträkning",
    is_required: true,
    order: order++,
    blocks: [
      { block_type: "heading", content: { text: "Resultaträkning", level: 1 } },
      { block_type: "financial_table", content: { table: "income_statement", framework } },
    ],
  });

  sections.push({
    key: "br",
    section_type: "br",
    label: "Balansräkning",
    is_required: true,
    order: order++,
    blocks: [
      { block_type: "heading", content: { text: "Balansräkning", level: 1 } },
      { block_type: "financial_table", content: { table: "balance_sheet", framework } },
    ],
  });

  if (framework === "K3") {
    sections.push({
      key: "kf",
      section_type: "kf",
      label: "Kassaflödesanalys",
      is_required: true,
      order: order++,
      blocks: [
        { block_type: "heading", content: { text: "Kassaflödesanalys", level: 1 } },
        { block_type: "financial_table", content: { table: "cash_flow", framework } },
      ],
    });
  }

  sections.push({
    key: "eget_kapital",
    section_type: "eget_kapital",
    label: "Förändringar i eget kapital",
    is_required: true,
    order: order++,
    blocks: [
      { block_type: "heading", content: { text: "Förändringar i eget kapital", level: 1 } },
      { block_type: "financial_table", content: { table: "equity_changes", framework } },
    ],
  });

  // Notes parent
  sections.push({
    key: "noter",
    section_type: "noter",
    label: "Noter",
    is_required: true,
    order: order++,
    blocks: [{ block_type: "heading", content: { text: "Noter", level: 1 } }],
  });

  // Note children
  const notes = getApplicableNotes(ctx);
  notes.forEach((n, i) => {
    sections.push({
      key: `note_${n.code}`,
      section_type: "note",
      parentKey: "noter",
      label: `Not ${i + 1} – ${n.title}`,
      is_required: false,
      order: i,
      blocks: [
        { block_type: "heading", content: { text: n.title, level: 2 } },
        {
          block_type: "text",
          content: { html: `<p>${n.defaultText.replace("{framework}", framework)}</p>` },
          ai_generated: true,
        },
        ...(n.accountRanges.length
          ? [{ block_type: "note_table" as const, content: { noteCode: n.code, ranges: n.accountRanges } }]
          : []),
      ],
    });
  });

  sections.push({
    key: "signering",
    section_type: "signering",
    label: "Underskrifter",
    is_required: true,
    order: order++,
    blocks: [
      { block_type: "heading", content: { text: "Underskrifter", level: 1 } },
      { block_type: "signature", content: { roles: ["Styrelseledamot"], required: 1 } },
    ],
  });

  sections.push({
    key: "fastställelse",
    section_type: "fastställelse",
    label: "Fastställelseintyg",
    is_required: true,
    order: order++,
    blocks: [
      { block_type: "heading", content: { text: "Fastställelseintyg", level: 1 } },
      {
        block_type: "text",
        content: {
          html: `<p>Resultaträkningen och balansräkningen har fastställts på årsstämma. Stämman beslutade att godkänna styrelsens förslag till resultatdisposition.</p>`,
        },
      },
    ],
  });

  return sections;
}
