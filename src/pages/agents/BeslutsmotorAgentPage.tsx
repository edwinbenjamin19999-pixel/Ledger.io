import { useState } from "react";
import { BrainCircuit, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  useDecisionThresholds,
  type DecisionThresholdKey,
} from "@/lib/ai/decisionThresholds";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

// Thresholds live in `@/lib/ai/decisionThresholds` (single source of truth,
// read by all other agents via useDecisionThresholds / getThreshold).

const LEARNING_TREND = [
  { month: "Dec", accuracy: 82, autonomy: 54 },
  { month: "Jan", accuracy: 85, autonomy: 61 },
  { month: "Feb", accuracy: 87, autonomy: 66 },
  { month: "Mar", accuracy: 89, autonomy: 71 },
  { month: "Apr", accuracy: 91, autonomy: 76 },
  { month: "Maj", accuracy: 93, autonomy: 81 },
];

function describeAutonomy(value: number): string {
  if (value <= 30)
    return "AI föreslår allt — du fattar varje beslut själv. Inga åtgärder vidtas utan ditt godkännande.";
  if (value <= 55)
    return "AI agerar autonomt på enkel matchning (t.ex. exakta belopp) men frågar vid kontering och tolkningar.";
  if (value <= 75)
    return "Vid 70%: AI agerar autonomt på fakturamatchning och uppenbara konteringar, men frågar vid osäkerhet.";
  if (value <= 90)
    return "AI agerar autonomt på majoriteten av bokföringsbeslut. Frågar bara vid låg konfidens (<85%).";
  return "AI agerar självständigt på allt över tröskeln. Du granskar i efterhand via aktivitetsloggen.";
}

export default function BeslutsmotorAgentPage() {
  const { toast } = useToast();
  const [isActive, setIsActive] = useState(true);
  const [autonomy, setAutonomy] = useState(70);
  const { thresholds, update: updateThresholdStore, reset: resetThresholdStore } = useDecisionThresholds();
  const [learnFromCorrections, setLearnFromCorrections] = useState(true);
  const [applyToSimilar, setApplyToSimilar] = useState(true);
  const [edgeCase, setEdgeCase] = useState<"pause" | "try" | "draft">("pause");
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDefaults, setConfirmDefaults] = useState(false);

  const pill = isActive
    ? { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", label: "Aktiv" }
    : { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50 border-amber-200", label: "Pausad" };

  const updateThreshold = (key: string, value: number) =>
    updateThresholdStore(key as DecisionThresholdKey, value);

  const resetLearning = () => {
    toast({ title: "Inlärning nollställd", description: "AI börjar om från standardvikter." });
  };

  const resetDefaults = () => {
    setAutonomy(70);
    resetThresholdStore();
    setLearnFromCorrections(true);
    setApplyToSimilar(true);
    setEdgeCase("pause");
    toast({ title: "Återställt till standard", description: "Alla beslutslogikinställningar är återställda." });
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-6 space-y-6">
      {/* HEADER */}
      <header className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-start gap-4">
          <div className="rounded-xl border border-slate-200/70 bg-white p-2.5 text-[#3b82f6]">
            <BrainCircuit size={32} strokeWidth={1.6} />
          </div>
          <div>
            <h1 className="text-[20px] font-medium leading-tight text-slate-900 dark:text-slate-100">
              Beslutsmotor
            </h1>
            <p className="mt-0.5 text-[13px] text-slate-500">
              Här styr du AI:ns beslutslogik — tröskelvärden, prioriteringar och hur säker AI ska vara innan den agerar
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

      {/* SECTION 1 — GLOBALA AI-INSTÄLLNINGAR */}
      <section>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          Globala AI-inställningar
        </div>
        <div className="rounded-2xl border border-[#3b82f6]/20 bg-gradient-to-br from-[#3b82f6]/5 to-transparent p-5">
          <div className="flex items-start gap-3">
            <BrainCircuit className="h-5 w-5 text-[#3b82f6] mt-0.5" />
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                AI agerar autonomt vid konfidens ≥ {Math.round(autonomy + 20)}% — i övrigt frågar den först.
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Global autonomi-nivå: {autonomy}%. Justera nedan för att ändra hur AI fattar beslut åt dig.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — KPI */}
      <section>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          Denna månad
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiTile label="Genomsnittlig konfidens" value="93%" sub="över alla agenter" />
          <KpiTile label="Autonoma åtgärder" value="81%" sub="av totala beslut" />
          <KpiTile label="Användarens rättelser" value={12} sub="låg = väl kalibrerad" />
        </div>
      </section>

      {/* SECTION 3 — LÄRANDE ÖVER TID */}
      <section>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          Lärande över tid
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-800/60 p-4">
          <div className="w-full" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={LEARNING_TREND} margin={{ top: 12, right: 24, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="month"
                  type="category"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  padding={{ left: 16, right: 16 }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  domain={[40, 100]}
                  tickFormatter={(v) => `${v}%`}
                  width={36}
                />
                <Tooltip
                  formatter={(v: number) => `${v}%`}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="line" />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  name="Träffsäkerhet"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  isAnimationActive={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="autonomy"
                  name="Autonomi-grad"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  isAnimationActive={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-700 dark:text-slate-300">
            AI har förbättrats med <span className="font-semibold text-emerald-600">+27%</span> sedan starten.
          </div>
        </div>
      </section>

      {/* SECTION 4 — DECISION ENGINE CONTROLS */}
      <section className="space-y-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          Beslutslogik
        </div>

        {/* Global autonomy slider */}
        <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-800/60 p-5">
          <div className="mb-1 text-sm font-medium text-slate-900 dark:text-slate-100">
            Hur autonom ska AI vara?
          </div>
          <div className="mb-4 text-xs text-slate-500">
            Reglerar grundläggande beteende. Specifika tröskelvärden nedan kan finjustera per åtgärd.
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500 whitespace-nowrap">Föreslå allt</span>
            <Slider
              value={[autonomy]}
              onValueChange={([v]) => setAutonomy(v)}
              min={0}
              max={100}
              step={5}
              className="flex-1"
            />
            <span className="text-xs text-slate-500 whitespace-nowrap">Agera självständigt</span>
            <span className="w-12 text-right text-sm font-semibold text-[#3b82f6] tabular-nums">
              {autonomy}%
            </span>
          </div>
          <div className="mt-3 rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-600 dark:text-slate-300">
            {describeAutonomy(autonomy)}
          </div>
        </div>

        {/* Confidence thresholds */}
        <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-800/60 p-5">
          <div className="mb-1 text-sm font-medium text-slate-900 dark:text-slate-100">
            Tröskelvärden per åtgärd
          </div>
          <div className="mb-4 text-xs text-slate-500">
            Minsta konfidens för AI att agera utan att fråga.
          </div>
          <div className="divide-y divide-slate-100">
            {thresholds.map((t) => (
              <div key={t.key} className="flex items-center gap-4 py-3">
                <div className="w-56 text-sm text-slate-700 dark:text-slate-200">{t.label}</div>
                <Slider
                  value={[t.value]}
                  onValueChange={([v]) => updateThreshold(t.key, v)}
                  min={50}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="w-12 text-right text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {t.value}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Learning behavior */}
        <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-800/60 p-5 space-y-3">
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Inlärning</div>
          <ToggleRow
            label="Lär från mina rättelser"
            description="AI uppdaterar sina vikter när du korrigerar ett beslut."
            checked={learnFromCorrections}
            onCheckedChange={setLearnFromCorrections}
          />
          <ToggleRow
            label="Tillämpa lärdomar på liknande transaktioner"
            description="Generaliserar mönster (t.ex. samma leverantör eller belopp)."
            checked={applyToSimilar}
            onCheckedChange={setApplyToSimilar}
          />
          <div className="pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmReset(true)}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Nollställ inlärning
            </Button>
          </div>
        </div>

        {/* Edge cases */}
        <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-800/60 p-5">
          <div className="mb-1 text-sm font-medium text-slate-900 dark:text-slate-100">
            När jag är osäker, vill jag att AI...
          </div>
          <div className="mb-3 text-xs text-slate-500">
            Styr fallback-beteende vid låg konfidens.
          </div>
          <RadioGroup value={edgeCase} onValueChange={(v) => setEdgeCase(v as typeof edgeCase)}>
            <label htmlFor="ec-pause" className="flex items-start gap-3 rounded-lg border border-slate-200/70 p-3 cursor-pointer hover:bg-slate-50">
              <RadioGroupItem value="pause" id="ec-pause" className="mt-0.5" />
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Pausar och frågar mig</div>
                <div className="text-xs text-slate-500">Säkrast — inga åtgärder vid osäkerhet.</div>
              </div>
            </label>
            <label htmlFor="ec-try" className="flex items-start gap-3 rounded-lg border border-slate-200/70 p-3 cursor-pointer hover:bg-slate-50">
              <RadioGroupItem value="try" id="ec-try" className="mt-0.5" />
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Försöker ändå med låg konfidens</div>
                <div className="text-xs text-slate-500">Markeras tydligt i aktivitetsloggen för granskning.</div>
              </div>
            </label>
            <label htmlFor="ec-draft" className="flex items-start gap-3 rounded-lg border border-slate-200/70 p-3 cursor-pointer hover:bg-slate-50">
              <RadioGroupItem value="draft" id="ec-draft" className="mt-0.5" />
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Skapar utkast jag kan granska senare</div>
                <div className="text-xs text-slate-500">Bokförs som draft tills du godkänner.</div>
              </div>
            </label>
          </RadioGroup>
        </div>
      </section>

      {/* SECTION 5 — MANUAL ACTIONS */}
      <section>
        <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-800/60 p-4">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Manuella åtgärder
          </div>
          <Button
            variant="outline"
            onClick={() => setConfirmDefaults(true)}
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Återställ till standardinställningar
          </Button>
        </div>
      </section>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Nollställ all inlärning?"
        description="AI förlorar alla lärdomar från dina rättelser och börjar om från standardvikter. Detta kan inte ångras."
        confirmLabel="Nollställ"
        variant="destructive"
        onConfirm={resetLearning}
      />

      <ConfirmDialog
        open={confirmDefaults}
        onOpenChange={setConfirmDefaults}
        title="Återställ alla inställningar?"
        description="Alla tröskelvärden, autonomi och inlärningsinställningar återställs till standardvärden. Dina lärdomar bevaras."
        confirmLabel="Återställ"
        variant="warning"
        onConfirm={resetDefaults}
      />
    </div>
  );
}

function KpiTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-800/60 p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <Label className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</Label>
        <div className="mt-0.5 text-xs text-slate-500">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
