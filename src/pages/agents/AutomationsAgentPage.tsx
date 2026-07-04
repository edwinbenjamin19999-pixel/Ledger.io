import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Workflow,
  Plus,
  Pencil,
  Trash2,
  Library,
  Clock,
  SlidersHorizontal,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useDecisionThresholds } from "@/lib/ai/decisionThresholds";



// ----- Types -----
type TriggerKey =
  | "transaction_from_supplier"
  | "invoice_due_in_days"
  | "balance_threshold"
  | "receipt_uploaded"
  | "expense_on_account"
  | "month_close"
  | "custom_schedule";

type ConditionKey =
  | "amount_greater"
  | "amount_less"
  | "amount_between"
  | "supplier_is";

type ActionKey =
  | "post_to_account"
  | "notify_user"
  | "send_email"
  | "create_task"
  | "add_tag"
  | "periodize"
  | "pause_for_review";

interface Rule {
  id: string;
  name: string;
  active: boolean;
  trigger: TriggerKey;
  triggerValue?: string;
  condition?: ConditionKey;
  conditionValue?: string;
  actions: ActionKey[];
  actionValue?: string;
  /** Lägsta AI-konfidens (0–100) som krävs för att åtgärden ska köras automatiskt. */
  confidenceThreshold: number;
  runsThisMonth: number;
  lastRunAt?: Date;
}

interface Execution {
  id: string;
  ruleName: string;
  trigger: string;
  outcome: string;
  timestamp: Date;
}

const TRIGGER_OPTIONS: { key: TriggerKey; label: string }[] = [
  { key: "transaction_from_supplier", label: "En transaktion inkommer från [leverantör]" },
  { key: "invoice_due_in_days", label: "En faktura förfaller om [X] dagar" },
  { key: "balance_threshold", label: "Kontosaldo överstiger/understiger [belopp]" },
  { key: "receipt_uploaded", label: "Ett kvitto laddas upp av [användare]" },
  { key: "expense_on_account", label: "En kostnad bokförs på [konto]" },
  { key: "month_close", label: "Månaden stängs" },
  { key: "custom_schedule", label: "Anpassad tid: varje [dag/vecka/månad]" },
];

const CONDITION_OPTIONS: { key: ConditionKey; label: string }[] = [
  { key: "amount_greater", label: "Beloppet är större än [X]" },
  { key: "amount_less", label: "Beloppet är mindre än [X]" },
  { key: "amount_between", label: "Beloppet är mellan [X] och [Y]" },
  { key: "supplier_is", label: "Leverantören är [specifik]" },
];

const ACTION_OPTIONS: { key: ActionKey; label: string }[] = [
  { key: "post_to_account", label: "Kontera på [konto]" },
  { key: "notify_user", label: "Skicka notis till [användare]" },
  { key: "send_email", label: "Skicka e-post till [adress]" },
  { key: "create_task", label: "Skapa uppgift i Samarbete" },
  { key: "add_tag", label: "Lägg till tagg" },
  { key: "periodize", label: "Periodisera över [X] månader" },
  { key: "pause_for_review", label: "Pausa för manuell granskning" },
];

const TEMPLATES = [
  {
    name: "Periodisera alla hyresfakturor automatiskt",
    description: "När hyresfaktura inkommer från fastighetsbolag — periodisera över 12 mån.",
  },
  {
    name: "Notifiera vid kostnader över 10 000 kr",
    description: "Skickar notis till ekonomichef när en kostnad bokförs > 10 000 kr.",
  },
  {
    name: "Pausa fakturor från ny leverantör",
    description: "Första gången en leverantör dyker upp — pausa för manuell granskning.",
  },
  {
    name: "Påminnelse 5 dagar före förfall",
    description: "Skicka påminnelse till ansvarig 5 dagar innan leverantörsfaktura förfaller.",
  },
  {
    name: "Tagga alla representationskostnader",
    description: "När kostnad bokförs på 6072 — lägg till taggen 'representation'.",
  },
];

const INITIAL_RULES: Rule[] = [
  {
    id: "r1",
    name: "Periodisera SaaS-prenumerationer årsvis",
    active: true,
    trigger: "transaction_from_supplier",
    triggerValue: "Atlassian, HubSpot, Adobe",
    actions: ["periodize"],
    actionValue: "12",
    confidenceThreshold: 90,
    runsThisMonth: 14,
    lastRunAt: new Date(Date.now() - 1000 * 60 * 18),
  },
  {
    id: "r2",
    name: "Notis vid kostnader över 25 000 kr",
    active: true,
    trigger: "expense_on_account",
    triggerValue: "Alla kostnadskonton",
    condition: "amount_greater",
    conditionValue: "25000",
    actions: ["notify_user"],
    actionValue: "Anna Larsson",
    confidenceThreshold: 80,
    runsThisMonth: 6,
    lastRunAt: new Date(Date.now() - 1000 * 60 * 95),
  },
  {
    id: "r3",
    name: "Påminnelse 5 dagar före leverantörsförfall",
    active: true,
    trigger: "invoice_due_in_days",
    triggerValue: "5",
    actions: ["send_email"],
    actionValue: "ekonomi@foretaget.se",
    confidenceThreshold: 95,
    runsThisMonth: 22,
    lastRunAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
  },
  {
    id: "r4",
    name: "Pausa fakturor från okända leverantörer",
    active: false,
    trigger: "transaction_from_supplier",
    triggerValue: "Nya leverantörer",
    actions: ["pause_for_review"],
    confidenceThreshold: 70,
    runsThisMonth: 0,
  },
  {
    id: "r5",
    name: "Tagga representation automatiskt",
    active: true,
    trigger: "expense_on_account",
    triggerValue: "6072",
    actions: ["add_tag"],
    actionValue: "representation",
    confidenceThreshold: 85,
    runsThisMonth: 9,
    lastRunAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
  },
];

const INITIAL_EXECUTIONS: Execution[] = [
  {
    id: "e1",
    ruleName: "Periodisera SaaS-prenumerationer årsvis",
    trigger: "Faktura från Atlassian · 14 988 kr",
    outcome: "Periodiserade över 12 månader (1 249 kr/mån)",
    timestamp: new Date(Date.now() - 1000 * 60 * 18),
  },
  {
    id: "e2",
    ruleName: "Notis vid kostnader över 25 000 kr",
    trigger: "Konsultarvode bokfört · 42 000 kr",
    outcome: "Notis skickad till Anna Larsson",
    timestamp: new Date(Date.now() - 1000 * 60 * 95),
  },
  {
    id: "e3",
    ruleName: "Tagga representation automatiskt",
    trigger: "Restaurangkvitto bokfört på 6072",
    outcome: "Taggen 'representation' tillagd",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
  },
  {
    id: "e4",
    ruleName: "Påminnelse 5 dagar före leverantörsförfall",
    trigger: "Faktura #8821 förfaller 19 maj",
    outcome: "E-post skickad till ekonomi@foretaget.se",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
  },
  {
    id: "e5",
    ruleName: "Periodisera SaaS-prenumerationer årsvis",
    trigger: "Faktura från HubSpot · 9 600 kr",
    outcome: "Periodiserade över 12 månader (800 kr/mån)",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 22),
  },
];

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "nyss";
  if (min < 60) return `${min} min sedan`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h sedan`;
  const d = Math.floor(h / 24);
  return `${d} d sedan`;
}

const triggerLabel = (k: TriggerKey) =>
  TRIGGER_OPTIONS.find((t) => t.key === k)?.label ?? k;

export default function AutomationsAgentPage() {
  const { toast } = useToast();
  const [isActive, setIsActive] = useState(true);
  const [rules, setRules] = useState<Rule[]>(INITIAL_RULES);
  const [executions] = useState<Execution[]>(INITIAL_EXECUTIONS);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  // Subscribe so threshold pills re-render when user edits in Beslutsmotor.
  useDecisionThresholds();

  const activeRules = rules.filter((r) => r.active);
  const totalRuns = rules.reduce((s, r) => s + r.runsThisMonth, 0);
  const mostUsed = useMemo(
    () =>
      [...rules].sort((a, b) => b.runsThisMonth - a.runsThisMonth)[0]?.name ??
      "—",
    [rules],
  );

  const pillState: "active" | "paused" = isActive ? "active" : "paused";
  const pill = {
    active: { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", label: "Aktiv" },
    paused: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50 border-amber-200", label: "Pausad" },
  }[pillState];

  const toggleRule = (id: string) =>
    setRules((rs) =>
      rs.map((r) => (r.id === id ? { ...r, active: !r.active } : r)),
    );

  const deleteRule = (id: string) => {
    setRules((rs) => rs.filter((r) => r.id !== id));
    toast({ title: "Regel borttagen" });
  };

  const saveRule = (rule: Rule) => {
    setRules((rs) => {
      const exists = rs.some((r) => r.id === rule.id);
      return exists ? rs.map((r) => (r.id === rule.id ? rule : r)) : [...rs, rule];
    });
    setEditing(null);
    setIsCreating(false);
    toast({ title: "Regel sparad" });
  };

  const openCreate = () => {
    setEditing({
      id: `r${Date.now()}`,
      name: "",
      active: true,
      trigger: "transaction_from_supplier",
      triggerValue: "",
      actions: [],
      confidenceThreshold: 85,
      runsThisMonth: 0,
    });
    setIsCreating(true);
  };

  const useTemplate = (name: string, description: string) => {
    setTemplatesOpen(false);
    setEditing({
      id: `r${Date.now()}`,
      name,
      active: true,
      trigger: "transaction_from_supplier",
      triggerValue: description,
      actions: ["periodize"],
      confidenceThreshold: 85,
      runsThisMonth: 0,
    });
    setIsCreating(true);
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-6 space-y-6">
      {/* HEADER */}
      <header className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-start gap-4">
          <div className="rounded-xl border border-slate-200/70 bg-white p-2.5 text-[#3b82f6]">
            <Workflow size={32} strokeWidth={1.6} />
          </div>
          <div>
            <h1 className="text-[20px] font-medium leading-tight text-slate-900 dark:text-slate-100">
              Automatiseringar
            </h1>
            <p className="mt-0.5 text-[13px] text-slate-500">
              Skapa egna regler — om X händer, gör Y automatiskt
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
              pill.bg,
              pill.text,
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", pill.dot)} />
            {pill.label}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{isActive ? "På" : "Av"}</span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
      </header>

      {/* SECTION 1 removed — merged into Regler list below */}

      {/* SECTION 2 — KPI */}
      <section>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          Denna månad
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiTile label="Aktiva regler" value={activeRules.length} />
          <KpiTile
            label="Utförda denna månad"
            value={totalRuns}
            sub="åtgärder triggade"
          />
          <KpiTile label="Mest använda regel" value={mostUsed} small />
        </div>
      </section>

      {/* SECTION 3 — SENASTE UTFÖRDA REGLER */}
      <section>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          Senaste utförda regler
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-800/60 divide-y divide-slate-100">
          {executions.map((e) => (
            <div key={e.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {e.ruleName}
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap">
                  <Clock className="h-3 w-3" />
                  {formatRelative(e.timestamp)}
                </div>
              </div>
              <div className="mt-1 text-xs text-slate-600">
                <span className="text-slate-400">Trigger:</span> {e.trigger}
                <span className="mx-2 text-slate-300">·</span>
                <span className="text-slate-400">Resultat:</span> {e.outcome}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4 — RULES BUILDER */}
      <section>
        <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-800/60 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Regler
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              Skapa ny regel
            </Button>
          </div>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/70">
            {rules.length === 0 && (
              <div className="p-4 text-sm text-slate-500">
                Inga regler ännu — skapa din första.
              </div>
            )}
            {rules.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Switch
                    checked={r.active}
                    onCheckedChange={() => toggleRule(r.id)}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {r.name || "Namnlös regel"}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {triggerLabel(r.trigger)}
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span className="tabular-nums">konfidens ≥ {r.confidenceThreshold}%</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span>
                        Senast körd: {r.lastRunAt ? formatRelative(r.lastRunAt) : "—"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(r);
                      setIsCreating(false);
                    }}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Redigera
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteRule(r.id)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Ta bort
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5 — TEMPLATES BUTTON */}
      <section>
        <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-800/60 p-4">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Bibliotek
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTemplatesOpen(true)}
          >
            <Library className="mr-1.5 h-3.5 w-3.5" />
            Mallar för automatiseringar
          </Button>
        </div>
      </section>

      {/* RULE BUILDER DIALOG */}
      <Dialog
        open={editing !== null}
        onOpenChange={(o) => {
          if (!o) {
            setEditing(null);
            setIsCreating(false);
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {isCreating ? "Skapa ny regel" : "Redigera regel"}
            </DialogTitle>
            <DialogDescription>
              Definiera när regeln ska köras, eventuella villkor och vad som ska
              hända.
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <RuleBuilderForm
              rule={editing}
              onChange={setEditing}
              onSave={() => saveRule(editing)}
              onCancel={() => {
                setEditing(null);
                setIsCreating(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* TEMPLATES DIALOG */}
      <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Mallar för automatiseringar</DialogTitle>
            <DialogDescription>
              Välj en mall för att snabbt komma igång — du kan justera den
              efteråt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.name}
                onClick={() => useTemplate(t.name, t.description)}
                className="block w-full rounded-xl border border-slate-200/70 bg-slate-50/40 p-3 text-left hover:bg-slate-100 transition"
              >
                <div className="text-sm font-medium text-slate-900">
                  {t.name}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {t.description}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- KPI tile ----
function KpiTile({
  label,
  value,
  sub,
  small,
}: {
  label: string;
  value: string | number;
  sub?: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-800/60 p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-medium text-slate-900 dark:text-slate-100 tabular-nums",
          small ? "text-base" : "text-2xl",
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

// ---- Rule Builder Form ----
function RuleBuilderForm({
  rule,
  onChange,
  onSave,
  onCancel,
}: {
  rule: Rule;
  onChange: (r: Rule) => void;
  onSave: () => void;
  onCancel: () => void;
}) {

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-slate-600">
          Namn på regeln
        </label>
        <Input
          value={rule.name}
          onChange={(e) => onChange({ ...rule, name: e.target.value })}
          placeholder="T.ex. Periodisera hyresfakturor"
          className="mt-1"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600">NÄR</label>
        <Select
          value={rule.trigger}
          onValueChange={(v) => onChange({ ...rule, trigger: v as TriggerKey })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRIGGER_OPTIONS.map((t) => (
              <SelectItem key={t.key} value={t.key}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={rule.triggerValue ?? ""}
          onChange={(e) => onChange({ ...rule, triggerValue: e.target.value })}
          placeholder="Värde (t.ex. leverantör, antal dagar, belopp)"
          className="mt-2"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600">GÖR</label>
        <Select
          value={rule.actions[0] ?? ""}
          onValueChange={(v) =>
            onChange({ ...rule, actions: [v as ActionKey] })
          }
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Välj åtgärd" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_OPTIONS.map((a) => (
              <SelectItem key={a.key} value={a.key}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={rule.actionValue ?? ""}
          onChange={(e) => onChange({ ...rule, actionValue: e.target.value })}
          placeholder="Detaljer för åtgärd (t.ex. konto, mottagare, antal månader)"
          className="mt-2"
        />
      </div>

      <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 dark:bg-slate-800/40 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Konfidenströskel
          </div>
          <div className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {rule.confidenceThreshold}%
          </div>
        </div>
        <Slider
          value={[rule.confidenceThreshold]}
          min={50}
          max={100}
          step={1}
          onValueChange={([v]) =>
            onChange({ ...rule, confidenceThreshold: v })
          }
          className="mt-3"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Minsta AI-konfidens för att åtgärden ska köras automatiskt.
          </p>
          <Link
            to="/agents/beslutsmotor"
            className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900"
          >
            <SlidersHorizontal className="h-3 w-3" />
            Globala trösklar
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>




      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Avbryt
        </Button>
        <Button onClick={onSave} disabled={!rule.name.trim()}>
          Spara regel
        </Button>
      </DialogFooter>
    </div>
  );
}
