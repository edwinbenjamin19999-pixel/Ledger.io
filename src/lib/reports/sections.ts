/**
 * Generic hierarchy builder shared by RR and BR.
 *
 * A `GroupDef` describes ONE leaf-level section: title + filter + subtotal label,
 * and an optional `parent` to nest under (e.g. "Anläggningstillgångar").
 *
 * `buildSections(rows, groups)` produces a `ReportSection[]` matching the same
 * structure that `ProfessionalReportTable` already renders. RR and BR differ
 * ONLY in their group config — never in their builder.
 */

import type { ReportAccountRow, ReportSection } from "@/components/reports/ProfessionalReportTable";

export interface GroupDef {
  /** Leaf section title (e.g. "Nettoomsättning"). */
  title: string;
  /** Account filter predicate (typically a number-prefix test). */
  filter: (accountNumber: string) => boolean;
  /** Subtotal row label for this leaf section. */
  subtotalLabel: string;
  /** Optional parent grouping (e.g. "Anläggningstillgångar", "Rörelseintäkter"). */
  parent?: ParentDef;
}

export interface ParentDef {
  /** Display order key (parents are emitted in first-seen order). */
  key: string;
  title: string;
  /** Optional subtotal at the parent level (e.g. "Sa rörelseintäkter"). */
  subtotalLabel?: string;
  /** Level of the parent header in the hierarchy. Defaults to 1. */
  level?: 1 | 2;
}

/** RR (income statement) groups — full Swedish BAS structure. */
const RR_REVENUE: ParentDef = { key: "rr-revenue", title: "RÖRELSEINTÄKTER", subtotalLabel: "Sa rörelseintäkter", level: 1 };
const RR_COSTS: ParentDef = { key: "rr-costs", title: "RÖRELSEKOSTNADER", subtotalLabel: "Sa rörelsekostnader", level: 1 };
const RR_FIN: ParentDef = { key: "rr-fin", title: "FINANSIELLA POSTER", subtotalLabel: "Resultat efter finansiella poster", level: 1 };
const RR_APPROP: ParentDef = { key: "rr-approp", title: "BOKSLUTSDISPOSITIONER", level: 1 };
const RR_TAX: ParentDef = { key: "rr-tax", title: "SKATT", level: 1 };

export const RR_GROUPS: GroupDef[] = [
  { title: "Nettoomsättning", filter: (n) => /^3[0-7]/.test(n), subtotalLabel: "Sa nettoomsättning", parent: RR_REVENUE },
  { title: "Övriga rörelseintäkter", filter: (n) => /^3[8-9]/.test(n), subtotalLabel: "Sa övriga rörelseintäkter", parent: RR_REVENUE },
  { title: "Råvaror och förnödenheter", filter: (n) => n.startsWith("4"), subtotalLabel: "Sa råvaror och förnödenheter", parent: RR_COSTS },
  { title: "Övriga externa kostnader", filter: (n) => n.startsWith("5") || n.startsWith("6"), subtotalLabel: "Sa övriga externa kostnader", parent: RR_COSTS },
  { title: "Personalkostnader", filter: (n) => /^7[0-6]/.test(n), subtotalLabel: "Sa personalkostnader", parent: RR_COSTS },
  { title: "Avskrivningar", filter: (n) => /^77/.test(n), subtotalLabel: "Sa avskrivningar", parent: RR_COSTS },
  { title: "Övriga rörelsekostnader", filter: (n) => /^7[8-9]/.test(n), subtotalLabel: "Sa övriga rörelsekostnader", parent: RR_COSTS },
  { title: "Finansiella intäkter", filter: (n) => /^8[0-2]/.test(n), subtotalLabel: "Sa finansiella intäkter", parent: RR_FIN },
  { title: "Finansiella kostnader", filter: (n) => /^8[3-4]/.test(n), subtotalLabel: "Sa finansiella kostnader", parent: RR_FIN },
  { title: "Bokslutsdispositioner", filter: (n) => n.startsWith("88"), subtotalLabel: "Sa bokslutsdispositioner", parent: RR_APPROP },
  { title: "Skatt på årets resultat", filter: (n) => n.startsWith("89"), subtotalLabel: "Sa skatt", parent: RR_TAX },
];

/** BR (balance sheet) groups — full Swedish BAS structure. */
const BR_FIXED: ParentDef = { key: "br-fixed", title: "Anläggningstillgångar", subtotalLabel: "Sa anläggningstillgångar", level: 1 };
const BR_CURRENT: ParentDef = { key: "br-current", title: "Omsättningstillgångar", subtotalLabel: "Sa omsättningstillgångar", level: 1 };

export const BR_ASSET_GROUPS: GroupDef[] = [
  { title: "Immateriella anläggningstillgångar", filter: (n) => n.startsWith("10"), subtotalLabel: "Sa immateriella anl.tillg.", parent: BR_FIXED },
  { title: "Materiella anläggningstillgångar", filter: (n) => /^1[1-2]/.test(n), subtotalLabel: "Sa materiella anl.tillg.", parent: BR_FIXED },
  { title: "Finansiella anläggningstillgångar", filter: (n) => n.startsWith("13"), subtotalLabel: "Sa finansiella anl.tillg.", parent: BR_FIXED },
  { title: "Varulager", filter: (n) => n.startsWith("14"), subtotalLabel: "Sa varulager", parent: BR_CURRENT },
  { title: "Kortfristiga fordringar", filter: (n) => /^1[5-7]/.test(n), subtotalLabel: "Sa kortfristiga fordringar", parent: BR_CURRENT },
  { title: "Kortfristiga placeringar", filter: (n) => n.startsWith("18"), subtotalLabel: "Sa kortfristiga placeringar", parent: BR_CURRENT },
  { title: "Kassa och bank", filter: (n) => n.startsWith("19"), subtotalLabel: "Sa kassa och bank", parent: BR_CURRENT },
];

export const BR_EQUITY_LIAB_GROUPS: GroupDef[] = [
  { title: "Eget kapital", filter: (n) => n.startsWith("20"), subtotalLabel: "Sa eget kapital" },
  { title: "Obeskattade reserver", filter: (n) => n.startsWith("21"), subtotalLabel: "Sa obeskattade reserver" },
  { title: "Avsättningar", filter: (n) => n.startsWith("22"), subtotalLabel: "Sa avsättningar" },
  { title: "Långfristiga skulder", filter: (n) => n.startsWith("23"), subtotalLabel: "Sa långfristiga skulder" },
  { title: "Kortfristiga skulder", filter: (n) => /^2[4-9]/.test(n), subtotalLabel: "Sa kortfristiga skulder" },
];

/**
 * Build a hierarchical `ReportSection[]` from a flat list of account rows
 * and group definitions. Empty groups are skipped. Parents are emitted in
 * first-seen order across the input groups.
 */
export function buildSections(rows: ReportAccountRow[], groups: GroupDef[]): ReportSection[] {
  // Group leaves by parent.key (or "" for ungrouped).
  const parentOrder: string[] = [];
  const parentMap = new Map<string, { def: ParentDef | null; leaves: ReportSection[] }>();

  for (const g of groups) {
    const accounts = rows.filter((r) => g.filter(r.accountNumber));
    if (accounts.length === 0) continue;

    const parentKey = g.parent?.key ?? "";
    if (!parentMap.has(parentKey)) {
      parentMap.set(parentKey, { def: g.parent ?? null, leaves: [] });
      parentOrder.push(parentKey);
    }

    parentMap.get(parentKey)!.leaves.push({
      level: 2,
      title: g.title,
      accounts,
      subtotalLabel: g.subtotalLabel,
    });
  }

  // Emit
  const out: ReportSection[] = [];
  for (const key of parentOrder) {
    const entry = parentMap.get(key)!;
    if (!entry.def) {
      // Ungrouped — emit the leaves directly as level-1 sections.
      out.push(...entry.leaves.map((leaf) => ({ ...leaf, level: 1 as const })));
    } else {
      out.push({
        level: entry.def.level ?? 1,
        title: entry.def.title,
        accounts: [],
        subtotalLabel: entry.def.subtotalLabel,
        children: entry.leaves,
      });
    }
  }

  return out;
}

/** Convenience: collect all leaf accounts across a section tree. */
export function collectAccounts(sections: ReportSection[]): ReportAccountRow[] {
  const out: ReportAccountRow[] = [];
  const walk = (s: ReportSection) => {
    out.push(...(s.accounts || []));
    (s.children || []).forEach(walk);
  };
  sections.forEach(walk);
  return out;
}

/** Convenience: sum totals across a list of account rows. */
export function sumRows(rows: ReportAccountRow[]) {
  return rows.reduce(
    (s, r) => ({
      ingBalans: s.ingBalans + r.ingBalans,
      ingSaldo: s.ingSaldo + r.ingSaldo,
      perioden: s.perioden + r.perioden,
      utgBalans: s.utgBalans + r.utgBalans,
    }),
    { ingBalans: 0, ingSaldo: 0, perioden: 0, utgBalans: 0 },
  );
}
