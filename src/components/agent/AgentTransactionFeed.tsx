import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Radio, Info, ChevronDown, Filter, Link, FileText, Clock, Bot, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { agentClassify, type AgentResult } from "@/lib/autonomous-booking-agent";

interface Props { companyId: string;
}

type FilterType = "all" | "today" | "week" | "low" | "pending";

interface FeedTx { id: string;
  counterparty: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  isNew?: boolean;
  aiResult?: AgentResult;
  status?: string;
  journalEntryId?: string;
}

function ConfidenceCircle({ confidence }: { confidence: number }) { const pct = confidence * 100;
  const color = pct >= 90 ? "#22c55e" : pct >= 75 ? "#f59e0b" : pct >= 60 ? "#f97316" : "#ef4444";
  return (
    <div className="flex items-center gap-1 shrink-0">
      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-xs font-mono font-medium tabular-nums" style={{ color }}>{pct.toFixed(0)}%</span>
    </div>
  );
}

function AuditTrail({ tx }: { tx: FeedTx }) { return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-1 text-[11px] text-primary hover:underline mt-1">
          <FileText className="h-3 w-3" /> Revisionsspar
          <ChevronDown className="h-3 w-3" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 pl-3 border-l-2 border-primary/20 space-y-1.5 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span>{tx.date ? new Date(tx.date).toLocaleString("sv-SE") : "Okant datum"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Bot className="h-3 w-3" />
            <span>AI-motor: Lokal regelmotor + historik</span>
          </div>
          {tx.aiResult?.ruleId && (
            <div className="flex items-center gap-1.5">
              <Info className="h-3 w-3" />
              <span>Trigger: Inlard regel (ID: {tx.aiResult.ruleId.slice(0, 8)}...)</span>
            </div>
          )}
          {!tx.aiResult?.ruleId && (
            <div className="flex items-center gap-1.5">
              <Info className="h-3 w-3" />
              <span>Trigger: {tx.aiResult?.explanation?.includes("nyckelord") ? "Nyckelordsmatchning" : tx.aiResult?.explanation?.includes("leverantör") ? "Leverantörsigenkanning" : "ML-klassificering"}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span>Konfidens: {tx.aiResult ? (tx.aiResult.confidence * 100).toFixed(1) : 0}%</span>
          </div>
          {tx.aiResult && tx.aiResult.confidence >= 0.92 && (
            <div className="flex items-center gap-1.5 text-[#22c55e]">
              <span>Status: Auto-bokford (ingen manuell godkannare)</span>
            </div>
          )}
          {tx.aiResult && tx.aiResult.confidence < 0.92 && (
            <div className="flex items-center gap-1.5 text-[#f59e0b]">
              <span>Status: Vantar manuell granskning</span>
            </div>
          )}
          {tx.journalEntryId && (
            <div className="flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              <span>Verifikation: #{tx.journalEntryId.slice(0, 8)}</span>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AgentTransactionFeed({ companyId }: Props) { const [transactions, setTransactions] = useState<FeedTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const channelRef = useRef<any>(null);

  useEffect(() => { loadInitial();
    subscribeRealtime();
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [companyId]);

  const loadInitial = async () => { try { const { data } = await supabase
        .from("transactions")
        .select("id, counterparty, description, amount, currency, transaction_date, created_at")
        .eq("company_id", companyId)
        .order("transaction_date", { ascending: false })
        .limit(50);

      const txs: FeedTx[] = (data || []).map(t => ({ id: t.id,
        counterparty: t.counterparty || t.description || "Okand",
        description: t.description || "",
        amount: t.amount || 0,
        currency: t.currency || "SEK",
        date: t.transaction_date || t.created_at || "",
      }));

      const classified = await Promise.all(
        txs.slice(0, 30).map(async tx => { try { const result = await agentClassify(companyId, tx.counterparty, tx.description, tx.amount, tx.currency);
            return { ...tx, aiResult: result };
          } catch { return tx;
          }
        })
      );

      setTransactions(classified);
    } catch (err) { console.error("Feed load error:", err);
    } finally { setLoading(false);
    }
  };

  const subscribeRealtime = () => { channelRef.current = supabase
      .channel(`tx-feed-${companyId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions", filter: `company_id=eq.${companyId}` },
        async (payload: any) => { const t = payload.new;
          const newTx: FeedTx = { id: t.id,
            counterparty: t.counterparty || t.description || "Okand",
            description: t.description || "",
            amount: t.amount || 0,
            currency: t.currency || "SEK",
            date: t.transaction_date || t.created_at || "",
            isNew: true,
          };
          try { newTx.aiResult = await agentClassify(companyId, newTx.counterparty, newTx.description, newTx.amount, newTx.currency);
          } catch { /* skip */ }
          setTransactions(prev => [newTx, ...prev.slice(0, 49)]);
          setTimeout(() => { setTransactions(prev => prev.map(tx => tx.id === newTx.id ? { ...tx, isNew: false } : tx));
          }, 3000);
        }
      )
      .subscribe();
  };

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);

  const filtered = transactions.filter(tx => { if (filter === "today") return tx.date?.slice(0, 10) === todayStr;
    if (filter === "week") return tx.date?.slice(0, 10) >= weekAgo;
    if (filter === "low") return tx.aiResult && tx.aiResult.confidence < 0.75;
    if (filter === "pending") return tx.aiResult && tx.aiResult.confidence < 0.92;
    return true;
  });

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "Alla" },
    { key: "today", label: "Idag" },
    { key: "week", label: "Denna vecka" },
    { key: "low", label: "Lag konfidens" },
    { key: "pending", label: "Vantar" },
  ];

  if (loading) { return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse" />)}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card className="border-0 bg-[#0F1F3D] shadow-[0_0_30px_rgba(0,198,255,0.08)]">
        <CardContent className="py-12 text-center space-y-6">
          {/* Animated AI illustration */}
          <div className="flex items-center justify-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[#3b82f6]/20 animate-ping" />
              <div className="relative bg-white/10 border border-white/15 rounded-full p-3">
                <Bot className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="h-px w-8 bg-gradient-to-r from-[#3b82f6] to-transparent" />
            <div className="bg-white/10 border border-white/15 rounded-full p-3">
              <Brain className="h-6 w-6 text-white" />
            </div>
          </div>

          <div>
            <p className="text-lg font-bold text-white">AI väntar på att ta över din bokföring</p>
            <p className="text-sm text-white/60 mt-1">Kom igång med tre enkla steg</p>
          </div>

          {/* Three CTA cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
            <button
              onClick={() => window.location.href = "/bank"}
              className="group flex flex-col items-center gap-2 p-4 rounded-xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.10] hover:border-white/20 transition-all"
            >
              <Link className="h-5 w-5 text-[#3b82f6] group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-white/90">Koppla bank</span>
            </button>
            <button
              onClick={() => window.location.href = "/assistant"}
              className="group flex flex-col items-center gap-2 p-4 rounded-xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.10] hover:border-white/20 transition-all"
            >
              <FileText className="h-5 w-5 text-[#3b82f6] group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-white/90">Ladda upp kvitto</span>
            </button>
            <button
              className="group flex flex-col items-center gap-2 p-4 rounded-xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.10] hover:border-white/20 transition-all"
            >
              <Bot className="h-5 w-5 text-[#3b82f6] group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-white/90">Aktivera auto-bokföring</span>
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {filters.map(f => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            className="text-xs h-7 px-3"
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} transaktioner</span>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Radio className="h-4 w-4 text-[#22c55e] animate-pulse" />
            Transaktionsfeed
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filtered.map(tx => (
              <div
                key={tx.id}
                className={`px-4 py-3 text-sm transition-all ${tx.isNew ? "animate-pulse bg-primary/5" : ""}`}
              >
                <div className="flex items-center gap-3">
                  {tx.aiResult && <ConfidenceCircle confidence={tx.aiResult.confidence} />}

                  <span className="font-medium truncate flex-1 min-w-0">{tx.counterparty}</span>

                  {tx.aiResult && (
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {tx.aiResult.accountNumber} {tx.aiResult.accountName}
                    </Badge>
                  )}

                  {tx.aiResult && (
                    <Badge
                      className="text-[10px] shrink-0"
                      variant={tx.aiResult.confidence >= 0.92 ? "default" : "secondary"}
                    >
                      {tx.aiResult.confidence >= 0.92 ? "Auto-bokford" : tx.aiResult.confidence >= 0.60 ? "Granskning" : "Flaggad"}
                    </Badge>
                  )}

                  <span className={`text-xs font-mono tabular-nums shrink-0 ${tx.amount > 0 ? "text-[#22c55e]" : ""}`}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString("sv-SE")} {tx.currency}
                  </span>

                  <span className="text-xs text-muted-foreground shrink-0">
                    {tx.date ? new Date(tx.date).toLocaleDateString("sv-SE") : ""}
                  </span>

                  {tx.isNew && (
                    <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 animate-pulse">NY</Badge>
                  )}
                </div>

                {/* Audit trail */}
                <AuditTrail tx={tx} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
