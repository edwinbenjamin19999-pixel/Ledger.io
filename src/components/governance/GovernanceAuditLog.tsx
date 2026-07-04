import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Download, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { CATEGORY_B_LABELS, type CategoryBAction } from "@/lib/governance";

interface AuditEntry { id: string;
  company_id: string;
  user_id: string;
  action_type: string;
  amount: number | null;
  period: string | null;
  bankid_personal_number_masked: string | null;
  ip_address: string | null;
  status: string;
  document_reference: string | null;
  created_at: string;
}

interface Props { companyId: string;
}

const STATUS_COLORS: Record<string, string> = { completed: "bg-[#E1F5EE] text-[#085041] dark:bg-green-900/30 dark:text-[#1D9E75]",
  failed: "bg-[#FCE8E8] text-[#7A1A1A] dark:bg-red-900/30 dark:text-[#C73838]",
  cancelled: "bg-muted text-muted-foreground",
};

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

export const GovernanceAuditLog = ({ companyId }: Props) => { const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const loadEntries = async () => { setLoading(true);
    try { let q = supabase
        .from("governance_audit_log")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (filter !== "all") q = q.eq("action_type", filter);

      const { data, error } = await q;
      if (error) throw error;
      setEntries((data ) || []);
    } catch { setEntries([]);
    } finally { setLoading(false);
    }
  };

  useEffect(() => { loadEntries();
  }, [companyId, filter]);

  const exportCSV = () => { const headers = ["Datum", "Åtgärd", "Belopp", "Period", "Utförd av", "BankID", "Status", "Referens"];
    const rows = entries.map((e) => [
      e.created_at,
      CATEGORY_B_LABELS[e.action_type as CategoryBAction]?.label || e.action_type,
      e.amount ? fmt(e.amount) : "",
      e.period || "",
      e.user_id.substring(0, 8),
      e.bankid_personal_number_masked || "",
      e.status,
      e.document_reference || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revisionsspår-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Revisionsspår — Signerade åtgärder</h3>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48 h-8 text-xs">
              <SelectValue placeholder="Alla åtgärder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla åtgärder</SelectItem>
              {Object.entries(CATEGORY_B_LABELS).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadEntries} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5 mr-1" />
            CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Datum</TableHead>
                    <TableHead className="text-xs">Åtgärd</TableHead>
                    <TableHead className="text-xs text-right">Belopp</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Utförd av</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">BankID</TableHead>
                    <TableHead className="text-xs text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                        Inga signerade åtgärder registrerade
                      </TableCell>
                    </TableRow>
                  ) : (
                    entries.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {format(new Date(e.created_at), "d MMM yyyy HH:mm", { locale: sv })}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {CATEGORY_B_LABELS[e.action_type as CategoryBAction]?.label || e.action_type}
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium">
                          {e.amount ? `${fmt(e.amount)} kr` : "—"}
                        </TableCell>
                        <TableCell className="text-xs hidden md:table-cell font-mono text-muted-foreground">
                          {e.user_id.substring(0, 8)}...
                        </TableCell>
                        <TableCell className="text-xs hidden md:table-cell text-muted-foreground">
                          {e.bankid_personal_number_masked || "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`border-0 text-[10px] ${STATUS_COLORS[e.status] || ""}`}>
                            {e.status === "completed" ? "Genomförd" : e.status === "failed" ? "Misslyckad" : "Avbruten"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
