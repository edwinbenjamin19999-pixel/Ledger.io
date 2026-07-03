/**
 * /scenarios — full Scenario Workspace.
 *
 * 3-column layout: list (left) · simulation (mid) · drivers + AI (right).
 * Bottom row: compare table · vs-actual card · version history.
 */
import { useEffect, useMemo, useState, useDeferredValue } from "react";
import { useNavigate } from "react-router-dom";
import { GitBranch, Plus, Sparkles, Save, Pin, Trash2, FileDown } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { ActivationHero } from "@/components/shared/ActivationHero";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useScenarios, type SavedScenario } from "@/hooks/useScenarios";
import { useMonteCarlo } from "@/hooks/useMonteCarlo";
import { DEFAULT_DRIVERS, type BudgetDrivers } from "@/lib/budget/driverEngine";
import { runScenario, deriveKpis, diffDrivers, type DriverPatch } from "@/lib/scenarios/scenarioEngine";
import { PRESETS } from "@/lib/scenarios/aiPresets";
import { hashDriverPatch } from "@/lib/scenarios/driverHash";
import { evaluateRealism } from "@/lib/budget/realismEngine";
import { InputPanel } from "@/components/scenarios/InputPanel";
import { SimulationCenter } from "@/components/scenarios/SimulationCenter";
import { MonteCarloPanel } from "@/components/scenarios/MonteCarloPanel";
import { AIInsightsPanel } from "@/components/scenarios/AIInsightsPanel";
import { ApplyToBudgetDialog } from "@/components/scenarios/ApplyToBudgetDialog";
import { ApplyToForecastDialog } from "@/components/scenarios/ApplyToForecastDialog";
import { ScenarioCompareTable } from "@/components/scenarios/ScenarioCompareTable";
import { ScenarioVsActualCard } from "@/components/scenarios/ScenarioVsActualCard";
import { ScenarioVersionHistory } from "@/components/scenarios/ScenarioVersionHistory";
import { toast } from "sonner";
import type { ScenarioKind } from "@/lib/scenarios/aiPresets";

export default function Scenarios() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("");

  // Active scenario state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeName, setActiveName] = useState<string>("Nytt scenario");
  const [drivers, setDrivers] = useState<BudgetDrivers>(DEFAULT_DRIVERS);
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [centerTab, setCenterTab] = useState<"sim" | "mc">("sim");
  const [showApplyBudget, setShowApplyBudget] = useState(false);
  const [showApplyForecast, setShowApplyForecast] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Array<{
    name: string; description: string; kind: ScenarioKind; driverPatch: DriverPatch; rationale: string;
  }>>([]);

  // Resolve company + budget
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: companies } = await supabase
        .from("companies")
        .select("id, name")
        .eq("created_by", user.id)
        .order("created_at", { ascending: true })
        .limit(1);
      const cid = companies?.[0]?.id ?? null;
      setCompanyId(cid);
      setCompanyName(companies?.[0]?.name ?? "");
      if (!cid) return;
      const { data: budgets } = await supabase
        .from("budget_plans")
        .select("id, ai_assumptions")
        .eq("company_id", cid)
        .order("created_at", { ascending: false })
        .limit(1);
      const bid = budgets?.[0]?.id ?? null;
      setBudgetId(bid);
      const stored = (budgets?.[0]?.ai_assumptions as Record<string, unknown> | null)?.drivers as
        | BudgetDrivers
        | undefined;
      if (stored) setDrivers({ ...DEFAULT_DRIVERS, ...stored });
    })();
  }, [user]);

  const { list, save, update, remove } = useScenarios(budgetId);
  const scenarios = list.data ?? [];

  // Merge driver patch from active saved scenario
  const baseDrivers = drivers;
  const activePatch = useMemo<DriverPatch>(() => {
    if (!activeId) return {};
    const s = scenarios.find((x) => x.id === activeId);
    return ((s?.driver_patch ?? {}) as DriverPatch) || {};
  }, [activeId, scenarios]);

  const [localPatch, setLocalPatch] = useState<DriverPatch>({});
  useEffect(() => { setLocalPatch(activePatch); }, [activePatch]);

  const effectiveDrivers = useMemo<BudgetDrivers>(
    () => ({ ...baseDrivers, ...localPatch }),
    [baseDrivers, localPatch],
  );
  const deferredDrivers = useDeferredValue(effectiveDrivers);

  const result = useMemo(() => runScenario({ baseDrivers: deferredDrivers }), [deferredDrivers]);
  const kpis = useMemo(() => deriveKpis(result, null), [result]);
  const realism = useMemo(
    () => evaluateRealism(result.rr, result.br, result.kf, deferredDrivers),
    [result, deferredDrivers],
  );

  // Monte Carlo only when MC tab is active
  const mcInput = useMemo(
    () => centerTab === "mc"
      ? { drivers: deferredDrivers, seed: hashDriverPatch(localPatch as Record<string, unknown>), iterations: 500 }
      : null,
    [centerTab, deferredDrivers, localPatch],
  );
  const { result: mcResult, running: mcRunning } = useMonteCarlo(mcInput);

  // AI explanation
  const [aiInsights, setAiInsights] = useState<{ risks: string[]; opportunities: string[]; recommendation: string | null }>(
    { risks: [], opportunities: [], recommendation: null },
  );
  useEffect(() => {
    const diff = diffDrivers(baseDrivers, deferredDrivers);
    if (diff.length === 0) {
      setAiInsights({ risks: [], opportunities: [], recommendation: null });
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const baselineKpis = deriveKpis(runScenario({ baseDrivers }), null);
        const { data, error } = await supabase.functions.invoke("scenario-explain", {
          body: {
            scenarioId: activeId,
            driverHash: hashDriverPatch(localPatch as Record<string, unknown>),
            baselineKpis: baselineKpis as never,
            scenarioKpis: kpis as never,
            driverDiff: diff.map((d) => ({ key: d.key as string, base: d.base, next: d.next, pctDelta: d.pctDelta })),
          },
        });
        if (error) throw error;
        if (!ctrl.signal.aborted && data) {
          setAiInsights({
            risks: data.risks ?? [],
            opportunities: data.opportunities ?? [],
            recommendation: data.recommendation ?? null,
          });
        }
      } catch (e) {
        // Silent fail — local realism still shown
        console.warn("scenario-explain failed", e);
      }
    }, 800);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [baseDrivers, deferredDrivers, activeId, localPatch, kpis]);

  const newScenario = () => {
    setActiveId(null);
    setActiveName("Nytt scenario");
    setLocalPatch({});
    toast.info("Nytt scenario startat — justera drivers till höger");
  };

  const applyPreset = (key: string) => {
    const p = PRESETS.find((x) => x.key === key);
    if (!p) return;
    setLocalPatch(p.patch(baseDrivers));
    setActiveId(null);
    setActiveName(p.name);
  };

  const onSave = async () => {
    if (!budgetId) { toast.error("Ingen aktiv budget"); return; }
    const name = window.prompt("Namn på scenariot", activeName) ?? activeName;
    try {
      const saved = await save.mutateAsync({
        budgetId,
        name,
        kind: "custom",
        driverPatch: localPatch as Record<string, number>,
        targetKpis: {
          annualEbit: kpis.annualEbit,
          endingCash: kpis.endingCash,
          runwayMonths: kpis.runwayMonths ?? 0,
        },
      });
      setActiveId(saved.id);
      setActiveName(saved.name);
      toast.success("Scenario sparat");
    } catch (e) {
      console.error(e);
      toast.error("Kunde inte spara scenariot");
    }
  };

  const generateAISuggestions = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate-scenarios", {
        body: {
          drivers: baseDrivers as never,
          kpis: kpis as never,
          fiscalYear: new Date().getFullYear(),
        },
      });
      if (error) throw error;
      setAiSuggestions(data?.scenarios ?? []);
      toast.success(`${data?.scenarios?.length ?? 0} förslag genererade`);
    } catch (e) {
      console.error(e);
      toast.error("Kunde inte generera AI-förslag");
    } finally {
      setGenerating(false);
    }
  };

  const loadSuggestion = (s: { name: string; driverPatch: DriverPatch; kind: ScenarioKind }) => {
    setLocalPatch(s.driverPatch);
    setActiveId(null);
    setActiveName(s.name);
  };

  const deleteScenario = async (id: string) => {
    if (!window.confirm("Ta bort scenariot?")) return;
    try {
      await remove.mutateAsync(id);
      if (activeId === id) newScenario();
      toast.success("Scenariot togs bort");
    } catch { toast.error("Kunde inte ta bort"); }
  };

  const togglePin = async (s: SavedScenario) => {
    try {
      await update.mutateAsync({ id: s.id, patch: { isPinned: !s.is_pinned } });
    } catch { toast.error("Kunde inte uppdatera"); }
  };

  if (authLoading) {
    return (
      <PageLayout title="Scenarier" subtitle="Laddar…">
        <div className="text-sm text-muted-foreground">Laddar…</div>
      </PageLayout>
    );
  }

  if (!companyId) {
    return (
      <PageLayout title="Scenarier" subtitle="Simulera, jämför och tillämpa beslut">
        <ActivationHero
          icon={GitBranch}
          title="Aktivera scenarier"
          valueProp="Bygg om-frågor till siffror — testa pris, kostnader och anställningar mot din riktiga budget på sekunder."
          primaryCtaLabel="Skapa företag först"
          onPrimaryCta={() => navigate("/companies")}
        />
      </PageLayout>
    );
  }

  if (!budgetId) {
    return (
      <PageLayout title="Scenarier" subtitle="Simulera, jämför och tillämpa beslut">
        <ActivationHero
          icon={GitBranch}
          title="Skapa en budget för att börja simulera"
          valueProp="Scenariomotorn använder dina budgetdrivers som baslinje — utan budget finns inget att variera mot."
          primaryCtaLabel="Skapa budget"
          onPrimaryCta={() => navigate("/budget")}
          secondaryCtaLabel="Öppna prognos"
          onSecondaryCta={() => navigate("/forecast")}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Scenarier"
      subtitle="Simulera driver-justeringar, jämför utfall och tillämpa till budget eller prognos"
      financialOS
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/forecast")}>Öppna Prognos</Button>
          <Button size="sm" onClick={newScenario}>
            <Plus className="h-3.5 w-3.5" /> Nytt scenario
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_360px] gap-4">
        {/* LEFT: scenario list */}
        <Card className="p-4 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Scenarier</h3>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={generateAISuggestions} disabled={generating}>
              <Sparkles className="h-3 w-3 mr-1" />
              {generating ? "Genererar…" : "AI"}
            </Button>
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Förinställda</div>
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => applyPreset(p.key)}
                className="w-full text-left text-xs px-2 py-1.5 rounded-md hover:bg-muted/50 text-foreground"
              >
                {p.name}
              </button>
            ))}
          </div>

          {aiSuggestions.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-primary">AI-förslag</div>
              {aiSuggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => loadSuggestion(s)}
                  className="w-full text-left text-xs px-2 py-1.5 rounded-md hover:bg-primary/5 border border-primary/20"
                  title={s.rationale}
                >
                  <div className="font-medium text-foreground">{s.name}</div>
                  <div className="text-muted-foreground line-clamp-2">{s.description}</div>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sparade</div>
            {scenarios.length === 0 ? (
              <div className="text-xs text-muted-foreground italic">Inga sparade än.</div>
            ) : scenarios.map((s) => (
              <div
                key={s.id}
                className={`group flex items-center justify-between gap-1 text-xs px-2 py-1.5 rounded-md cursor-pointer ${
                  activeId === s.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-foreground"
                }`}
                onClick={() => { setActiveId(s.id); setActiveName(s.name); }}
              >
                <div className="min-w-0 flex-1 truncate">{s.is_pinned && "📌 "}{s.name}</div>
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePin(s); }}
                    className="p-1 hover:text-primary"
                    aria-label="Pin"
                  ><Pin className="h-3 w-3" /></button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteScenario(s.id); }}
                    className="p-1 hover:text-destructive"
                    aria-label="Delete"
                  ><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* MIDDLE: simulation */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{activeName}</h2>
              <p className="text-xs text-muted-foreground">
                {Object.keys(localPatch).length === 0
                  ? "Bas — inga driver-justeringar"
                  : `${Object.keys(localPatch).length} drivers ändrade`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={onSave}>
                <Save className="h-3.5 w-3.5 mr-1" /> Spara
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowApplyForecast(true)}>
                Tillämpa → Prognos
              </Button>
              <Button size="sm" onClick={() => setShowApplyBudget(true)}>
                Tillämpa → Budget
              </Button>
            </div>
          </div>

          <Tabs value={centerTab} onValueChange={(v) => setCenterTab(v as "sim" | "mc")}>
            <TabsList>
              <TabsTrigger value="sim">Simulering</TabsTrigger>
              <TabsTrigger value="mc">Monte Carlo</TabsTrigger>
            </TabsList>
            <TabsContent value="sim" className="mt-3">
              <SimulationCenter result={result} kpis={kpis} targetEbit={null} />
            </TabsContent>
            <TabsContent value="mc" className="mt-3">
              <MonteCarloPanel result={mcResult} running={mcRunning} />
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT: drivers + AI insights */}
        <div className="space-y-4">
          <InputPanel
            drivers={effectiveDrivers}
            baseDrivers={baseDrivers}
            mode={mode}
            onModeChange={setMode}
            onChange={(next) => {
              const patch: DriverPatch = {};
              (Object.keys(next) as (keyof BudgetDrivers)[]).forEach((k) => {
                if (next[k] !== baseDrivers[k]) patch[k] = next[k] as number;
              });
              setLocalPatch(patch);
            }}
            onReset={() => setLocalPatch({})}
          />
          <AIInsightsPanel
            realism={realism}
            risks={aiInsights.risks}
            opportunities={aiInsights.opportunities}
            recommendation={aiInsights.recommendation}
          />
        </div>
      </div>

      {/* BOTTOM ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <ScenarioCompareTable scenarios={scenarios} baseDrivers={baseDrivers} />
        <ScenarioVsActualCard scenario={scenarios.find((s) => s.id === activeId) ?? null} actuals={null} />
        <ScenarioVersionHistory
          scenarioId={activeId}
          onRestore={(patch) => setLocalPatch(patch)}
        />
      </div>

      {budgetId && (
        <ApplyToBudgetDialog
          open={showApplyBudget}
          onOpenChange={setShowApplyBudget}
          budgetId={budgetId}
          scenarioId={activeId}
          scenarioName={activeName}
          baseDrivers={baseDrivers}
          nextDrivers={effectiveDrivers}
          onApplied={() => setLocalPatch({})}
        />
      )}
      {budgetId && companyId && (
        <ApplyToForecastDialog
          open={showApplyForecast}
          onOpenChange={setShowApplyForecast}
          companyId={companyId}
          budgetId={budgetId}
          scenarioId={activeId}
          scenarioName={activeName}
          drivers={effectiveDrivers}
          result={result}
          kpis={kpis}
        />
      )}
    </PageLayout>
  );
}
