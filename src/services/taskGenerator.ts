import { supabase } from "@/integrations/supabase/client";

/**
 * Auto-task generator for the bureau workflow.
 *
 * Computes synthetic tasks from live client signals (overdue invoices,
 * missing receipts, stale bank reconciliation, upcoming VAT/AGI deadlines,
 * stale bookkeeping). These do NOT touch the firm_tasks table — they are
 * rendered directly as a live worklist so users always see something
 * meaningful instead of an empty page.
 */

export type AutoTaskKind =
  | "overdue_ar"
  | "missing_receipts"
  | "stale_bank_recon"
  | "vat_due_soon"
  | "agi_due_soon"
  | "no_bookkeeping";

export type AutoTaskPriority = "critical" | "high" | "medium";

export interface AutoTask {
  id: string;
  client_id: string;
  client_name: string;
  kind: AutoTaskKind;
  title: string;
  subtitle: string;
  priority: AutoTaskPriority;
  actionLabel: string;
  /** Suggested in-WL route — never leaves the white-label experience. */
  actionHref: string;
  iconName:
    | "AlertCircle"
    | "FileX"
    | "Building2"
    | "Calendar"
    | "FileCheck"
    | "BookOpen";
  iconColor: string;
  ageMs: number;
  isAIGenerated: true;
}

export interface ClientLite {
  id: string;
  name: string;
}

const DAY = 86_400_000;

function uid(parts: string[]) {
  return parts.join("::");
}

function daysAgo(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const t = typeof date === "string" ? Date.parse(date) : date.getTime();
  if (isNaN(t)) return null;
  return Math.floor((Date.now() - t) / DAY);
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

function fmtSEK(n: number) {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);
}

async function buildOverdueAR(client: ClientLite): Promise<AutoTask | null> {
  const todayIso = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("invoices")
    .select("id, total_amount, due_date, paid_at, status")
    .eq("company_id", client.id)
    .eq("invoice_direction", "outgoing")
    .not("status", "in", "(paid,cancelled,void)")
    .is("paid_at", null)
    .lt("due_date", todayIso);

  const rows = data ?? [];
  if (rows.length === 0) return null;

  const total = rows.reduce((s, r: any) => s + Number(r.total_amount ?? 0), 0);
  const oldest = rows.reduce((min: number, r: any) => {
    const d = daysAgo(r.due_date) ?? 0;
    return d > min ? d : min;
  }, 0);

  const priority: AutoTaskPriority =
    oldest > 30 ? "critical" : oldest > 7 ? "high" : "medium";

  return {
    id: uid([client.id, "overdue_ar"]),
    client_id: client.id,
    client_name: client.name,
    kind: "overdue_ar",
    title: `${client.name} — ${rows.length} kundfakturor förfallna`,
    subtitle: `${fmtSEK(total)} kr sedan ${oldest} dagar`,
    priority,
    actionLabel: "Skicka påminnelse",
    actionHref: "/wl/app/invoices",
    iconName: "AlertCircle",
    iconColor: "#E24B4A",
    ageMs: oldest * DAY,
    isAIGenerated: true,
  };
}

async function buildMissingReceipts(client: ClientLite): Promise<AutoTask | null> {
  const { data, count } = await supabase
    .from("journal_entries")
    .select("entry_date", { count: "exact" })
    .eq("company_id", client.id)
    .eq("receipt_matched", false)
    .order("entry_date", { ascending: true })
    .limit(1);

  const total = count ?? 0;
  if (total <= 5) return null;

  const oldest = daysAgo((data?.[0] as any)?.entry_date) ?? 0;

  return {
    id: uid([client.id, "missing_receipts"]),
    client_id: client.id,
    client_name: client.name,
    kind: "missing_receipts",
    title: `${client.name} — ${total} verifikationer saknar bilaga`,
    subtitle: `Äldst: ${oldest} dagar gammal`,
    priority: "high",
    actionLabel: "Påminn klient",
    actionHref: `/wl/app/clients/${client.id}`,
    iconName: "FileX",
    iconColor: "#EF9F27",
    ageMs: oldest * DAY,
    isAIGenerated: true,
  };
}

async function buildStaleBankRecon(client: ClientLite): Promise<AutoTask | null> {
  const { data } = await supabase
    .from("bank_transactions")
    .select("transaction_date")
    .eq("company_id", client.id)
    .order("transaction_date", { ascending: false })
    .limit(1);

  const lastDays = daysAgo((data?.[0] as any)?.transaction_date);
  if (lastDays === null || lastDays <= 21) return null;

  return {
    id: uid([client.id, "stale_bank_recon"]),
    client_id: client.id,
    client_name: client.name,
    kind: "stale_bank_recon",
    title: `${client.name} — Bankavstämning ej gjord`,
    subtitle: `Senast: ${lastDays} dagar sedan`,
    priority: lastDays > 30 ? "high" : "medium",
    actionLabel: "Starta avstämning",
    actionHref: "/wl/app",
    iconName: "Building2",
    iconColor: "#EF9F27",
    ageMs: lastDays * DAY,
    isAIGenerated: true,
  };
}

function buildVATDueSoon(client: ClientLite): AutoTask | null {
  // Deterministic monthly Swedish VAT deadline — 12th of each month.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let due = new Date(today.getFullYear(), today.getMonth(), 12);
  if (due < today) due = new Date(today.getFullYear(), today.getMonth() + 1, 12);
  const daysLeft = Math.ceil((due.getTime() - today.getTime()) / DAY);
  if (daysLeft > 7) return null;

  return {
    id: uid([client.id, "vat_due_soon", due.toISOString().slice(0, 10)]),
    client_id: client.id,
    client_name: client.name,
    kind: "vat_due_soon",
    title: `${client.name} — Moms förfaller ${fmtDate(due)}`,
    subtitle: `Om ${daysLeft} dagar`,
    priority: daysLeft < 3 ? "critical" : "high",
    actionLabel: "Beräkna och förbered",
    actionHref: "/wl/app/vat",
    iconName: "Calendar",
    iconColor: "#EF9F27",
    ageMs: 0,
    isAIGenerated: true,
  };
}

function buildAGIDueSoon(client: ClientLite): AutoTask | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let due = new Date(today.getFullYear(), today.getMonth(), 12);
  if (due < today) due = new Date(today.getFullYear(), today.getMonth() + 1, 12);
  const daysLeft = Math.ceil((due.getTime() - today.getTime()) / DAY);
  if (daysLeft > 5) return null;

  return {
    id: uid([client.id, "agi_due_soon", due.toISOString().slice(0, 10)]),
    client_id: client.id,
    client_name: client.name,
    kind: "agi_due_soon",
    title: `${client.name} — AGI förfaller ${fmtDate(due)}`,
    subtitle: `Om ${daysLeft} dagar`,
    priority: "high",
    actionLabel: "Förbered AGI",
    actionHref: "/wl/app/agi",
    iconName: "FileCheck",
    iconColor: "#1D4ED8",
    ageMs: 0,
    isAIGenerated: true,
  };
}

async function buildNoBookkeeping(client: ClientLite): Promise<AutoTask | null> {
  const { data } = await supabase
    .from("journal_entries")
    .select("entry_date")
    .eq("company_id", client.id)
    .order("entry_date", { ascending: false })
    .limit(1);

  const lastDays = daysAgo((data?.[0] as any)?.entry_date);
  if (lastDays === null || lastDays <= 14) return null;

  const last = (data?.[0] as any)?.entry_date as string;

  return {
    id: uid([client.id, "no_bookkeeping"]),
    client_id: client.id,
    client_name: client.name,
    kind: "no_bookkeeping",
    title: `${client.name} — Ingen bokföring på ${lastDays} dagar`,
    subtitle: `Senaste verifikat: ${fmtDate(new Date(last))}`,
    priority: "medium",
    actionLabel: "Kontakta klient",
    actionHref: `/wl/app/clients/${client.id}`,
    iconName: "BookOpen",
    iconColor: "#94A3B8",
    ageMs: lastDays * DAY,
    isAIGenerated: true,
  };
}

export async function generateAutoTasks(
  clients: ClientLite[],
): Promise<AutoTask[]> {
  if (!clients.length) return [];

  const results = await Promise.all(
    clients.map(async (c) => {
      const [overdue, receipts, bank, bk] = await Promise.all([
        buildOverdueAR(c).catch(() => null),
        buildMissingReceipts(c).catch(() => null),
        buildStaleBankRecon(c).catch(() => null),
        buildNoBookkeeping(c).catch(() => null),
      ]);
      const vat = buildVATDueSoon(c);
      const agi = buildAGIDueSoon(c);
      return [overdue, receipts, bank, vat, agi, bk].filter(
        (x): x is AutoTask => !!x,
      );
    }),
  );

  const flat = results.flat();
  const order: Record<AutoTaskPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
  };
  return flat.sort((a, b) => order[a.priority] - order[b.priority]);
}
