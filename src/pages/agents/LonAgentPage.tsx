import { useMemo, useState } from "react";
import { Users, Play, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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

type PayrollSystem = "visma" | "fortnox" | "hogia" | "quinyx" | "manual";

interface AccountMap {
  salaries: string;
  socialFees: string;
  taxes: string;
  vacationDebt: string;
}

interface LonSettings {
  system: PayrollSystem;
  payDay: number;
  accounts: AccountMap;
  autoVacationDebt: boolean;
  reminder3Days: boolean;
  autoAGI: boolean;
}

const fmtSEK = (n: number) =>
  new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(n);

const MOCK_ACTIVITY: AgentActivityRow[] = [
  {
    id: "1",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
    description: "Bokförde löner för maj 2026 · 5 anställda · 287 450 kr",
    confidence: 99,
    status: "done",
  },
  {
    id: "2",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
    description: "Förberedde AGI-fil för Skatteverket · 14 maj",
    confidence: 97,
    status: "done",
  },
  {
    id: "3",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 7),
    description: "Uppdaterade semesterskuld efter månadens lönekörning",
    confidence: 98,
    status: "done",
  },
  {
    id: "4",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    description: "Synkroniserade tidrapporter från Quinyx · 132 timmar",
    confidence: 92,
    status: "done",
  },
];

export default function LonAgentPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isActive, setIsActive] = useState(true);
  const [settings, setSettings] = useState<AgentSettingsValue>({
    autonomy: "suggest",
    confidenceThreshold: 90,
  });
  const [agentSettings, setAgentSettings] = useState<LonSettings>({
    system: "visma",
    payDay: 25,
    accounts: {
      salaries: "7010",
      socialFees: "7510",
      taxes: "2710",
      vacationDebt: "2920",
    },
    autoVacationDebt: true,
    reminder3Days: true,
    autoAGI: true,
  });

  const employees = 5;
  const payrollCost = 287450;
  const socialFees = Math.round(payrollCost * 0.3142);
  const vacationDebt = 142800;

  const kpis: AgentKpiTile[] = useMemo(
    () => [
      {
        label: "Anställda",
        value: employees,
        comparisonLabel: "Oförändrat",
        trend: "flat",
      },
      {
        label: "Lönekostnad denna månad",
        value: fmtSEK(payrollCost),
        comparisonLabel: "+12 400 kr vs förra månaden",
        trend: "up",
        trendIsPositive: false,
      },
      {
        label: "Arbetsgivaravgifter denna månad",
        value: fmtSEK(socialFees),
        comparisonLabel: "31,42 % av lönekostnad",
        trend: "flat",
      },
      {
        label: "Semesterskuld",
        value: fmtSEK(vacationDebt),
        comparisonLabel: "+8 200 kr vs förra månaden",
        trend: "up",
        trendIsPositive: false,
      },
    ],
    [employees, payrollCost, socialFees, vacationDebt],
  );

  const updateAgent = <K extends keyof LonSettings>(
    key: K,
    value: LonSettings[K],
  ) => setAgentSettings((s) => ({ ...s, [key]: value }));

  const updateAccount = <K extends keyof AccountMap>(
    key: K,
    value: AccountMap[K],
  ) =>
    setAgentSettings((s) => ({ ...s, accounts: { ...s.accounts, [key]: value } }));

  const agentSpecificSettings = (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-600">
          Lönesystem-integration
        </label>
        <Select
          value={agentSettings.system}
          onValueChange={(v) => updateAgent("system", v as PayrollSystem)}
        >
          <SelectTrigger className="w-full max-w-md text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="visma">Visma Lön</SelectItem>
            <SelectItem value="fortnox">Fortnox Lön</SelectItem>
            <SelectItem value="hogia">Hogia</SelectItem>
            <SelectItem value="quinyx">Quinyx</SelectItem>
            <SelectItem value="manual">Manuell</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-600">
          Lönedag i månaden
        </label>
        <Input
          type="number"
          min={1}
          max={31}
          value={agentSettings.payDay}
          onChange={(e) =>
            updateAgent(
              "payDay",
              Math.min(31, Math.max(1, Number(e.target.value) || 25)),
            )
          }
          className="w-full max-w-[120px] text-sm tabular-nums"
        />
      </div>

      <div className="space-y-3">
        <label className="text-xs font-medium text-slate-600">
          Standardkonton för lön
        </label>
        <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
          <AccountField
            label="Löner"
            hint="t.ex. 7010"
            value={agentSettings.accounts.salaries}
            onChange={(v) => updateAccount("salaries", v)}
          />
          <AccountField
            label="Sociala avgifter"
            hint="t.ex. 7510"
            value={agentSettings.accounts.socialFees}
            onChange={(v) => updateAccount("socialFees", v)}
          />
          <AccountField
            label="Personalskatter"
            hint="t.ex. 2710"
            value={agentSettings.accounts.taxes}
            onChange={(v) => updateAccount("taxes", v)}
          />
          <AccountField
            label="Semesterskuld"
            hint="t.ex. 2920"
            value={agentSettings.accounts.vacationDebt}
            onChange={(v) => updateAccount("vacationDebt", v)}
          />
        </div>
      </div>

      <ToggleRow
        title="Beräkna semesterskuld automatiskt"
        description="Uppdaterar semesterskulden efter varje lönekörning."
        checked={agentSettings.autoVacationDebt}
        onChange={(v) => updateAgent("autoVacationDebt", v)}
      />
      <ToggleRow
        title="Skicka påminnelse 3 dagar före lönedag"
        description="Notifiering till lönehanterare innan utbetalning."
        checked={agentSettings.reminder3Days}
        onChange={(v) => updateAgent("reminder3Days", v)}
      />
      <ToggleRow
        title="Generera AGI-fil automatiskt"
        description="Förbereder arbetsgivardeklaration för inlämning till Skatteverket."
        checked={agentSettings.autoAGI}
        onChange={(v) => updateAgent("autoAGI", v)}
      />
    </div>
  );

  return (
    <AgentLayout
      icon={Users}
      name="Löneagent"
      description="Bokför löner, beräknar arbetsgivaravgifter och håller semesterskuld uppdaterad"
      isActive={isActive}
      isPaused={!isActive}
      onToggleActive={setIsActive}
      statusNow={
        isActive
          ? {
              state: "idle",
              lastRunAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
              nextRunAt: new Date(
                Date.now() + 1000 * 60 * 60 * 24 * 18,
              ),
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
            title: "Kör Löneagenten",
            description: "Synkar lönesystem och kontrollerar avvikelser.",
          });
        },
        onOpenFullLog: () => navigate("/ai-activity-log"),
        onTrainAgent: () => navigate("/ai-settings"),
      }}
      extraSection={
        <section>
          <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-800/60 p-4">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Löneåtgärder
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => navigate("/payroll")}>
                <Play className="mr-1.5 h-3.5 w-3.5" />
                Kör lönekörning nu
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/hr")}
              >
                <UserCog className="mr-1.5 h-3.5 w-3.5" />
                Visa anställda
              </Button>
            </div>
          </div>
        </section>
      }
    />
  );
}

function AccountField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-slate-600">{label}</div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={hint}
        className="text-sm tabular-nums"
      />
    </div>
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
