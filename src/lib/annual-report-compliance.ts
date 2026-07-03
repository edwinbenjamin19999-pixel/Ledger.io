// Hårdkodad K2/K3-regelverkscheck för årsredovisningen.
// Status härleds från befintlig data i UI:t (forvaltning, isLines, bsLines, notes).
// Används av OverviewHeaderCard (procentbreakdown), ContentSidebar (footer + indikatorer)
// och senare av ComplianceValidatorPanel (Del 4).

export type ComplianceStatus = "complete" | "missing" | "attention";
export type ComplianceSection =
  | "forvaltning"
  | "resultatrakning"
  | "balansrakning"
  | "kassaflodesanalys"
  | "notes"
  | "signing";

export interface ComplianceRule {
  id: string;
  label: string;
  section: ComplianceSection;
  /** Klickmål — sektion eller specifik nav-id i editor */
  navTarget: string;
  framework: "K2" | "K3" | "both";
  mandatory: boolean;
}

export interface ComplianceCheck extends ComplianceRule {
  status: ComplianceStatus;
}

export interface ComplianceContext {
  framework: "K2" | "K3";
  forvaltning: { verksamhet: string; handelser: string; vinstdisposition: string; framtid: string };
  netResult: number;
  revenue: number;
  totalAssets: number;
  totalEKSkulder: number;
  notes: Array<{ code: string; content: string; category: string }>;
  hasComparisonYear?: boolean;
  signedAt?: string | null;
}

const RULES: ComplianceRule[] = [
  // Förvaltningsberättelse
  { id: "fb_verksamhet", label: "Förvaltningsberättelse — Allmänt om verksamheten", section: "forvaltning", navTarget: "forvaltning_verksamhet", framework: "both", mandatory: true },
  { id: "fb_handelser",  label: "Förvaltningsberättelse — Väsentliga händelser",      section: "forvaltning", navTarget: "forvaltning_handelser",  framework: "both", mandatory: true },
  { id: "fb_flerar",     label: "Förvaltningsberättelse — Flerårsöversikt",           section: "forvaltning", navTarget: "forvaltning_flerarsoverikt", framework: "both", mandatory: true },
  { id: "fb_disp",       label: "Förvaltningsberättelse — Resultatdisposition",       section: "forvaltning", navTarget: "forvaltning_disposition", framework: "both", mandatory: true },
  { id: "fb_framtid",    label: "Förvaltningsberättelse — Framtida utveckling",       section: "forvaltning", navTarget: "forvaltning_verksamhet", framework: "K3",   mandatory: false },

  // RR / BR
  { id: "rr_netto",      label: "Resultaträkning — Nettoomsättning hämtad",           section: "resultatrakning", navTarget: "resultatrakning", framework: "both", mandatory: true },
  { id: "rr_arets",      label: "Resultaträkning — Årets resultat beräknat",          section: "resultatrakning", navTarget: "resultatrakning", framework: "both", mandatory: true },
  { id: "br_balans",     label: "Balansräkning — Balanserad",                         section: "balansrakning",   navTarget: "balansrakning",   framework: "both", mandatory: true },
  { id: "br_compare",    label: "Balansräkning — Jämförelseår ifyllt",                section: "balansrakning",   navTarget: "balansrakning",   framework: "both", mandatory: true },

  // Kassaflöde (K3)
  { id: "kf",            label: "Kassaflödesanalys upprättad",                        section: "kassaflodesanalys", navTarget: "kassaflodesanalys", framework: "K3", mandatory: true },

  // Noter
  { id: "note_principer",label: "Not — Redovisningsprinciper",                        section: "notes", navTarget: "notes", framework: "both", mandatory: true },
  { id: "note_anstallda",label: "Not — Medelantal anställda",                         section: "notes", navTarget: "notes", framework: "both", mandatory: true },
  { id: "note_arvode",   label: "Not — Revisorns arvode",                             section: "notes", navTarget: "notes", framework: "K3",   mandatory: true },
  { id: "note_ek",       label: "Not — Eget kapital",                                 section: "notes", navTarget: "notes", framework: "both", mandatory: true },
  { id: "note_skulder",  label: "Not — Långfristiga skulder",                         section: "notes", navTarget: "notes", framework: "K3",   mandatory: false },

  // Signering
  { id: "sign",          label: "Underskrifter / Signering",                          section: "signing", navTarget: "signing", framework: "both", mandatory: true },
];

const NOTE_CODE_MAP: Record<string, string[]> = {
  note_principer: ["NOT1", "NOT01", "REDOVISNINGSPRINCIPER", "PRINCIPER"],
  note_anstallda: ["NOT2", "NOT02", "ANSTALLDA", "MEDELANTAL"],
  note_arvode:    ["NOT_ARVODE", "ARVODE", "REVISOR"],
  note_ek:        ["NOT_EK", "EGETKAPITAL", "EK"],
  note_skulder:   ["NOT_SKULDER", "LANGFRISTIGA"],
};

function noteFilled(ruleId: string, ctx: ComplianceContext): ComplianceStatus {
  const codes = NOTE_CODE_MAP[ruleId] || [];
  const match = ctx.notes.find(n =>
    codes.some(c => n.code.toUpperCase().includes(c)) ||
    codes.some(c => (n as any).title?.toUpperCase?.().includes?.(c))
  );
  if (!match) return "missing";
  const text = (match.content || "").trim();
  if (!text) return "missing";
  if (text.length < 40 || /\[—\]/.test(text)) return "attention";
  return "complete";
}

export function evaluateCompliance(ctx: ComplianceContext): ComplianceCheck[] {
  const rules = RULES.filter(r => r.framework === "both" || r.framework === ctx.framework);
  return rules.map<ComplianceCheck>(rule => {
    let status: ComplianceStatus = "missing";
    switch (rule.id) {
      case "fb_verksamhet": status = ctx.forvaltning.verksamhet?.trim().length > 20 ? "complete" : ctx.forvaltning.verksamhet ? "attention" : "missing"; break;
      case "fb_handelser":  status = ctx.forvaltning.handelser?.trim().length > 10 ? "complete" : ctx.forvaltning.handelser ? "attention" : "missing"; break;
      case "fb_flerar":     status = ctx.revenue !== 0 ? "complete" : "missing"; break;
      case "fb_disp":       status = ctx.forvaltning.vinstdisposition?.trim() ? "complete" : "missing"; break;
      case "fb_framtid":    status = ctx.forvaltning.framtid?.trim() ? "complete" : "missing"; break;
      case "rr_netto":      status = ctx.revenue !== 0 ? "complete" : "missing"; break;
      case "rr_arets":      status = ctx.netResult !== 0 ? "complete" : "missing"; break;
      case "br_balans":     status = Math.abs(ctx.totalAssets - ctx.totalEKSkulder) < 1 && ctx.totalAssets !== 0 ? "complete" : ctx.totalAssets !== 0 ? "attention" : "missing"; break;
      case "br_compare":    status = ctx.hasComparisonYear ? "complete" : "attention"; break;
      case "kf":            status = ctx.framework === "K3" ? (ctx.totalAssets !== 0 ? "complete" : "missing") : "complete"; break;
      case "sign":          status = ctx.signedAt ? "complete" : "missing"; break;
      default:
        if (rule.section === "notes") status = noteFilled(rule.id, ctx);
    }
    return { ...rule, status };
  });
}

export interface SectionProgress {
  section: ComplianceSection;
  total: number;
  complete: number;
  pct: number;
}

export function summarize(checks: ComplianceCheck[]) {
  const total = checks.length;
  const complete = checks.filter(c => c.status === "complete").length;
  const sections: ComplianceSection[] = ["forvaltning", "resultatrakning", "balansrakning", "kassaflodesanalys", "notes", "signing"];
  const bySection: SectionProgress[] = sections.map(section => {
    const subset = checks.filter(c => c.section === section);
    const sc = subset.filter(c => c.status === "complete").length;
    return { section, total: subset.length, complete: sc, pct: subset.length ? Math.round((sc / subset.length) * 100) : 0 };
  });
  return {
    total,
    complete,
    pct: total ? Math.round((complete / total) * 100) : 0,
    bySection,
  };
}

export const SECTION_LABELS: Record<ComplianceSection, string> = {
  forvaltning: "Förvaltningsberättelse",
  resultatrakning: "Resultaträkning",
  balansrakning: "Balansräkning",
  kassaflodesanalys: "Kassaflödesanalys",
  notes: "Noter",
  signing: "Signering",
};
