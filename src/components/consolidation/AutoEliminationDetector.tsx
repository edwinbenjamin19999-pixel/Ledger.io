import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, ArrowRight,
  ThumbsUp, ThumbsDown, ListChecks, Brain, RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type EliminationInsert = Database["public"]["Tables"]["eliminations"]["Insert"];

interface DetectedElimination { company_a_id: string;
  company_a_name: string;
  company_b_id: string;
  company_b_name: string;
  elimination_type: string;
  amount: number;
  currency: string;
  description: string;
  confidence: number;
  journal_a_id: string;
  journal_b_id: string;
  date: string;
}

interface AutoEliminationDetectorProps { groupId: string;
  groupName: string;
  year: number;
  onEliminationsCreated: () => void;
}

const ELIM_TYPE_LABELS: Record<string, string> = { intercompany_receivable: "Koncernintern fordran",
  intercompany_payable: "Koncernintern skuld",
  intercompany_revenue: "Koncernintern intäkt",
  intercompany_expense: "Koncernintern kostnad",
  dividend: "Utdelning",
  investment: "Aktieinnehav",
};

export function AutoEliminationDetector({ groupId,
  groupName,
  year,
  onEliminationsCreated,
}: AutoEliminationDetectorProps) { const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState<DetectedElimination[]>([]);
  const [period, setPeriod] = useState<{ start: string; end: string } | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [approving, setApproving] = useState(false);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const runDetection = async () => { setDetecting(true);
    setDismissed(new Set());
    try { const { data, error } = await supabase.functions.invoke("detect-intragroup-transactions", { body: { group_id: groupId, year },
      });

      if (error) throw error;

      setDetected(data.detected || []);
      setPeriod(data.period || null);
      setHasRun(true);

      if ((data.detected || []).length === 0) { toast.info("Inga koncerninterna transaktioner hittades");
      } else { toast.success(`${data.detected.length} potentiella elimineringar hittade`);
      }
    } catch (err: any) { toast.error(err.message || "Kunde inte köra detektion");
    } finally { setDetecting(false);
    }
  };

  const activeDetections = detected.filter((_, i) => !dismissed.has(i));
  const highConfidence = activeDetections.filter(d => d.confidence >= 0.85);

  const approveAll = async () => { if (highConfidence.length === 0) return;
    setApproving(true);
    try { const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Inte inloggad");

      const rows: EliminationInsert[] = highConfidence.map(d => ({ group_id: groupId,
        company_a_id: d.company_a_id,
        company_b_id: d.company_b_id,
        elimination_type: d.elimination_type as EliminationInsert["elimination_type"],
        amount: d.amount,
        currency: d.currency,
        period_start: period?.start || `${year}-01-01`,
        period_end: period?.end || `${year}-12-31`,
        notes: `Auto-detekterad (${Math.round(d.confidence * 100)}%): ${d.description}`,
        created_by: user.id,
      }));

      const { error } = await supabase.from("eliminations").insert(rows);
      if (error) throw error;

      toast.success(`${rows.length} elimineringar skapade`);
      onEliminationsCreated();
      // Remove approved from list
      const approvedIds = new Set(highConfidence.map(d => detected.indexOf(d)));
      setDismissed(prev => new Set([...prev, ...approvedIds]));
    } catch (err: any) { toast.error(err.message || "Kunde inte skapa elimineringar");
    } finally { setApproving(false);
    }
  };

  const approveSingle = async (d: DetectedElimination, index: number) => { try { const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Inte inloggad");

      const row: EliminationInsert = { group_id: groupId,
        company_a_id: d.company_a_id,
        company_b_id: d.company_b_id,
        elimination_type: d.elimination_type as EliminationInsert["elimination_type"],
        amount: d.amount,
        currency: d.currency,
        period_start: period?.start || `${year}-01-01`,
        period_end: period?.end || `${year}-12-31`,
        notes: `Auto-detekterad (${Math.round(d.confidence * 100)}%): ${d.description}`,
        created_by: user.id,
      };

      const { error } = await supabase.from("eliminations").insert([row]);

      if (error) throw error;
      toast.success("Eliminering skapad");
      setDismissed(prev => new Set([...prev, index]));
      onEliminationsCreated();
    } catch (err: any) { toast.error(err.message || "Misslyckades");
    }
  };

  const confidenceBadge = (c: number) => { if (c >= 0.9) return <Badge className="bg-green-600 text-white">Hög {Math.round(c * 100)}%</Badge>;
    if (c >= 0.7) return <Badge className="bg-yellow-500 text-white">Medel {Math.round(c * 100)}%</Badge>;
    return <Badge variant="destructive">Låg {Math.round(c * 100)}%</Badge>;
  };

  const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Automatisk elimineringsdetektion
            </CardTitle>
            <CardDescription>
              AI skannar koncerninterna transaktioner mellan bolag i {groupName} för {year}
            </CardDescription>
          </div>
          <Button
            onClick={runDetection}
            disabled={detecting}
            variant={hasRun ? "outline" : "default"}
          >
            {detecting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : hasRun ? (
              <RefreshCw className="h-4 w-4 mr-1" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            {detecting ? "Skannar..." : hasRun ? "Kör igen" : "Skanna nu"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasRun && !detecting && (
          <Alert className="border-primary/20 bg-primary/5">
            <Sparkles className="h-4 w-4 text-primary" />
            <AlertDescription>
              Klicka <strong>"Skanna nu"</strong> för att automatiskt hitta koncerninterna transaktioner
              (fordringar/skulder, intäkter/kostnader) som ska elimineras vid konsolidering.
            </AlertDescription>
          </Alert>
        )}

        {detecting && (
          <div className="flex items-center gap-3 py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <div>
              <p className="font-medium">Analyserar transaktioner mellan koncernbolag...</p>
              <p className="text-sm text-muted-foreground">Matchar fordringar, skulder, intäkter och kostnader</p>
            </div>
          </div>
        )}

        {hasRun && activeDetections.length === 0 && (
          <Alert className="border-[#BFE6D6] bg-[#E1F5EE] dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-[#085041]" />
            <AlertDescription className="text-[#085041] dark:text-green-300">
              Inga nya koncerninterna transaktioner att eliminera — allt ser bra ut!
            </AlertDescription>
          </Alert>
        )}

        {/* Bulk approve high-confidence */}
        {highConfidence.length > 0 && (
          <Alert className="border-[#BFE6D6] bg-[#E1F5EE] dark:bg-green-950/20">
            <ListChecks className="h-4 w-4 text-[#085041]" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                <strong>{highConfidence.length}</strong> elimineringar med hög säkerhet (≥85%) redo
              </span>
              <Button size="sm" onClick={approveAll} disabled={approving} className="ml-4">
                {approving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                Godkänn alla
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* List detected eliminations */}
        {activeDetections.length > 0 && (
          <div className="space-y-2">
            {activeDetections.map((d, rawIndex) => { const origIndex = detected.indexOf(d);
              return (
                <div key={origIndex} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{d.company_a_name}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-medium">{d.company_b_name}</span>
                      {confidenceBadge(d.confidence)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>{ELIM_TYPE_LABELS[d.elimination_type] || d.elimination_type}</span>
                      <span>·</span>
                      <span className="font-medium text-foreground">{fmt(d.amount)} {d.currency}</span>
                      {d.date && (
                        <>
                          <span>·</span>
                          <span>{d.date}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-[#085041] hover:bg-[#E1F5EE]"
                      onClick={() => approveSingle(d, origIndex)}
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:bg-muted"
                      onClick={() => setDismissed(prev => new Set([...prev, origIndex]))}
                    >
                      <ThumbsDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
