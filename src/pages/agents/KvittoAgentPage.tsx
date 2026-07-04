import { useMemo, useRef, useState } from "react";
import { Receipt, Upload, Inbox, Copy, Check } from "lucide-react";
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
import { getAgentFleetEntry } from "@/lib/ai/agentFleet";

type AcceptFrom = "all" | "specific";

interface KvittoSettings {
  acceptFrom: AcceptFrom;
  defaultAccount: string;
  receiptThreshold: number;
  parseForeignCurrency: boolean;
  createEmployeeExpense: boolean;
}

const COMPANY_SLUG = "foretag";
const RECEIPT_EMAIL = `kvitto@${COMPANY_SLUG}.cogniq.se`;

const MOCK_ACTIVITY: AgentActivityRow[] = [
  {
    id: "1",
    timestamp: new Date(Date.now() - 1000 * 60 * 8),
    description:
      "Läste kvitto från ICA Maxi · 487 kr · konterade som Representation",
    confidence: 94,
    status: "done",
  },
  {
    id: "2",
    timestamp: new Date(Date.now() - 1000 * 60 * 35),
    description:
      "Extraherade data från kvitto via e-post · väntar på godkännande",
    confidence: 71,
    status: "in_progress",
    review: {
      proposedAction: "Bokför kvitto från Espresso House som Personalrepresentation",
      reference: "Kvitto #INK-7741 · Espresso House Vasagatan",
      accountLines: [
        { account: "6072", label: "Repr., ej avdragsgill", amount: 312 },
        { account: "2641", label: "Ingående moms", amount: 0 },
        { account: "1930", label: "Företagskonto", amount: -312 },
      ],
      reasoning:
        "OCR identifierade 4 kaffe + 2 smörgåsar (312 kr). Köptidpunkt 14:32 fre, beloppet matchar månadens mönster för fikamöten. Moms 0 kr — receptet visar att representationsmoms inte är avdragsgill för enklare förtäring under 60 kr/person. Konteras på 6072 enligt din BAS-konfiguration.",
      approveLabel: "Bokförde kvitto #INK-7741",
    },
  },
  {
    id: "3",
    timestamp: new Date(Date.now() - 1000 * 60 * 90),
    description: "Identifierade dubblettkvitto från användare Anna Svensson",
    confidence: 98,
    status: "done",
  },
  {
    id: "4",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
    description: "Läste kvitto från Circle K · 612 kr · konterade som Drivmedel",
    confidence: 96,
    status: "done",
  },
  {
    id: "5",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 22),
    description: "Tolkade USD-kvitto från Amazon · valutakurs 10,42",
    confidence: 89,
    status: "corrected",
  },
];

export default function KvittoAgentPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isActive, setIsActive] = useState(true);
  const [settings, setSettings] = useState<AgentSettingsValue>({
    autonomy: "suggest",
    confidenceThreshold: 85,
  });
  const [agentSettings, setAgentSettings] = useState<KvittoSettings>({
    acceptFrom: "all",
    defaultAccount: "6991",
    receiptThreshold: 100,
    parseForeignCurrency: true,
    createEmployeeExpense: true,
  });
  const [copied, setCopied] = useState(false);

  const fleetEntry = getAgentFleetEntry("kvitto")!;
  const receiptsThisMonth = fleetEntry.totalActions;
  const autoBookedPct = Math.round((fleetEntry.autoActions / fleetEntry.totalActions) * 100);
  const avgHandlingSeconds = 8;

  const kpis: AgentKpiTile[] = useMemo(
    () => [
      {
        label: "Kvitton denna månad",
        value: receiptsThisMonth,
        comparisonLabel: "+18 mer än förra månaden",
        trend: "up",
        trendIsPositive: true,
      },
      {
        label: "Auto-konterade",
        value: `${autoBookedPct}%`,
        comparisonLabel: "+4 pp vs förra månaden",
        trend: "up",
        trendIsPositive: true,
      },
      {
        label: "Genomsnittlig handläggningstid",
        value: `${avgHandlingSeconds} sek`,
        comparisonLabel: "−3 sek vs förra månaden",
        trend: "down",
        trendIsPositive: true,
      },
    ],
    [],
  );

  const updateAgent = <K extends keyof KvittoSettings>(
    key: K,
    value: KvittoSettings[K],
  ) => setAgentSettings((s) => ({ ...s, [key]: value }));

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(RECEIPT_EMAIL);
      setCopied(true);
      toast({ title: "Kopierat", description: RECEIPT_EMAIL });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Kunde inte kopiera", variant: "destructive" });
    }
  };

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    toast({
      title: `${files.length} kvitto${files.length > 1 ? "n" : ""} uppladdat`,
      description: "Agenten börjar tolka direkt.",
    });
  };

  const agentSpecificSettings = (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-600">
          E-postadress för kvitton
        </label>
        <div className="flex max-w-md items-center gap-2">
          <Input value={RECEIPT_EMAIL} readOnly className="font-mono text-sm" />
          <Button size="sm" variant="outline" onClick={copyEmail}>
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          Vidarebefordra kvitton hit så läser agenten dem automatiskt.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-600">
          Acceptera kvitton från
        </label>
        <Select
          value={agentSettings.acceptFrom}
          onValueChange={(v) => updateAgent("acceptFrom", v as AcceptFrom)}
        >
          <SelectTrigger className="w-full max-w-md text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla användare</SelectItem>
            <SelectItem value="specific">Specifika användare</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-600">
          Standardkonto för okänd kategori
        </label>
        <Select
          value={agentSettings.defaultAccount}
          onValueChange={(v) => updateAgent("defaultAccount", v)}
        >
          <SelectTrigger className="w-full max-w-md text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6991">6991 — Övriga externa kostnader</SelectItem>
            <SelectItem value="6071">6071 — Representation, avdragsgill</SelectItem>
            <SelectItem value="5611">5611 — Drivmedel</SelectItem>
            <SelectItem value="4010">4010 — Inköp av material</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-600">
          Kräv kvitto för utlägg över (kr)
        </label>
        <Input
          type="number"
          min={0}
          step={50}
          value={agentSettings.receiptThreshold}
          onChange={(e) =>
            updateAgent(
              "receiptThreshold",
              Math.max(0, Number(e.target.value) || 0),
            )
          }
          className="w-full max-w-md text-sm tabular-nums"
        />
      </div>

      <ToggleRow
        title="Tolka utländsk valuta automatiskt"
        description="Räknar om till SEK enligt aktuell växelkurs."
        checked={agentSettings.parseForeignCurrency}
        onChange={(v) => updateAgent("parseForeignCurrency", v)}
      />
      <ToggleRow
        title="Skapa utlägg åt anställd vid kvitto från app"
        description="När en anställd laddar upp ett kvitto skapas automatiskt ett utlägg för återbetalning."
        checked={agentSettings.createEmployeeExpense}
        onChange={(v) => updateAgent("createEmployeeExpense", v)}
      />
    </div>
  );

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        capture="environment"
        className="hidden"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <AgentLayout
        icon={Receipt}
        name="Kvittoagent"
        description="Läser kvitton från foto, e-post eller PDF — extraherar data och konterar automatiskt"
        isActive={isActive}
        isPaused={!isActive}
        onToggleActive={setIsActive}
        statusNow={
          isActive
            ? {
                state: "working",
                currentTask: "Tolkar 3 nya kvitton från e-post…",
                etaLabel: "ca 20 sek kvar",
                progress: 45,
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
              title: "Kör Kvittoagenten",
              description: "Söker efter nya kvitton i inkorgen.",
            });
          },
          onOpenFullLog: () => navigate("/ai-activity-log"),
          onTrainAgent: () => navigate("/ai-settings"),
        }}
        extraSection={
          <section>
            <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-800/60 p-4">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Kvitto-åtgärder
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Ladda upp kvitto
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/expense-claims")}
                >
                  <Inbox className="mr-1.5 h-3.5 w-3.5" />
                  Visa kvitto-inkorg
                </Button>
              </div>
            </div>
          </section>
        }
      />
    </>
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
