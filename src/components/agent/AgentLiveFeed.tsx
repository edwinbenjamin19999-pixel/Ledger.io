import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Radio, Link, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { agentClassify, type AgentResult } from "@/lib/autonomous-booking-agent";

interface LiveFeedProps { companyId: string;
}

interface LiveTx { id: string;
  counterparty: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  isNew?: boolean;
  aiResult?: AgentResult;
}

export function AgentLiveFeed({ companyId }: LiveFeedProps) { const [transactions, setTransactions] = useState<LiveTx[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<any>(null);

  useEffect(() => { loadInitial();
    subscribeRealtime();
    return () => { if (channelRef.current) { supabase.removeChannel(channelRef.current);
      }
    };
  }, [companyId]);

  const loadInitial = async () => { try { const { data } = await supabase
        .from("transactions")
        .select("id, counterparty, description, amount, currency, transaction_date, created_at")
        .eq("company_id", companyId)
        .order("date", { ascending: false })
        .limit(20);

      const txs: LiveTx[] = (data || []).map(t => ({ id: t.id,
        counterparty: t.counterparty || t.description || "Okänd",
        description: t.description || "",
        amount: t.amount || 0,
        currency: t.currency || "SEK",
        date: t.transaction_date || t.created_at || "",
      }));

      // Classify all in parallel
      const classified = await Promise.all(
        txs.map(async tx => { try { const result = await agentClassify(companyId, tx.counterparty, tx.description, tx.amount, tx.currency);
            return { ...tx, aiResult: result };
          } catch { return tx;
          }
        })
      );

      setTransactions(classified);
    } catch (err) { console.error("Live feed load error:", err);
    } finally { setLoading(false);
    }
  };

  const subscribeRealtime = () => { channelRef.current = supabase
      .channel(`live-feed-${companyId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions", filter: `company_id=eq.${companyId}` },
        async (payload: any) => { const t = payload.new;
          const newTx: LiveTx = { id: t.id,
            counterparty: t.counterparty || t.description || "Okänd",
            description: t.description || "",
            amount: t.amount || 0,
            currency: t.currency || "SEK",
            date: t.date || t.created_at || "",
            isNew: true,
          };

          try { const result = await agentClassify(companyId, newTx.counterparty, newTx.description, newTx.amount, newTx.currency);
            newTx.aiResult = result;
          } catch { /* skip */ }

          setTransactions(prev => [newTx, ...prev.slice(0, 19)]);

          // Remove pulse after 3s
          setTimeout(() => { setTransactions(prev => prev.map(tx => tx.id === newTx.id ? { ...tx, isNew: false } : tx));
          }, 3000);
        }
      )
      .subscribe();
  };

  const getCircleColor = (confidence: number) => { if (confidence >= 0.92) return "#22c55e";
    if (confidence >= 0.60) return "#f59e0b";
    return "#ef4444";
  };

  if (loading) { return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />)}
      </div>
    );
  }

  if (transactions.length === 0) { return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Link className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold">Inga transaktioner hittade</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Koppla ett bankkonto för att börja ta emot transaktioner i realtid.
          </p>
          <Button variant="outline" onClick={() => window.location.href = "/bank"}>
            Koppla bankkonto
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Radio className="h-4 w-4 text-[#22c55e] animate-pulse" />
          Live-feed — senaste transaktioner
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {transactions.map(tx => (
            <div
              key={tx.id}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${ tx.isNew ? "animate-pulse bg-primary/5" : ""
              }`}
            >
              {/* AI confidence circle */}
              {tx.aiResult ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1 shrink-0 hover:opacity-80">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getCircleColor(tx.aiResult.confidence) }}
                      />
                      <span
                        className="text-xs font-mono font-medium"
                        style={{ color: getCircleColor(tx.aiResult.confidence) }}
                      >
                        {(tx.aiResult.confidence * 100).toFixed(0)}%
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-3" align="start">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-semibold">AI-förslag: {tx.aiResult.accountNumber} {tx.aiResult.accountName}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{tx.aiResult.explanation}</p>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="w-8" />
              )}

              <span className="font-medium truncate flex-1 min-w-0">{tx.counterparty}</span>

              {tx.aiResult && (
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {tx.aiResult.accountNumber}
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
