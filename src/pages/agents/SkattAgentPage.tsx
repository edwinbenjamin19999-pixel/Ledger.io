import { useMemo, useState } from "react";
import { Landmark, Calendar, FileEdit, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
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

type VatPeriod = "monthly" | "quarterly" | "yearly";
type VatMethod = "invoice" | "cash";

interface SkattSettings {
  vatPeriod: VatPeriod;
  vatMethod: VatMethod;
  fSkattMonthly: number;
  reminderDaysBefore: number;
  autoGenerateSkvFiles: boolean;
  directReportingApi: boolean;
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
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    description: "Förberedde momsdeklaration för april 2026 · 12 450 kr att betala",
    confidence: 98,
    status: "done",
  },
  {
    id: "2",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 9),
    description: "Flaggade transaktion med osäker momsbehandling · väntar på input",
    confidence: 58,
    status: "in_progress",
    review: {
      proposedAction:
        "Bokför konsultfaktura från tysk leverantör som omvänd skattskyldighet (RC)",
      reference: "Leverantörsfaktura LF-2026-0218 · Müller Consulting GmbH",
      accountLines: [
        { account: "4535", label: "Inköp tjänst EU, omvänd moms", amount: 14200 },
        { account: "2614", label: "Utgående moms omvänd skattskyldighet 25%", amount: -3550 },
        { account: "2645", label: "Ingående moms omvänd skattskyldighet", amount: 3550 },
        { account: "2440", label: "Leverantörsskulder", amount: -14200 },
      ],
      reasoning:
        "Säljaren har giltigt tyskt VAT-nummer (DE287654321) och tjänsten utförs på distans → reverse charge enligt ML 5 kap. 5§. Beloppet 14 200 kr (EUR 1 250 × 11,36) bokförs både som utgående och ingående moms 25%, netto effekt 0 kr. Rapporteras i moms-ruta 30 + 48 + 23.",
      approveLabel: "Bokförde med omvänd skattskyldighet",
    },
  },
  {
    id: "3",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    description: "Skickade påminnelse: F-skatt förfaller om 5 dagar",
    confidence: 100,
    status: "done",
  },
  {
    id: "4",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
    description: "Genererade SKV 4700 (moms) för mars 2026",
    confidence: 99,
    status: "done",
  },
];

export default function SkattAgentPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isActive, setIsActive] = useState(true);
  const [settings, setSettings] = useState<AgentSettingsValue>({
    autonomy: "suggest",
    confidenceThreshold: 90,
  });
  const [agentSettings, setAgentSettings] = useState<SkattSettings>({
    vatPeriod: "monthly",
    vatMethod: "invoice",
    fSkattMonthly: 8400,
    reminderDaysBefore: 5,
    autoGenerateSkvFiles: true,
    directReportingApi: false,
  });

  const nextDeadline = new Date(Date.now() + 1000 * 60 * 60 * 24 * 12);
  const nextDeadlineLabel = nextDeadline.toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
  });
  const vatThisPeriod = 12450;
  const fSkatt = agentSettings.fSkattMonthly;

  const kpis: AgentKpiTile[] = useMemo(
    () => [
      {
        label: "Nästa deadline",
        value: `${nextDeadlineLabel} · Moms`,
        comparisonLabel: "12 dagar kvar",
        trend: "flat",
      },
      {
        label: "Moms denna period",
        value: `${fmtSEK(vatThisPeriod)} att betala`,
        comparisonLabel: "Period: april 2026",
        trend: "up",
        trendIsPositive: false,
      },
      {
        label: "F-skatt månadsvis",
        value: fmtSEK(fSkatt),
        comparisonLabel: "Förfaller den 12:e varje månad",
        trend: "flat",
      },
    ],
    [nextDeadlineLabel, vatThisPeriod, fSkatt],
  );

  const updateAgent = <K extends keyof SkattSettings>(
    key: K,
    value: SkattSettings[K],
  ) => setAgentSettings((s) => ({ ...s, [key]: value }));

  const agentSpecificSettings = (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">
            Momsperiod
          </label>
          <Select
            value={agentSettings.vatPeriod}
            onValueChange={(v) => updateAgent("vatPeriod", v as VatPeriod)}
          >
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Månadsvis</SelectItem>
              <SelectItem value="quarterly">Kvartalsvis</SelectItem>
              <SelectItem value="yearly">Årlig</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">
            Momsredovisningsmetod
          </label>
          <Select
            value={agentSettings.vatMethod}
            onValueChange={(v) => updateAgent("vatMethod", v as VatMethod)}
          >
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="invoice">Faktureringsmetoden</SelectItem>
              <SelectItem value="cash">Kontantmetoden</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1 max-w-md">
        <label className="text-xs font-medium text-slate-600">
          F-skatt månadsbelopp (kr)
        </label>
        <Input
          type="number"
          min={0}
          step={100}
          value={agentSettings.fSkattMonthly}
          onChange={(e) =>
            updateAgent(
              "fSkattMonthly",
              Math.max(0, Number(e.target.value) || 0),
            )
          }
          className="text-sm tabular-nums"
        />
      </div>

      <div className="space-y-2 max-w-md">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-600">
            Skicka påminnelse före deadline
          </label>
          <span className="text-xs tabular-nums text-slate-500">
            {agentSettings.reminderDaysBefore} dagar
          </span>
        </div>
        <Slider
          min={1}
          max={14}
          step={1}
          value={[agentSettings.reminderDaysBefore]}
          onValueChange={([v]) =>
            updateAgent("reminderDaysBefore", v ?? agentSettings.reminderDaysBefore)
          }
        />
      </div>

      <ToggleRow
        title="Generera SKV-filer automatiskt"
        description="Skapar färdiga SKV 4700 (moms) och INK-filer redo för inlämning."
        checked={agentSettings.autoGenerateSkvFiles}
        onChange={(v) => updateAgent("autoGenerateSkvFiles", v)}
      />
      <ToggleRow
        title="Direktrapportering till Skatteverket via API"
        description="Skickar deklarationer direkt — kräver aktiv Skatteverket-anslutning."
        checked={agentSettings.directReportingApi}
        onChange={(v) => {
          if (v && !agentSettings.directReportingApi) {
            toast({
              title: "Anslutning krävs",
              description:
                "Anslut Skatteverket via BankID innan direktrapportering aktiveras.",
            });
          }
          updateAgent("directReportingApi", v);
        }}
        rightSlot={
          !agentSettings.directReportingApi && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/integrations")}
            >
              <Link2 className="mr-1.5 h-3.5 w-3.5" />
              Anslut
            </Button>
          )
        }
      />
    </div>
  );

  return (
    <AgentLayout
      icon={Landmark}
      name="Skatteagent"
      description="Förbereder momsdeklaration, F-skatt och inkomstdeklaration — bevakar deadlines åt dig"
      isActive={isActive}
      isPaused={!isActive}
      onToggleActive={setIsActive}
      statusNow={
        isActive
          ? {
              state: "idle",
              lastRunAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
              nextRunAt: nextDeadline,
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
            title: "Kör Skatteagenten",
            description: "Räknar om moms och kontrollerar kommande deadlines.",
          });
        },
        onOpenFullLog: () => navigate("/ai-activity-log"),
        onTrainAgent: () => navigate("/ai-settings"),
      }}
      extraSection={
        <section>
          <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-800/60 p-4">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Skatteåtgärder
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => navigate("/declaration-calendar")}>
                <Calendar className="mr-1.5 h-3.5 w-3.5" />
                Visa skattekalender
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/moms")}
              >
                <FileEdit className="mr-1.5 h-3.5 w-3.5" />
                Förbered manuell deklaration
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
  rightSlot,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {title}
        </div>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        {rightSlot}
        <Switch checked={checked} onCheckedChange={onChange} />
      </div>
    </div>
  );
}
