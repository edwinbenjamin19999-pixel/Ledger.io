import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, CheckCircle2, AlertTriangle, XCircle, Circle, Trash2,
  ThumbsUp, ThumbsDown, Download, Sparkles, Loader2, FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { exportEliminationsPDF, exportEliminationsExcel } from "@/lib/consolidation-export";
import { toast } from "sonner";

interface Company { id: string; name: string; }

interface EliminationEntry { id: string;
  elimination_type: string;
  entity_a_id: string;
  entity_b_id: string | null;
  is_auto: boolean;
  is_recurring: boolean;
  status: string;
  description: string | null;
  comment: string | null;
  total_amount: number;
  created_at: string;
  lines?: { account_no: string; account_name: string | null; debit: number; credit: number }[];
  entity_a?: { name: string };
  entity_b?: { name: string };
}

interface Stage4Props { groupId: string;
  periodId: string;
  onComplete: () => void;
}

const TYPE_LABELS: Record<string, string> = { capital: "Kapitalkonsolidering",
  intercompany_balance: "Fordringar & skulder",
  intercompany_transaction: "Intäkter & kostnader",
  unrealized_profit: "Internvinst",
  minority: "Minoritetsintresse",
  goodwill: "Goodwill",
  deferred_tax: "Uppskjuten skatt",
  other: "Övrigt",
};

const STATUS_COLORS: Record<string, string> = { approved: "bg-[#E1F5EE] text-[#085041] dark:bg-green-900/30 dark:text-[#1D9E75]",
  proposed: "bg-[#FAEEDA] text-[#7A5417] dark:bg-yellow-900/30 dark:text-[#C28A2B]",
  rejected: "bg-[#FCE8E8] text-[#7A1A1A] dark:bg-red-900/30 dark:text-[#C73838]",
};

export const Stage4Eliminations = ({ groupId, periodId, onComplete }: Stage4Props) => { const [companies, setCompanies] = useState<Company[]>([]);
  const [entries, setEntries] = useState<EliminationEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("alla");

  // Form state
  const [formType, setFormType] = useState("intercompany_balance");
  const [formEntityA, setFormEntityA] = useState("");
  const [formEntityB, setFormEntityB] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDrAccount, setFormDrAccount] = useState("");
  const [formCrAccount, setFormCrAccount] = useState("");
  const [formComment, setFormComment] = useState("");

  useEffect(() => { loadData(); }, [groupId, periodId]);

  const loadData = async () => { setIsLoading(true);
    try { const [compRes, elimRes] = await Promise.all([
        supabase.from("companies").select("id, name").eq("group_id", groupId).order("name"),
        supabase
          .from("consolidation_elimination_entries")
          .select(`
            *,
            lines:consolidation_elimination_lines(*),
            entity_a:companies!consolidation_elimination_entries_entity_a_id_fkey(name),
            entity_b:companies!consolidation_elimination_entries_entity_b_id_fkey(name)
          `)
          .eq("consolidation_period_id", periodId)
          .neq("elimination_type", "other")
          .order("created_at"),
      ]);

      setCompanies(compRes.data || []);
      setEntries((elimRes.data || []) as unknown as EliminationEntry[]);
    } catch (err: any) { toast.error(err.message || "Kunde inte ladda data");
    } finally { setIsLoading(false);
    }
  };

  const runAutoDetect = async () => { setIsAutoRunning(true);
    try { // Auto-detect intercompany balances from trial balances
      const { data: balances } = await supabase
        .from("entity_trial_balances")
        .select("entity_id, account_no, account_name, closing_balance")
        .eq("consolidation_period_id", periodId);

      if (!balances || balances.length === 0) { toast.info("Inga saldobalanser importerade ännu");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ej inloggad");

      // Detect intercompany accounts (16xx fordringar, 24xx/26xx skulder)
      const receivables = balances.filter(b => b.account_no.startsWith("16") && b.closing_balance > 0);
      const payables = balances.filter(b => (b.account_no.startsWith("24") || b.account_no.startsWith("28")) && b.closing_balance < 0);

      const proposals: any[] = [];

      // Match receivables against payables across entities
      for (const recv of receivables) { for (const pay of payables) { if (recv.entity_id === pay.entity_id) continue;
          const diff = Math.abs(recv.closing_balance + pay.closing_balance);
          if (diff < Math.abs(recv.closing_balance) * 0.05) { proposals.push({ consolidation_period_id: periodId,
              elimination_type: "intercompany_balance",
              entity_a_id: recv.entity_id,
              entity_b_id: pay.entity_id,
              is_auto: true,
              status: "proposed",
              description: `Intern fordran/skuld: ${recv.account_no} ↔ ${pay.account_no}`,
              total_amount: Math.abs(recv.closing_balance),
              created_by: user.id,
            });
          }
        }
      }

      // Detect intercompany revenue/cost (3xxx vs 4-6xxx)
      const revenues = balances.filter(b => b.account_no.startsWith("3") && Math.abs(b.closing_balance) > 100);
      const costs = balances.filter(b => /^[4-6]/.test(b.account_no) && Math.abs(b.closing_balance) > 100);

      for (const rev of revenues) { for (const cost of costs) { if (rev.entity_id === cost.entity_id) continue;
          const revAmt = Math.abs(rev.closing_balance);
          const costAmt = Math.abs(cost.closing_balance);
          if (Math.abs(revAmt - costAmt) < revAmt * 0.05 && revAmt > 1000) { proposals.push({ consolidation_period_id: periodId,
              elimination_type: "intercompany_transaction",
              entity_a_id: rev.entity_id,
              entity_b_id: cost.entity_id,
              is_auto: true,
              status: "proposed",
              description: `Intern intäkt/kostnad: ${rev.account_no} ↔ ${cost.account_no}`,
              total_amount: revAmt,
              created_by: user.id,
            });
          }
        }
      }

      if (proposals.length > 0) { const { error } = await supabase.from("consolidation_elimination_entries").insert(proposals);
        if (error) throw error;
        toast.success(`${proposals.length} förslag genererade`);
        loadData();
      } else { toast.info("Inga koncerninterna transaktioner hittades");
      }
    } catch (err: any) { toast.error(err.message || "Auto-detektion misslyckades");
    } finally { setIsAutoRunning(false);
    }
  };

  const handleCreate = async () => { if (!formEntityA || !formAmount || !formDrAccount || !formCrAccount) { toast.error("Fyll i alla obligatoriska fält");
      return;
    }
    try { const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ej inloggad");

      const amount = parseFloat(formAmount);

      const { data: entry, error } = await supabase
        .from("consolidation_elimination_entries")
        .insert([{ consolidation_period_id: periodId,
          elimination_type: formType,
          entity_a_id: formEntityA,
          entity_b_id: formEntityB || null,
          is_auto: false,
          status: "approved",
          description: `Manuell: ${TYPE_LABELS[formType] || formType}`,
          comment: formComment,
          total_amount: amount,
          created_by: user.id,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        }])
        .select("id")
        .maybeSingle();

      if (error) throw error;

      await supabase.from("consolidation_elimination_lines").insert([
        { elimination_entry_id: entry.id, line_no: 1, account_no: formDrAccount, debit: amount, credit: 0 },
        { elimination_entry_id: entry.id, line_no: 2, account_no: formCrAccount, debit: 0, credit: amount },
      ]);

      toast.success("Eliminering skapad");
      setIsDialogOpen(false);
      loadData();
    } catch (err: any) { toast.error(err.message || "Kunde inte skapa eliminering");
    }
  };

  const approveEntry = async (id: string) => { try { const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("consolidation_elimination_entries").update({ status: "approved",
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      }).eq("id", id);
      toast.success("Godkänd");
      loadData();
    } catch (err: any) { toast.error(err.message || "Misslyckades");
    }
  };

  const rejectEntry = async (id: string) => { try { await supabase.from("consolidation_elimination_entries").update({ status: "rejected" }).eq("id", id);
      toast.success("Avvisad");
      loadData();
    } catch (err: any) { toast.error(err.message || "Misslyckades");
    }
  };

  const deleteEntry = async (id: string) => { if (!confirm("Vill du ta bort denna eliminering?")) return;
    try { await supabase.from("consolidation_elimination_entries").delete().eq("id", id);
      toast.success("Borttagen");
      loadData();
    } catch (err: any) { toast.error(err.message || "Misslyckades");
    }
  };

  const approveAll = async () => { const proposed = entries.filter(e => e.status === "proposed");
    try { const { data: { user } } = await supabase.auth.getUser();
      const ids = proposed.map(e => e.id);
      await supabase.from("consolidation_elimination_entries").update({ status: "approved",
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      }).in("id", ids);
      toast.success(`${ids.length} elimineringar godkända`);
      loadData();
    } catch (err: any) { toast.error(err.message || "Misslyckades");
    }
  };

  const filtered = activeTab === "alla"
    ? entries
    : entries.filter(e => e.elimination_type === activeTab);

  const proposedCount = entries.filter(e => e.status === "proposed").length;
  const approvedCount = entries.filter(e => e.status === "approved").length;
  const totalEliminated = entries.filter(e => e.status === "approved").reduce((s, e) => s + e.total_amount, 0);

  const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Laddar...</div>;

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex-1">
          <span className="text-sm text-muted-foreground">Elimineringar:</span>
          <span className="ml-2 font-medium">{approvedCount} godkända</span>
          {proposedCount > 0 && <span className="ml-2 text-[#7A5417]">{proposedCount} förslag</span>}
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Totalt eliminerat:</span>
          <span className="ml-2 font-bold">{fmt(totalEliminated)} kr</span>
        </div>
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-2">
        <Button onClick={runAutoDetect} disabled={isAutoRunning} variant="outline">
          {isAutoRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Auto-detektera
        </Button>
        {proposedCount > 0 && (
          <Button onClick={approveAll} variant="outline" className="text-[#085041]">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Godkänn alla förslag ({proposedCount})
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => { const rows = entries.map((e, i) => ({ nr: i + 1,
            type: TYPE_LABELS[e.elimination_type] || e.elimination_type,
            entityA: e.entity_a?.name || "—",
            entityB: e.entity_b?.name || "",
            description: e.description || e.comment || "",
            amount: e.total_amount,
            autoManual: e.is_auto ? "Auto" : "Manuell",
            status: e.status === "approved" ? "Godkänd" : e.status === "proposed" ? "Förslag" : "Avvisad",
            lines: e.lines,
          }));
          exportEliminationsExcel(rows, "Koncern", periodId);
        }}>
          <Download className="w-4 h-4 mr-2" />Excel
        </Button>
        <Button variant="outline" size="sm" onClick={() => { const rows = entries.map((e, i) => ({ nr: i + 1,
            type: TYPE_LABELS[e.elimination_type] || e.elimination_type,
            entityA: e.entity_a?.name || "—",
            entityB: e.entity_b?.name || "",
            description: e.description || e.comment || "",
            amount: e.total_amount,
            autoManual: e.is_auto ? "Auto" : "Manuell",
            status: e.status === "approved" ? "Godkänd" : e.status === "proposed" ? "Förslag" : "Avvisad",
            lines: e.lines,
          }));
          exportEliminationsPDF(rows, "Koncern", periodId);
        }}>
          <FileText className="w-4 h-4 mr-2" />PDF
        </Button>
        <div className="flex-1" />
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Manuell eliminering</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader><DialogTitle>Ny eliminering</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Typ</Label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_LABELS).filter(([k]) => k !== "other").map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Belopp (kr)</Label>
                  <Input type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bolag A</Label>
                  <Select value={formEntityA} onValueChange={setFormEntityA}>
                    <SelectTrigger><SelectValue placeholder="Välj..." /></SelectTrigger>
                    <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Bolag B</Label>
                  <Select value={formEntityB} onValueChange={setFormEntityB}>
                    <SelectTrigger><SelectValue placeholder="Välj..." /></SelectTrigger>
                    <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Debet konto</Label>
                  <Input value={formDrAccount} onChange={e => setFormDrAccount(e.target.value)} placeholder="2661" />
                </div>
                <div className="space-y-2">
                  <Label>Kredit konto</Label>
                  <Input value={formCrAccount} onChange={e => setFormCrAccount(e.target.value)} placeholder="1661" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Kommentar</Label>
                <Textarea value={formComment} onChange={e => setFormComment(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Avbryt</Button>
                <Button onClick={handleCreate}>Skapa</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabbed elimination list */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="alla">Alla ({entries.length})</TabsTrigger>
              <TabsTrigger value="capital">Kapital</TabsTrigger>
              <TabsTrigger value="intercompany_balance">Fordringar</TabsTrigger>
              <TabsTrigger value="intercompany_transaction">Transaktioner</TabsTrigger>
              <TabsTrigger value="unrealized_profit">Internvinst</TabsTrigger>
              <TabsTrigger value="minority">Minoritet</TabsTrigger>
            </TabsList>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">Nr</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Bolag</TableHead>
                  <TableHead>Beskrivning</TableHead>
                  <TableHead className="text-right">Belopp</TableHead>
                  <TableHead>Auto/Man</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Inga elimineringar i denna kategori
                    </TableCell>
                  </TableRow>
                ) : filtered.map((e, i) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{TYPE_LABELS[e.elimination_type] || e.elimination_type}</Badge></TableCell>
                    <TableCell className="text-sm">
                      {e.entity_a?.name || "—"}
                      {e.entity_b?.name && <span className="text-muted-foreground"> ↔ {e.entity_b.name}</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{e.description || e.comment || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{fmt(e.total_amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{e.is_auto ? "Auto" : "Manuell"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[e.status] || ""}>
                        {e.status === "approved" ? "Godkänd" : e.status === "proposed" ? "Förslag" : "Avvisad"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {e.status === "proposed" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-[#085041]" onClick={() => approveEntry(e.id)}>
                              <ThumbsUp className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-[#7A1A1A]" onClick={() => rejectEntry(e.id)}>
                              <ThumbsDown className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteEntry(e.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onComplete} disabled={approvedCount === 0 && entries.length > 0}>
          Gå vidare till Konsoliderad rapport →
        </Button>
      </div>
    </div>
  );
};
