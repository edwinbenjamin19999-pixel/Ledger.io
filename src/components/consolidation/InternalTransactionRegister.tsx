import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatSEK } from "@/lib/consolidation-engine";

interface Props { groupId: string;
  periodId: string;
  onCreateElimination: (entityAId: string, entityBId: string, amount: number, drAccount: string, crAccount: string, description: string) => void;
}

interface InternalTransaction { id: string;
  date: string;
  sellerEntity: string;
  sellerEntityId: string;
  buyerEntity: string;
  buyerEntityId: string;
  sellerAccount: string;
  buyerAccount: string;
  description: string;
  amount: number;
  confidence: "high" | "medium" | "manual";
  isEliminated: boolean;
}

export const InternalTransactionRegister = ({ groupId, periodId, onCreateElimination }: Props) => { const [transactions, setTransactions] = useState<InternalTransaction[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => { detectTransactions(); }, [groupId, periodId]);

  const detectTransactions = async () => { setIsDetecting(true);
    try { const [compRes, balRes, elimRes] = await Promise.all([
        supabase.from("companies").select("id, name").eq("group_id", groupId),
        supabase.from("entity_trial_balances").select("*").eq("consolidation_period_id", periodId),
        supabase.from("consolidation_elimination_entries")
          .select("entity_a_id, entity_b_id, total_amount")
          .eq("consolidation_period_id", periodId)
          .eq("status", "approved"),
      ]);

      const comps = compRes.data || [];
      setCompanies(comps);
      const balances = balRes.data || [];
      const existingElims = elimRes.data || [];

      const compMap = new Map(comps.map((c: any) => [c.id, c.name]));
      const detected: InternalTransaction[] = [];

      // Detect intercompany account pairs
      const icReceivables = balances.filter((b: any) =>
        (b.account_no.startsWith("166") || b.account_no.startsWith("158")) && Math.abs(b.closing_balance) > 1
      );
      const icPayables = balances.filter((b: any) =>
        (b.account_no.startsWith("266") || b.account_no.startsWith("244") || b.account_no.startsWith("282")) && Math.abs(b.closing_balance) > 1
      );

      // Match receivables against payables
      for (const recv of icReceivables) { for (const pay of icPayables) { if (recv.entity_id === pay.entity_id) continue;
          const diff = Math.abs(recv.closing_balance + pay.closing_balance);
          if (diff < Math.abs(recv.closing_balance) * 0.05) { const isElim = existingElims.some((e: any) =>
              (e.entity_a_id === recv.entity_id && e.entity_b_id === pay.entity_id) ||
              (e.entity_b_id === recv.entity_id && e.entity_a_id === pay.entity_id)
            );
            detected.push({ id: `${recv.entity_id}-${pay.entity_id}-${recv.account_no}`,
              date: "",
              sellerEntity: compMap.get(recv.entity_id) || "",
              sellerEntityId: recv.entity_id,
              buyerEntity: compMap.get(pay.entity_id) || "",
              buyerEntityId: pay.entity_id,
              sellerAccount: recv.account_no,
              buyerAccount: pay.account_no,
              description: `${recv.account_name} ↔ ${pay.account_name}`,
              amount: Math.abs(recv.closing_balance),
              confidence: diff < 0.01 ? "high" : "medium",
              isEliminated: isElim,
            });
          }
        }
      }

      // Detect revenue/cost matches across entities
      const revenues = balances.filter((b: any) => b.account_no.startsWith("3") && Math.abs(b.closing_balance) > 1000);
      const costs = balances.filter((b: any) => /^[4-6]/.test(b.account_no) && Math.abs(b.closing_balance) > 1000);

      for (const rev of revenues) { for (const cost of costs) { if (rev.entity_id === cost.entity_id) continue;
          const revAmt = Math.abs(rev.closing_balance);
          const costAmt = Math.abs(cost.closing_balance);
          if (Math.abs(revAmt - costAmt) < revAmt * 0.02 && revAmt > 5000) { const exists = detected.some(d =>
              d.sellerEntityId === rev.entity_id && d.buyerEntityId === cost.entity_id &&
              Math.abs(d.amount - revAmt) < 1
            );
            if (!exists) { detected.push({ id: `rev-${rev.entity_id}-${cost.entity_id}-${rev.account_no}`,
                date: "",
                sellerEntity: compMap.get(rev.entity_id) || "",
                sellerEntityId: rev.entity_id,
                buyerEntity: compMap.get(cost.entity_id) || "",
                buyerEntityId: cost.entity_id,
                sellerAccount: rev.account_no,
                buyerAccount: cost.account_no,
                description: `Intern intäkt/kostnad: ${rev.account_name} ↔ ${cost.account_name}`,
                amount: revAmt,
                confidence: Math.abs(revAmt - costAmt) < 0.01 ? "high" : "medium",
                isEliminated: false,
              });
            }
          }
        }
      }

      setTransactions(detected);
    } catch (err: any) { toast.error(err.message || "Detektering misslyckades");
    } finally { setIsDetecting(false);
    }
  };

  const eliminateAll = () => { const highConfidence = transactions.filter(t => t.confidence === "high" && !t.isEliminated);
    highConfidence.forEach(t => { onCreateElimination(t.sellerEntityId, t.buyerEntityId, t.amount, t.buyerAccount, t.sellerAccount, t.description);
    });
  };

  const confidenceBadge = (conf: string) => { if (conf === "high") return <Badge className="bg-[#E1F5EE] text-[#085041] dark:bg-green-900/30 dark:text-[#1D9E75]">Säker match</Badge>;
    if (conf === "medium") return <Badge className="bg-[#FAEEDA] text-[#7A5417] dark:bg-yellow-900/30 dark:text-[#C28A2B]">Trolig match</Badge>;
    return <Badge variant="outline">Manuell</Badge>;
  };

  const highCount = transactions.filter(t => t.confidence === "high" && !t.isEliminated).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              Interna transaktioner
            </CardTitle>
            <CardDescription>
              {transactions.length} transaktioner detekterade • {transactions.filter(t => t.isEliminated).length} eliminerade
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={detectTransactions} disabled={isDetecting}>
              {isDetecting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Search className="w-4 h-4 mr-1" />}
              Sök igen
            </Button>
            {highCount > 0 && (
              <Button size="sm" onClick={eliminateAll}>
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Eliminera alla säkra ({highCount})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isDetecting ? (
          <div className="py-8 text-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Analyserar transaktioner...
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            Inga koncerninterna transaktioner hittades
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Säljande bolag</TableHead>
                <TableHead>Köpande bolag</TableHead>
                <TableHead>Konto (säljare)</TableHead>
                <TableHead>Konto (köpare)</TableHead>
                <TableHead>Beskrivning</TableHead>
                <TableHead className="text-right">Belopp</TableHead>
                <TableHead>Matchning</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map(t => (
                <TableRow key={t.id} className={t.isEliminated ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{t.sellerEntity}</TableCell>
                  <TableCell>{t.buyerEntity}</TableCell>
                  <TableCell className="text-sm text-muted-foreground tabular-nums">{t.sellerAccount}</TableCell>
                  <TableCell className="text-sm text-muted-foreground tabular-nums">{t.buyerAccount}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{t.description}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{formatSEK(t.amount)} kr</TableCell>
                  <TableCell>{confidenceBadge(t.confidence)}</TableCell>
                  <TableCell>
                    {t.isEliminated ? (
                      <Badge className="bg-[#E1F5EE] text-[#085041] dark:bg-green-900/30 dark:text-[#1D9E75]">Eliminerad</Badge>
                    ) : (
                      <Badge variant="outline">Ej eliminerad</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {!t.isEliminated && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onCreateElimination(t.sellerEntityId, t.buyerEntityId, t.amount, t.buyerAccount, t.sellerAccount, t.description)}
                      >
                        Eliminera
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
