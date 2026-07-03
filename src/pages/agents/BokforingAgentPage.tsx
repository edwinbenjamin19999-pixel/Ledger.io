import { useMemo, useState } from "react";
import { BookOpen, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { getAgentFleetEntry } from "@/lib/ai/agentFleet";

type ChartOfAccounts = "bas-2024" | "bas-k" | "custom";

interface BokforingSettings {
  chartOfAccounts: ChartOfAccounts;
  autoMatchSupplierInvoices: boolean;
  autoCreateVoucher: boolean;
  periodizeCosts: boolean;
  autoCurrencyConversion: boolean;
}

const MOCK_ACTIVITY: AgentActivityRow[] = [
  {
    id: "1",
    timestamp: new Date(Date.now() - 1000 * 60 * 12),
    description: "Konterade Telia 1 245 kr på 6212 Telefon & internet",
    confidence: 97,
    status: "done",
  },
  {
    id: "2",
    timestamp: new Date(Date.now() - 1000 * 60 * 47),
    description:
      "Matchade banktransaktion mot leverantörsfaktura #4521 från Företaget AB",
    confidence: 92,
    status: "done",
  },
  {
    id: "3",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    description: "Skapade verifikation V-2026-0142 för månadens hyra",
    confidence: 99,
    status: "done",
  },
  {
    id: "4",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    description: "Konterade Spotify 119 kr på 6540 IT-tjänster",
    confidence: 88,
    status: "done",
  },
  {
    id: "5",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
    description:
      "Föreslog kontering för okänd leverantör — väntar på godkännande",
    confidence: 64,
    status: "in_progress",
  },
  {
    id: "6",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26),
    description: "Konterade SL månadskort 970 kr på 5611 Resekostnader",
    confidence: 81,
    status: "corrected",
  },
];

export default function BokforingAgentPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isActive, setIsActive] = useState(true);
  const [settings, setSettings] = useState<AgentSettingsValue>({
    autonomy: "suggest",
    confidenceThreshold: 85,
  });
  const [agentSettings, setAgentSettings] = useState<BokforingSettings>({
    chartOfAccounts: "bas-2024",
    autoMatchSupplierInvoices: true,
    autoCreateVoucher: true,
    periodizeCosts: false,
    autoCurrencyConversion: true,
  });

  const fleetEntry = getAgentFleetEntry("bokforing")!;
  const bookedThisMonth = fleetEntry.totalActions;
  const accuracy = Math.round(fleetEntry.avgConfidence * 100);
  const accuracyDelta = 2;
  const timeSavedHours = Math.round((bookedThisMonth * 3) / 60);

  const kpis: AgentKpiTile[] = useMemo(
    () => [
      {
        label: "Konterade denna månad",
        value: `${bookedThisMonth} transaktioner`,
        comparisonLabel: "+34 mer än förra månaden",
        trend: "up",
        trendIsPositive: true,
      },
      {
        label: "Träffsäkerhet",
        value: `${accuracy}%`,
        comparisonLabel: `+${accuracyDelta} pp vs förra månaden`,
        trend: "up",
        trendIsPositive: true,
      },
      {
        label: "Tidsbesparing",
        value: `${timeSavedHours} timmar`,
        comparisonLabel: "≈ 3 min per transaktion",
        trend: "flat",
      },
    ],
    [bookedThisMonth, accuracy, accuracyDelta, timeSavedHours],
  );

  const updateAgent = <K extends keyof BokforingSettings>(
    key: K,
    value: BokforingSettings[K],
  ) => {
    setAgentSettings((s) => {
      const next = { ...s, [key]: value };
      if (key === "periodizeCosts" && value === false) {
        toast({
          title: "Periodisering avstängd",
          description:
            "Agenten skickar förslag till dig för bekräftelse innan periodisering tillämpas.",
        });
      }
      return next;
    });
  };

  const agentSpecificSettings = (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-600">
          Standardkontoplan
        </label>
        <Select
          value={agentSettings.chartOfAccounts}
          onValueChange={(v) =>
            updateAgent("chartOfAccounts", v as ChartOfAccounts)
          }
        >
          <SelectTrigger className="w-full max-w-md text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bas-2024">BAS 2024</SelectItem>
            <SelectItem value="bas-k">BAS-K</SelectItem>
            <SelectItem value="custom">Anpassad</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ToggleRow
        title="Auto-matchning av leverantörsfakturor"
        description="Matchar automatiskt banktransaktioner mot öppna leverantörsfakturor."
        checked={agentSettings.autoMatchSupplierInvoices}
        onChange={(v) => updateAgent("autoMatchSupplierInvoices", v)}
      />
      <ToggleRow
        title="Skapa automatiskt verifikat efter matchning"
        description="När en banktransaktion matchas skapas verifikatet direkt."
        checked={agentSettings.autoCreateVoucher}
        onChange={(v) => updateAgent("autoCreateVoucher", v)}
      />
      <ToggleRow
        title="Periodisera kostnader över flera månader"
        description="När avstängd skickas förslag till dig för bekräftelse innan periodisering."
        checked={agentSettings.periodizeCosts}
        onChange={(v) => updateAgent("periodizeCosts", v)}
      />
      <ToggleRow
        title="Hantera valutaomräkning automatiskt"
        description="Räknar om transaktioner i utländsk valuta enligt aktuell kurs."
        checked={agentSettings.autoCurrencyConversion}
        onChange={(v) => updateAgent("autoCurrencyConversion", v)}
      />
    </div>
  );

  return (
    <AgentLayout
      icon={BookOpen}
      name="Bokföringsagent"
      description="Matchar bankposter, konterar transaktioner och skapar verifikationer automatiskt"
      isActive={isActive}
      isPaused={!isActive}
      onToggleActive={setIsActive}
      statusNow={
        isActive
          ? {
              state: "working",
              currentTask: "Matchar 14 banktransaktioner mot fakturor…",
              etaLabel: "ca 2 min kvar",
              progress: 62,
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
            title: "Kör Bokföringsagenten",
            description: "Agenten startar en ny körning nu.",
          });
        },
        onOpenFullLog: () => navigate("/ai-activity-log"),
        onTrainAgent: () => navigate("/ai-settings"),
      }}
      extraSection={
        <section>
          <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-800/60 p-4">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Importera data
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/migration")}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Importera transaktioner
              </Button>
              <span className="text-xs text-slate-500">
                Ladda upp SIE- eller CSV-fil för manuell import.
              </span>
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
