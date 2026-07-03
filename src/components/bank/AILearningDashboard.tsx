import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, TrendingUp, AlertTriangle, BarChart3, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

interface RejectedMatch { id: string;
  booking_date: string;
  amount: number;
  counterparty_name: string | null;
  description: string | null;
  ai_explanation: string | null;
  rejection_reason: string | null;
  ai_model_version: string | null;
}

interface LearningPattern { pattern: string;
  suggested_account: string;
  correction_count: number;
}

interface Props { companyId: string;
}
const REASON_LABELS: Record<string, string> = { wrong_account: "Fel konto",
  wrong_amount: "Fel belopp",
  wrong_counterparty: "Fel motpart",
  duplicate: "Dubblett",
  other: "Annat",
};

function reasonLabel(reason: string): string { const key = reason.split(":")[0].trim();
  return REASON_LABELS[key] || reason;
}

export function AILearningDashboard({ companyId }: Props) { const [recentResets, setRecentResets] = useState<RejectedMatch[]>([]);
  const [patterns, setPatterns] = useState<LearningPattern[]>([]);
  const [stats, setStats] = useState({ total: 0, matched: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll();
  }, [companyId]);

  const loadAll = async () => { setLoading(true);
    const [resetsRes, patternsRes, statsRes] = await Promise.all([
      // Transactions with rejection_reason set (rejected matches)
      supabase
        .from("bank_transactions")
        .select("id, booking_date, amount, counterparty_name, description, ai_explanation, rejection_reason, ai_model_version")
        .eq("company_id", companyId)
        .eq("status", "pending")
        .not("rejection_reason", "is", null)
        .order("booking_date", { ascending: false })
        .limit(20),
      // AI learning patterns from feedback table
      supabase.rpc("get_ai_learning_data", { _company_id: companyId, _limit: 10 }),
      // Aggregate stats
      supabase
        .from("bank_transactions")
        .select("status", { count: "exact" })
        .eq("company_id", companyId),
    ]);

    setRecentResets((resetsRes.data as RejectedMatch[]) || []);
    setPatterns((patternsRes.data as LearningPattern[]) || []);

    // Calculate stats from all transactions
    if (statsRes.data) { const all = statsRes.data ;
      setStats({ total: all.length,
        matched: all.filter((t: any) => t.status === "matched").length,
        approved: all.filter((t: any) => t.status === "approved").length,
        rejected: (resetsRes.data || []).length,
      });
    }

    setLoading(false);
  };

  const accuracy = stats.total > 0
    ? Math.round(((stats.approved) / Math.max(stats.approved + stats.rejected, 1)) * 100)
    : 0;

  if (loading) { return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
          Laddar AI-statistik...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI accuracy overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            AI-lärande & precision
          </CardTitle>
          <CardDescription>Hur bra AI:n matchar baserat på din feedback</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Godkända" value={stats.approved} color="text-[#085041]" />
            <MetricCard label="Avvisade" value={stats.rejected} color="text-destructive" />
            <MetricCard label="AI-precision" value={`${accuracy}%`} color="text-primary" />
            <MetricCard label="Inlärda mönster" value={patterns.length} color="text-foreground" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>AI-precision</span>
              <span>{accuracy}%</span>
            </div>
            <Progress value={accuracy} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Learned patterns */}
      {patterns.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-[#085041]" />
              Inlärda mönster ({patterns.length})
            </CardTitle>
            <CardDescription>Korrektioner AI:n har lärt sig från</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {patterns.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border text-sm">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium truncate block">{p.pattern}</span>
                    <span className="text-xs text-muted-foreground">→ Konto {p.suggested_account}</span>
                  </div>
                  <Badge variant="outline" className="shrink-0 ml-2">
                    {p.correction_count} korr.
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rejected / reset matches */}
      {recentResets.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Avvisade matchningar ({recentResets.length})
            </CardTitle>
            <CardDescription>
              Transaktioner vars AI-matchning avvisats – dessa signaler förbättrar framtida förslag
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {recentResets.map((tx) => (
                <div key={tx.id} className="p-2.5 rounded-lg border text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium truncate block">
                        {tx.counterparty_name || tx.description || "Okänd"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(tx.booking_date), "d MMM yyyy", { locale: sv })}
                      </span>
                    </div>
                    <span className={`text-sm font-semibold shrink-0 ml-2 ${tx.amount >= 0 ? "text-[#085041]" : "text-destructive"}`}>
                      {tx.amount >= 0 ? "+" : ""}{tx.amount.toLocaleString("sv-SE")} kr
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {tx.rejection_reason && (
                      <Badge variant="outline" className="text-xs">
                        {reasonLabel(tx.rejection_reason)}
                      </Badge>
                    )}
                    {tx.ai_model_version && (
                      <Badge variant="secondary" className="text-xs">
                        {tx.ai_model_version}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {recentResets.length === 0 && patterns.length === 0 && stats.approved === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Ingen AI-feedback ännu</p>
            <p className="text-sm mt-1">Godkänn eller avvisa AI-matchningar i avstämningsfliken för att börja träna modellen</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-[12px] text-center">
      <p className="text-[20px] font-medium tabular-nums text-[#0F172A]">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.07em] text-[#94A3B8] mt-[2px]">{label}</p>
    </div>
  );
}
