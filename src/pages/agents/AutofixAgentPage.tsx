import { useMemo, useState } from "react";
import { Wrench, ListChecks, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { AgentLayout } from "@/components/agent-layout";
import type {
  AgentActivityRow,
  AgentKpiTile,
  AgentSettingsValue,
} from "@/components/agent-layout/types";
import { getAgentFleetEntry } from "@/lib/ai/agentFleet";

type CheckKey =
  | "unbalanced"
  | "negativeAssets"
  | "duplicates"
  | "misclassification"
  | "vatInconsistencies"
  | "periodDeviations"
  | "unusualAmounts";

interface AutofixSettings {
  checks: Record<CheckKey, boolean>;
  autoFixSafe: boolean;
  dailyEmailSummary: boolean;
  escalateCritical: boolean;
}

const CHECK_LABELS: { key: CheckKey; label: string }[] = [
  { key: "unbalanced", label: "Obalanserade verifikationer" },
  { key: "negativeAssets", label: "Negativa balanser på tillgångskonton" },
  { key: "duplicates", label: "Dubbletter (samma belopp, leverantör, datum)" },
  {
    key: "misclassification",
    label: "Felklassificeringar (kostnad på intäktskonto m.m.)",
  },
  { key: "vatInconsistencies", label: "Moms-inkonsekvenser" },
  { key: "periodDeviations", label: "Periodavvikelser (post i fel period)" },
  { key: "unusualAmounts", label: "Ovanliga belopp (3× snittet för konto/leverantör)" },
];

type Severity = "critical" | "important" | "info";

const SEVERITY_BADGE: Record<Severity, { label: string; cls: string; dot: string }> = {
  critical: {
    label: "KRITISK",
    cls: "bg-rose-50 text-[#7A1A1A] border-rose-200",
    dot: "bg-rose-500",
  },
  important: {
    label: "VIKTIGT",
    cls: "bg-amber-50 text-[#7A5417] border-amber-200",
    dot: "bg-amber-500",
  },
  info: {
    label: "INFO",
    cls: "bg-blue-50 text-[#1E3A8A] border-blue-200",
    dot: "bg-[#3b82f6]",
  },
};

function SeverityBadge({ severity }: { severity: Severity }) {
  const s = SEVERITY_BADGE[severity];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.cls}`}
    >
      <span className={`h-1 w-1 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function activityDescription(severity: Severity, text: string) {
  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      <SeverityBadge severity={severity} />
      <span className="truncate">{text}</span>
    </span>
  );
}

const MOCK_ACTIVITY: AgentActivityRow[] = [
  {
    id: "1",
    timestamp: new Date(Date.now() - 1000 * 60 * 25),
    description: activityDescription(
      "important",
      "Korrigerade dubbel bokföring av faktura #4521 (reverserade dubblett)",
    ),
    confidence: 96,
    status: "done",
  },
  {
    id: "2",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    description: activityDescription(
      "critical",
      "Flaggade: konto 1930 har negativ balans — kontrollera",
    ),
    confidence: 99,
    status: "in_progress",
    review: {
      proposedAction: "Spärra utbetalningar från 1930 tills saldot är åtgärdat",
      reference: "Konto 1930 · Företagskonto",
      amount: -12480,
      accountLines: [
        { account: "1930", label: "Företagskonto (SEB)", amount: -12480 },
      ],
      reasoning:
        "Saldo gick negativt 2026-05-29 efter att leverantörsbetalning till Telia (8 940 kr) bokfördes innan kundinbetalning från Designbyrån AB (25 000 kr, fortfarande utestående). Detta är inte tillåtet enligt BFL 5 kap. — AI rekommenderar att pausa pain.001-batchen tills inbetalning kommer in.",
      approveLabel: "Pausade utbetalningar från 1930",
    },
  },
  {
    id: "3",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
    description: activityDescription(
      "info",
      "Föreslog omklassificering: telefonkostnad bokförd på fel konto",
    ),
    confidence: 78,
    status: "in_progress",
    review: {
      proposedAction: "Flytta 1 247 kr från 6230 (Datakommunikation) → 6212 (Mobiltelefoni)",
      reference: "Verifikat V-2026-0431 · Telia Sverige AB",
      accountLines: [
        { account: "6230", label: "Datakommunikation", amount: -1247 },
        { account: "6212", label: "Mobiltelefoni", amount: 1247 },
      ],
      reasoning:
        "Fakturatexten anger ”Mobilabonnemang företag, 4 nummer”. Liknande Telia-fakturor bokförs historiskt på 6212 i 11 av 12 fall i ditt huvudbokföringsmönster. 6230 är reserverat för datatrafik/internet enligt din kontoplan.",
      approveLabel: "Omklassificerade till 6212",
    },
  },
  {
    id: "4",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    description: activityDescription(
      "important",
      "Hittade obalanserad verifikation V-2026-0118 — diff 12 kr",
    ),
    confidence: 88,
    status: "corrected",
  },
];

export default function AutofixAgentPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isActive, setIsActive] = useState(true);
  const [settings, setSettings] = useState<AgentSettingsValue>({
    autonomy: "suggest",
    confidenceThreshold: 90,
  });
  const [agentSettings, setAgentSettings] = useState<AutofixSettings>({
    checks: {
      unbalanced: true,
      negativeAssets: true,
      duplicates: true,
      misclassification: true,
      vatInconsistencies: true,
      periodDeviations: true,
      unusualAmounts: true,
    },
    autoFixSafe: false,
    dailyEmailSummary: true,
    escalateCritical: true,
  });

  const fleetEntry = getAgentFleetEntry("autofix")!;
  const found = fleetEntry.totalActions;
  const autoFixed = fleetEntry.autoActions;
  const waiting = fleetEntry.pendingReviews ?? 0;

  const kpis: AgentKpiTile[] = useMemo(
    () => [
      {
        label: "Fel hittade denna månad",
        value: found,
        comparisonLabel: "−6 vs förra månaden",
        trend: "down",
        trendIsPositive: true,
      },
      {
        label: "Auto-åtgärdade",
        value: `${autoFixed} av ${found}`,
        comparisonLabel: `${Math.round((autoFixed / found) * 100)} % av fel`,
        trend: "up",
        trendIsPositive: true,
      },
      {
        label: "Väntar på din input",
        value: waiting,
        comparisonLabel: waiting > 0 ? "Kräver beslut" : "Allt klart",
        trend: waiting > 0 ? "up" : "flat",
        trendIsPositive: !(waiting > 0),
      },
    ],
    [found, autoFixed, waiting],
  );

  const toggleCheck = (key: CheckKey) =>
    setAgentSettings((s) => ({
      ...s,
      checks: { ...s.checks, [key]: !s.checks[key] },
    }));

  const agentSpecificSettings = (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-600">
          Vad ska Autofix kontrollera?
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {CHECK_LABELS.map(({ key, label }) => (
            <label
              key={key}
              className="flex items-start gap-2 rounded-lg border border-slate-200/70 bg-slate-50/40 p-2.5 text-sm cursor-pointer"
            >
              <Checkbox
                checked={agentSettings.checks[key]}
                onCheckedChange={() => toggleCheck(key)}
                className="mt-0.5"
              />
              <span className="text-slate-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <ToggleRow
        title="Auto-åtgärda säkra fel"
        description="När av: alla fel kräver godkännande. När på: helt säkra fel åtgärdas automatiskt och loggas."
        checked={agentSettings.autoFixSafe}
        onChange={(v) =>
          setAgentSettings((s) => ({ ...s, autoFixSafe: v }))
        }
      />
      <ToggleRow
        title="Daglig sammanfattning av fel via e-post"
        description="Skickar en kort rapport varje morgon med fel som hittats senaste dygnet."
        checked={agentSettings.dailyEmailSummary}
        onChange={(v) =>
          setAgentSettings((s) => ({ ...s, dailyEmailSummary: v }))
        }
      />
      <ToggleRow
        title="Eskalera kritiska fel direkt"
        description="Notifierar dig omedelbart när ett kritiskt fel upptäcks (t.ex. negativ kassa)."
        checked={agentSettings.escalateCritical}
        onChange={(v) =>
          setAgentSettings((s) => ({ ...s, escalateCritical: v }))
        }
      />
    </div>
  );

  return (
    <AgentLayout
      icon={Wrench}
      name="Autofix"
      description="Hittar och åtgärdar fel i bokföringen — obalanserade konton, dubbletter, felklassificeringar"
      isActive={isActive}
      isPaused={!isActive}
      onToggleActive={setIsActive}
      statusNow={
        isActive
          ? {
              state: "working",
              currentTask: "Skannar 1 248 verifikationer för avvikelser…",
              etaLabel: "ca 1 min kvar",
              progress: 78,
            }
          : { state: "paused" }
      }
      kpis={kpis}
      activity={MOCK_ACTIVITY}
      settings={settings}
      onSettingsChange={setSettings}
      agentSpecificSettings={agentSpecificSettings}
      manualActions={{
        onRunNow: () => {
          toast({
            title: "Kör Autofix",
            description: "Startar en snabb genomgång av öppna perioder.",
          });
        },
        onOpenFullLog: () => navigate("/ai-activity-log"),
        onTrainAgent: () => navigate("/ai-settings"),
      }}
      extraSection={
        <section>
          <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-800/60 p-4">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Autofix-åtgärder
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  toast({
                    title: "Fullständig genomgång startad",
                    description:
                      "Skannar hela huvudboken — kan ta några minuter.",
                  });
                }}
              >
                <Play className="mr-1.5 h-3.5 w-3.5" />
                Kör fullständig genomgång nu
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/autofix")}
              >
                <ListChecks className="mr-1.5 h-3.5 w-3.5" />
                Visa alla väntande fel
              </Button>
            </div>
          </div>
        </section>
      }
    />
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {title}
        </div>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
