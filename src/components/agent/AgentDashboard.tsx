import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Bot, Brain, Clock, AlertTriangle,
  TrendingUp, Eye, Radio, Wrench, BarChart3, CheckCircle,
  Landmark, Upload, Zap, ArrowRight, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { getAgentStats } from "@/lib/autonomous-booking-agent";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { GradientKPIStrip, KPI_GRADIENTS } from "@/components/shared/GradientKPICard";
import { AgentReviewList } from "./AgentReviewList";
import { AgentShadowMode } from "./AgentShadowMode";
import { AgentTransactionFeed } from "./AgentTransactionFeed";
import { AgentRuleEngine } from "./AgentRuleEngine";
import { AgentPerformance } from "./AgentPerformance";
import { AgentLearningCurve } from "./AgentLearningCurve";

interface AgentDashboardProps {
  companyId: string;
}

export function AgentDashboard({ companyId }: AgentDashboardProps) {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shadowMode, setShadowMode] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const data = await getAgentStats(companyId);
      setStats(data);
    } catch (err) {
      console.error("Failed to load agent stats:", err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const autoRate = stats?.autoRate || 0;
  const autoBooked = stats?.autoBooked || 0;
  const reviewNeeded = stats?.reviewNeeded || 0;
  const userFlagged = stats?.userFlagged || 0;
  const total = autoBooked + reviewNeeded + userFlagged || 1;

  const kpiCards = [
    {
      label: "Auto-bokfört",
      value: `${autoRate.toFixed(0)}%`,
      sub: `${autoBooked} av ${stats?.totalThisMonth || 0}`,
      icon: CheckCircle,
      gradient: KPI_GRADIENTS.emerald,
    },
    {
      label: "Snittkonfidens",
      value: `${((stats?.avgConfidence || 0) * 100).toFixed(0)}%`,
      sub: `${stats?.totalRules || 0} regler`,
      icon: Brain,
      gradient: KPI_GRADIENTS.indigo,
    },
    {
      label: "Tid sparad",
      value: `~${stats?.timeSavedHours || 0}h`,
      sub: "2 min/transaktion",
      icon: Clock,
      gradient: KPI_GRADIENTS.cyan,
    },
    {
      label: "Korrigeringar",
      value: `${stats?.corrected || 0}`,
      sub: `+${stats?.newRulesThisMonth || 0} nya regler`,
      icon: TrendingUp,
      gradient: KPI_GRADIENTS.amber,
    },
  ];

  const greenPct = (autoBooked / total) * 100;
  const yellowPct = (reviewNeeded / total) * 100;
  const redPct = (userFlagged / total) * 100;

  const totalActivity = autoBooked + reviewNeeded + userFlagged;
  const isInactive = totalActivity === 0;

  return (
    <div className="space-y-6 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-950/20 dark:to-transparent -mx-4 px-4 -mt-4 pt-4 rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            Autonom Bokföringsagent
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Produktionsgrad AI-motor för automatisk kontering, regelinlärning och revision
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border-[0.5px] border-[#E2E8F0] rounded-[10px] px-3 py-2 bg-white">
            <span className="text-[11px] font-medium text-[#475569] mr-1">Läge:</span>
            <Switch
              checked={shadowMode}
              onCheckedChange={setShadowMode}
              className="data-[state=checked]:bg-[#94A3B8] data-[state=unchecked]:bg-[#0B4F6C]"
            />
            <span className="text-[12px] font-medium min-w-[100px] text-[#0F172A]">
              {shadowMode ? (
                <span className="flex items-center gap-1.5 text-[#475569]">
                  <Eye className="h-3.5 w-3.5" /> Skuggläge
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1D9E75] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#1D9E75]" />
                  </span>
                  Aktiv
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {isInactive ? (
        // ============ ACTIVATION HERO (empty state) ============
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border p-8 md:p-10",
            isDark
              ? "bg-[#0F1F3D] border-slate-800 shadow-[0_8px_40px_-12px_rgba(8,145,178,0.3)]"
              : "bg-gradient-to-br from-cyan-50/60 via-white to-white border-slate-200 shadow-[0_8px_40px_-16px_rgba(8,145,178,0.18)]"
          )}
        >
          <div className={cn(
            "absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl pointer-events-none",
            isDark ? "bg-[#EFF6FF]" : "bg-[#EFF6FF]"
          )} />
          <div className="absolute top-0 left-0 w-1 h-full bg-[#0F1F3D]" />

          <div className="relative grid md:grid-cols-[1.1fr,1fr] gap-10 items-start">
            {/* Left: value prop */}
            <div>
              <div className="inline-flex items-center gap-2 px-[10px] py-[3px] rounded-full bg-[#E1F5EE] border-[0.5px] border-[#5DCAA5] mb-5">
                <span className="w-[6px] h-[6px] rounded-full bg-[#1D9E75]" />
                <span className="text-[10px] font-medium tracking-wide text-[#085041]">REDO ATT TA ÖVER DIN BOKFÖRING</span>
              </div>
              <h2 className={cn(
                "text-3xl md:text-4xl font-bold mb-3 tracking-tight",
                isDark ? "text-white" : "text-slate-900"
              )}>
                AI bokför upp till 95% automatiskt
              </h2>
              <p className={cn(
                "text-base mb-2 leading-relaxed",
                isDark ? "text-slate-300" : "text-slate-600"
              )}>
                Sparar 40+ timmar per bolag och månad. Du granskar bara det som behöver din uppmärksamhet.
              </p>
              <p className={cn(
                "text-sm mb-7",
                isDark ? "text-slate-500" : "text-slate-500"
              )}>
                Tre steg och du är igång — agenten lär sig av varje verifikat.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Button
                  onClick={() => navigate('/bankintegration')}
                  className="h-[38px] px-[16px] rounded-[8px] bg-[#0B4F6C] hover:bg-[#1074A0] text-[#E6F4FA] text-[12px] font-medium"
                >
                  <Sparkles className="h-4 w-4 mr-1.5" />Aktivera autopilot
                </Button>
                <button
                  type="button"
                  className="text-[12px] text-[#0B4F6C] hover:underline cursor-pointer bg-transparent border-0 p-0"
                >
                  Hur fungerar det? →
                </button>
              </div>
            </div>

            {/* Right: 3-step onboarding */}
            <div className="space-y-3">
              <p className={cn(
                "text-[11px] uppercase tracking-wider mb-3 font-medium",
                isDark ? "text-slate-500" : "text-slate-500"
              )}>Aktiveringsflöde</p>
              <OnboardingStep isDark={isDark} num={1} icon={Landmark} title="Koppla bank" sub="PSD2 — säker anslutning på 2 minuter" cta="Anslut →" onClick={() => navigate('/bankintegration')} />
              <OnboardingStep isDark={isDark} num={2} icon={Upload} title="Ladda upp underlag" sub="AI extraherar och konterar automatiskt" cta="Ladda upp →" onClick={() => navigate('/dokument')} />
              <OnboardingStep isDark={isDark} num={3} icon={Zap} title="Aktivera autopilot" sub="Agenten bokför vid ≥95% konfidens" cta="Aktivera →" onClick={() => setShadowMode(false)} />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Gradient KPI Strip */}
          <GradientKPIStrip cards={kpiCards} columns={4} />

          {/* Live Confidence Distribution Bar */}
          <Card className="overflow-hidden">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3b82f6] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3b82f6]" />
                  </span>
                  AI-konfidensfördelning — Live
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" /> Auto ≥92%</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" /> Granska 60-92%</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" /> Flaggad &lt;60%</span>
                </div>
              </div>
              <div className="h-4 rounded-full overflow-hidden flex bg-muted/30">
                <div className="bg-[#22c55e] transition-all duration-700 rounded-l-full" style={{ width: `${greenPct}%` }} />
                <div className="bg-[#f59e0b] transition-all duration-700" style={{ width: `${yellowPct}%` }} />
                <div className="bg-[#ef4444] transition-all duration-700 rounded-r-full" style={{ width: `${redPct}%` }} />
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>{autoBooked} auto</span>
                <span>{reviewNeeded} granska</span>
                <span>{userFlagged} flaggad</span>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Underline Tabs */}
      <Tabs defaultValue={shadowMode ? "shadow" : "feed"}>
        <TabsList className="flex-wrap h-auto gap-0 rounded-none bg-transparent p-0 border-b border-[#E2E8F0] w-full justify-start">
          {shadowMode && (
            <TabsTrigger value="shadow" className="gap-1.5 rounded-none bg-transparent text-[12px] text-[#475569] border-b-2 border-transparent px-[14px] py-[8px] -mb-px data-[state=active]:bg-transparent data-[state=active]:text-[#0B4F6C] data-[state=active]:font-medium data-[state=active]:border-[#0B4F6C] data-[state=active]:shadow-none">
              <Eye className="h-4 w-4" /> Skuggläge
            </TabsTrigger>
          )}
          <TabsTrigger value="feed" className="gap-1.5 rounded-none bg-transparent text-[12px] text-[#475569] border-b-2 border-transparent px-[14px] py-[8px] -mb-px data-[state=active]:bg-transparent data-[state=active]:text-[#0B4F6C] data-[state=active]:font-medium data-[state=active]:border-[#0B4F6C] data-[state=active]:shadow-none">
            <Radio className="h-4 w-4" /> Transaktioner
          </TabsTrigger>
          <TabsTrigger value="review" className="gap-1.5 rounded-none bg-transparent text-[12px] text-[#475569] border-b-2 border-transparent px-[14px] py-[8px] -mb-px data-[state=active]:bg-transparent data-[state=active]:text-[#0B4F6C] data-[state=active]:font-medium data-[state=active]:border-[#0B4F6C] data-[state=active]:shadow-none">
            <CheckCircle className="h-4 w-4" /> Granskning
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1.5 rounded-none bg-transparent text-[12px] text-[#475569] border-b-2 border-transparent px-[14px] py-[8px] -mb-px data-[state=active]:bg-transparent data-[state=active]:text-[#0B4F6C] data-[state=active]:font-medium data-[state=active]:border-[#0B4F6C] data-[state=active]:shadow-none">
            <Wrench className="h-4 w-4" /> Bokföringsregler
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-1.5 rounded-none bg-transparent text-[12px] text-[#475569] border-b-2 border-transparent px-[14px] py-[8px] -mb-px data-[state=active]:bg-transparent data-[state=active]:text-[#0B4F6C] data-[state=active]:font-medium data-[state=active]:border-[#0B4F6C] data-[state=active]:shadow-none">
            <BarChart3 className="h-4 w-4" /> Prestanda
          </TabsTrigger>
          <TabsTrigger value="learning" className="gap-1.5 rounded-none bg-transparent text-[12px] text-[#475569] border-b-2 border-transparent px-[14px] py-[8px] -mb-px data-[state=active]:bg-transparent data-[state=active]:text-[#0B4F6C] data-[state=active]:font-medium data-[state=active]:border-[#0B4F6C] data-[state=active]:shadow-none">
            <TrendingUp className="h-4 w-4" /> Inlärning
          </TabsTrigger>
        </TabsList>

        {shadowMode && (
          <TabsContent value="shadow" className="mt-4">
            <AgentShadowMode companyId={companyId} />
          </TabsContent>
        )}

        <TabsContent value="feed" className="mt-4">
          <AgentTransactionFeed companyId={companyId} />
        </TabsContent>

        <TabsContent value="review" className="mt-4">
          <AgentReviewList companyId={companyId} onAction={loadStats} />
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <AgentRuleEngine companyId={companyId} />
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <AgentPerformance companyId={companyId} stats={stats} />
        </TabsContent>

        <TabsContent value="learning" className="mt-4">
          <AgentLearningCurve companyId={companyId} history={stats?.history || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OnboardingStep({
  num, icon: Icon, title, sub, cta, onClick, isDark = true,
}: { num: number; icon: any; title: string; sub: string; cta: string; onClick: () => void; isDark?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full group relative overflow-hidden flex items-center gap-3 p-[12px] rounded-[12px] border-[0.5px] transition-all text-left",
        isDark
          ? "bg-white/[0.06] border-white/[0.10] hover:bg-white/[0.10]"
          : "bg-white border-[#E2E8F0] hover:bg-[#F8FAFB]"
      )}
    >
      {!isDark && <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-[#0B4F6C]" />}
      <div className="relative shrink-0">
        <div className={cn(
          "h-9 w-9 rounded-[10px] flex items-center justify-center",
          isDark ? "bg-white/[0.08]" : "bg-[#F1F5F9]"
        )}>
          <Icon className={cn("h-4 w-4", isDark ? "text-white/60" : "text-[#475569]")} />
        </div>
        <span className="absolute -top-1.5 -left-1.5 w-[24px] h-[24px] rounded-full bg-[#0B4F6C] text-[#E6F4FA] text-[11px] font-medium flex items-center justify-center">
          {num}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-[12px] font-medium", isDark ? "text-white/80" : "text-[#0F172A]")}>{title}</p>
        <p className={cn("text-[11px]", isDark ? "text-white/40" : "text-[#94A3B8]")}>{sub}</p>
      </div>
      <span className={cn(
        "text-[11px] font-medium group-hover:translate-x-0.5 transition-transform",
        isDark ? "text-white/70" : "text-[#0B4F6C]"
      )}>{cta}</span>
    </button>
  );
}
