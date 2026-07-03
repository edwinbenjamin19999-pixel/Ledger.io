import { useMemo, useState } from "react";
import { ArrowDownToLine, FileText, Send, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { AgentLayout } from "@/components/agent-layout";
import type {
  AgentActivityRow,
  AgentKpiTile,
  AgentSettingsValue,
} from "@/components/agent-layout/types";

type Tone = "vanlig" | "professionell" | "formell";

interface ReminderLevel {
  id: 1 | 2 | 3;
  title: string;
  daysAfterDue: number;
  tone: Tone;
  requiresApproval: boolean;
  /** Level 3 always requires approval */
  approvalLocked?: boolean;
  template: string;
  autoSend: boolean;
}

interface ARSettings {
  levels: ReminderLevel[];
  interestRate: number;
  senderEmail: string;
  ccCompany: boolean;
}

const TONE_LABEL: Record<Tone, string> = {
  vanlig: "Vänlig",
  professionell: "Professionell",
  formell: "Formell",
};

const fmtSEK = (n: number) =>
  new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(n);

const MOCK_ACTIVITY: AgentActivityRow[] = [
  {
    id: "1",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    description:
      "Skickade vänlig påminnelse till Företaget AB · faktura #4521 · 14 500 kr",
    confidence: 96,
    status: "done",
  },
  {
    id: "2",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
    description:
      "Förfallen 30+ dagar: Annan Kund AB · 8 200 kr · väntar på godkännande för inkassovarsel",
    confidence: 99,
    status: "in_progress",
    review: {
      proposedAction: "Skicka inkassovarsel (steg 3) till Annan Kund AB",
      reference: "Faktura #4487 · Annan Kund AB · org 556789-1234",
      amount: 8200,
      accountLines: [
        { account: "1510", label: "Kundfordringar", amount: 8200 },
        { account: "6352", label: "Befarad kundförlust", amount: 0 },
      ],
      reasoning:
        "Förfallen 32 dagar. Två tidigare påminnelser skickade (3 + 14 dagar) utan respons. Kundens betalningshistorik visar 2 av 5 fakturor betalda i tid senaste året (snitt 18 dagars försening). Inkassovarsel följer inkassolagen (1974:182) med 8 dagars frist innan ärendet överlämnas. Lagstadgad inkassoavgift 180 kr tillkommer på nästa påminnelse.",
      approveLabel: "Inkassovarsel skickat",
    },
  },
  {
    id: "3",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 28),
    description:
      "Faktura betald: Kund AB · 25 000 kr (14 dagar efter förfallodatum)",
    confidence: 100,
    status: "done",
  },
  {
    id: "4",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
    description: "Skickade uppföljning till Designbyrån AB · faktura #4498 · 32 000 kr",
    confidence: 91,
    status: "done",
  },
];

const REFERENCE_RATE = 4.5;
const DEFAULT_INTEREST = REFERENCE_RATE + 8;

const DEFAULT_TEMPLATES: Record<1 | 2 | 3, string> = {
  1: "Hej {kund},\n\nVi vill bara påminna om faktura {fakturanr} på {belopp} som förföll {förfallodatum}. Hör av dig om något är oklart!\n\nVänliga hälsningar,\n{avsändare}",
  2: "Hej {kund},\n\nVi noterar att faktura {fakturanr} på {belopp} fortfarande är obetald sedan {förfallodatum}. Vänligen reglera fakturan inom 7 dagar.\n\nMed vänlig hälsning,\n{avsändare}",
  3: "Inkassovarsel\n\nFaktura {fakturanr} på {belopp} har förfallit {förfallodatum} och är fortsatt obetald. Om betalning ej inkommer inom 8 dagar överlämnas ärendet till inkasso enligt inkassolagen (1974:182).\n\n{avsändare}",
};

export default function ARAgentTemplatePage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isActive, setIsActive] = useState(true);
  const [settings, setSettings] = useState<AgentSettingsValue>({
    autonomy: "suggest",
    confidenceThreshold: 85,
  });
  const [agentSettings, setAgentSettings] = useState<ARSettings>({
    levels: [
      {
        id: 1,
        title: "Vänlig påminnelse",
        daysAfterDue: 3,
        tone: "vanlig",
        requiresApproval: false,
        autoSend: true,
        template: DEFAULT_TEMPLATES[1],
      },
      {
        id: 2,
        title: "Uppföljning",
        daysAfterDue: 14,
        tone: "professionell",
        requiresApproval: true,
        autoSend: false,
        template: DEFAULT_TEMPLATES[2],
      },
      {
        id: 3,
        title: "Inkassovarsel",
        daysAfterDue: 30,
        tone: "formell",
        requiresApproval: true,
        approvalLocked: true,
        autoSend: false,
        template: DEFAULT_TEMPLATES[3],
      },
    ],
    interestRate: DEFAULT_INTEREST,
    senderEmail: "ekonomi@foretag.se",
    ccCompany: true,
  });

  const outstanding = 482500;
  const overdue = 47200;
  const avgDays = 28;
  const terms = 30;
  const collected = 184300;

  const kpis: AgentKpiTile[] = useMemo(
    () => [
      {
        label: "Utestående fordringar",
        value: fmtSEK(outstanding),
        comparisonLabel: "12 öppna fakturor",
        trend: "flat",
      },
      {
        label: "Förfallna fordringar",
        value: fmtSEK(overdue),
        comparisonLabel: overdue > 0 ? "Kräver åtgärd" : "Allt i fas",
        trend: overdue > 0 ? "up" : "flat",
        trendIsPositive: !(overdue > 0),
      },
      {
        label: "Genomsnittlig betalningstid",
        value: `${avgDays} dagar`,
        comparisonLabel: `Villkor: ${terms} dagar (${avgDays - terms >= 0 ? "+" : ""}${avgDays - terms})`,
        trend: avgDays > terms ? "up" : "down",
        trendIsPositive: avgDays <= terms,
      },
      {
        label: "Indrivet denna månad",
        value: fmtSEK(collected),
        comparisonLabel: "+22 % vs förra månaden",
        trend: "up",
        trendIsPositive: true,
      },
    ],
    [],
  );

  const updateLevel = (id: 1 | 2 | 3, patch: Partial<ReminderLevel>) =>
    setAgentSettings((s) => ({
      ...s,
      levels: s.levels.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));

  const agentSpecificSettings = (
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="text-xs font-medium text-slate-600">
          Påminnelsenivåer
        </label>
        <div className="space-y-3">
          {agentSettings.levels.map((lvl) => (
            <div
              key={lvl.id}
              className="rounded-xl border border-slate-200/70 bg-slate-50/40 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-medium text-slate-900">
                  Nivå {lvl.id} — {lvl.title}
                </div>
                {lvl.approvalLocked && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-600">
                    <Lock className="h-3 w-3" /> Kräver alltid godkännande
                  </span>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <div className="text-xs text-slate-600">Dagar efter förfall</div>
                  <Input
                    type="number"
                    min={0}
                    value={lvl.daysAfterDue}
                    onChange={(e) =>
                      updateLevel(lvl.id, {
                        daysAfterDue: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="text-sm tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-slate-600">Ton</div>
                  <Select
                    value={lvl.tone}
                    onValueChange={(v) => updateLevel(lvl.id, { tone: v as Tone })}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vanlig">{TONE_LABEL.vanlig}</SelectItem>
                      <SelectItem value="professionell">
                        {TONE_LABEL.professionell}
                      </SelectItem>
                      <SelectItem value="formell">{TONE_LABEL.formell}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end justify-between gap-3 sm:flex-col sm:items-start">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-600">
                      Kräver godkännande
                    </span>
                    <Switch
                      checked={lvl.approvalLocked ? true : lvl.requiresApproval}
                      disabled={lvl.approvalLocked}
                      onCheckedChange={(v) =>
                        updateLevel(lvl.id, { requiresApproval: v })
                      }
                    />
                  </div>
                  {!lvl.approvalLocked && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-600">Auto-skicka</span>
                      <Switch
                        checked={lvl.autoSend}
                        onCheckedChange={(v) =>
                          updateLevel(lvl.id, { autoSend: v })
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-xs text-slate-600">Mall för påminnelse</div>
                <Textarea
                  rows={4}
                  value={lvl.template}
                  onChange={(e) =>
                    updateLevel(lvl.id, { template: e.target.value })
                  }
                  className="text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">
            Dröjsmålsränta (%)
          </label>
          <Input
            type="number"
            step="0.5"
            value={agentSettings.interestRate}
            onChange={(e) =>
              setAgentSettings((s) => ({
                ...s,
                interestRate: Number(e.target.value) || 0,
              }))
            }
            className="text-sm tabular-nums"
          />
          <p className="text-[11px] text-slate-500">
            Standard: referensränta {REFERENCE_RATE} % + 8 %
          </p>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">
            Avsändaradress
          </label>
          <Input
            type="email"
            value={agentSettings.senderEmail}
            onChange={(e) =>
              setAgentSettings((s) => ({ ...s, senderEmail: e.target.value }))
            }
            className="text-sm"
          />
        </div>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
            Skicka påminnelser kopia till företag
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Avsändaradressen får en CC av varje utskickad påminnelse.
          </p>
        </div>
        <Switch
          checked={agentSettings.ccCompany}
          onCheckedChange={(v) =>
            setAgentSettings((s) => ({ ...s, ccCompany: v }))
          }
        />
      </div>
    </div>
  );

  return (
    <AgentLayout
      icon={ArrowDownToLine}
      name="AR-agent"
      description="Bevakar kundfordringar och driver in betalningar — automatiska påminnelser med rätt ton vid rätt tidpunkt"
      isActive={isActive}
      isPaused={!isActive}
      onToggleActive={setIsActive}
      statusNow={
        isActive
          ? {
              state: "working",
              currentTask: "Bevakar 12 öppna fakturor och 3 förfallna…",
              etaLabel: "kontinuerligt",
              progress: 70,
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
            title: "Kör AR-agenten",
            description:
              "Söker igenom öppna fakturor och triggar påminnelser enligt regler.",
          });
        },
        onOpenFullLog: () => navigate("/ai-activity-log"),
        onTrainAgent: () => navigate("/ai-settings"),
      }}
      extraSection={
        <section>
          <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-800/60 p-4">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Kundfordringar
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => navigate("/customer-ledger")}
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Visa alla utestående fakturor
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/ar-agent")}
              >
                <Send className="mr-1.5 h-3.5 w-3.5" />
                Skicka påminnelse manuellt
              </Button>
            </div>
          </div>
        </section>
      }
    />
  );
}
