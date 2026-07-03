import { useEffect, useState } from "react";
import { Bot, Zap, Brain, Lightbulb, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface AutomationScoreProps {
  companyId: string;
}

export const AutomationScore = ({ companyId }: AutomationScoreProps) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEntries: 0, aiBooked: 0, avgConfidence: 0, autoApproved: 0,
    bankMatched: 0, bankTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { loadStats(); }, [companyId]);
  useEffect(() => { if (!loading) { const t = setTimeout(() => setMounted(true), 50); return () => clearTimeout(t); } }, [loading]);

  const loadStats = async () => {
    try {
      const [jeRes, bankRes] = await Promise.all([
        supabase.from("journal_entries").select("id, ai_confidence, status").eq("company_id", companyId),
        supabase.from("bank_transactions").select("id, status").eq("company_id", companyId),
      ]);
      const entries = jeRes.data || [];
      const aiBooked = entries.filter(e => e.ai_confidence && e.ai_confidence > 0);
      const highConfidence = entries.filter(e => e.ai_confidence && e.ai_confidence >= 0.9);
      const avgConf = aiBooked.length > 0 ? aiBooked.reduce((s, e) => s + (e.ai_confidence || 0), 0) / aiBooked.length : 0;
      const bankTx = bankRes.data || [];
      const bankMatched = bankTx.filter(t => t.status === "matched" || t.status === "approved").length;
      setStats({ totalEntries: entries.length, aiBooked: aiBooked.length, avgConfidence: avgConf, autoApproved: highConfidence.length, bankMatched, bankTotal: bankTx.length });
    } catch (error) { console.error("Error loading automation stats:", error); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-none border-0 overflow-hidden p-8 flex items-center justify-center">
      <div className="text-center text-muted-foreground text-sm">Laddar automatiseringsgrad...</div>
    </div>
  );

  const automationRate = stats.totalEntries > 0 ? (stats.aiBooked / stats.totalEntries) * 100 : 0;
  const matchRate = stats.bankTotal > 0 ? (stats.bankMatched / stats.bankTotal) * 100 : 0;
  const overallScore = Math.round((automationRate * 0.4 + (stats.avgConfidence * 100) * 0.3 + matchRate * 0.3));

  const getGrade = (score: number) => {
    if (score >= 90) return { label: "A", border: "border-emerald-400", bg: "from-emerald-400 to-emerald-500" };
    if (score >= 75) return { label: "B", border: "border-emerald-400", bg: "from-emerald-400 to-emerald-500" };
    if (score >= 60) return { label: "C", border: "border-[hsl(var(--brand-primary))]", bg: "from-[hsl(var(--brand-primary))] to-[hsl(var(--brand-primary))]" };
    if (score >= 40) return { label: "D", border: "border-amber-400", bg: "from-amber-400 to-amber-500" };
    return { label: "E", border: "border-red-400", bg: "from-red-400 to-red-500" };
  };

  const grade = getGrade(overallScore);

  const metrics = [
    { label: "AI-bokförda", value: automationRate, sub: `${stats.aiBooked} av ${stats.totalEntries}`, icon: Bot, iconBg: "bg-[#F1F5F9] dark:bg-violet-900/20", iconColor: "text-violet-600 dark:text-[#1E3A5F]", barColor: "from-violet-400 to-violet-500" },
    { label: "AI-konfidens", value: stats.avgConfidence * 100, sub: "Genomsnitt", icon: Brain, iconBg: "bg-[hsl(var(--brand-primary)/0.08)]", iconColor: "text-[hsl(var(--brand-primary))]", barColor: "from-[hsl(var(--brand-primary))] to-[hsl(var(--brand-primary))]" },
    { label: "Bankavstämda", value: matchRate, sub: `${stats.bankMatched} av ${stats.bankTotal}`, icon: Zap, iconBg: "bg-[#E1F5EE] dark:bg-emerald-900/20", iconColor: "text-[#085041] dark:text-[#1D9E75]", barColor: "from-emerald-400 to-emerald-500" },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-none border-0 overflow-hidden">
      {/* Dark header with grade circle */}
      <div className="bg-[#0F1F3D] px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-[#EFF6FF] rounded-xl p-2">
            <Zap className="w-5 h-5 text-[#1E3A5F]" />
          </div>
          <span className="text-white font-bold">Automatiseringsgrad</span>
        </div>
        <div className={cn("w-16 h-16 rounded-full border-4 flex items-center justify-center flex-shrink-0", grade.border)}>
          <span className="text-white font-black text-xl">{grade.label}</span>
        </div>
      </div>

      {/* Main progress */}
      <div className="px-6 py-5">
        <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest mb-3">
          Övergripande automatisering
        </p>
        <div className="relative bg-slate-100 dark:bg-slate-800 rounded-full h-5 overflow-hidden">
          <div
            className="h-full bg-[#0F1F3D] rounded-full transition-all duration-[1200ms] ease-out flex items-center justify-end pr-2"
            style={{ width: mounted ? `${Math.max(overallScore, 8)}%` : "0%" }}
          >
            {overallScore > 15 && (
              <span className="text-white font-bold text-xs">{overallScore}%</span>
            )}
          </div>
        </div>
        <p className="text-slate-400 dark:text-slate-500 text-xs text-center mt-2">
          {overallScore} av 100 möjliga automatiseringspoäng
        </p>
      </div>

      {/* Sub-metrics */}
      <div className="px-6 pb-5 space-y-3">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <div key={i} className="flex items-center gap-3">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", m.iconBg)}>
                <Icon className={cn("w-4 h-4", m.iconColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-700 dark:text-slate-300 text-sm">{m.label}</p>
                <p className="text-slate-400 text-xs">{m.sub}</p>
              </div>
              <div className="w-20 h-2 bg-slate-100 dark:bg-slate-800 rounded-full flex-shrink-0 overflow-hidden">
                <div
                  className={cn("h-full rounded-full bg-gradient-to-r", m.barColor)}
                  style={{ width: `${Math.min(100, m.value)}%` }}
                />
              </div>
              <span className="font-black text-slate-900 dark:text-slate-100 text-base w-12 text-right tabular-nums">
                {m.value.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Tips footer */}
      {overallScore < 80 && stats.totalEntries > 0 && (
        <div className="bg-[#0F1F3D] dark:from-cyan-950/30 dark:to-violet-950/30 px-6 py-4 border-t border-slate-50 dark:border-slate-800 flex items-center gap-3">
          <Lightbulb className="w-5 h-5 text-[#7A5417] flex-shrink-0" />
          <p className="text-slate-600 dark:text-slate-400 text-xs italic flex-1">
            Tips: Använd AI-bokföring och koppla banken för att höja din poäng
          </p>
          <button
            onClick={() => navigate("/automation")}
            className="text-[#3b82f6] dark:text-[#1E3A5F] font-semibold text-xs flex-shrink-0 flex items-center gap-1 hover:text-[#3b82f6] transition-colors"
          >
            Förbättra
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
