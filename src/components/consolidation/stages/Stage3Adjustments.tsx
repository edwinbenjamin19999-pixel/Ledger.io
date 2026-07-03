import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Wrench, Trash2, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Company { id: string;
  name: string;
}

interface GoodwillEntry { id: string;
  opening_value: number;
  amortization: number;
  closing_value: number;
  amortization_years: number;
  years_remaining: number | null;
  annual_charge: number | null;
  child_name?: string;
}

interface Stage3Props { groupId: string;
  periodId: string;
  onComplete: () => void;
}

export const Stage3Adjustments = ({ groupId, periodId, onComplete }: Stage3Props) => { const [companies, setCompanies] = useState<Company[]>([]);
  const [goodwillEntries, setGoodwillEntries] = useState<GoodwillEntry[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Adjustment form state
  const [adjType, setAdjType] = useState("depreciation");
  const [adjEntity, setAdjEntity] = useState("");
  const [adjDrAccount, setAdjDrAccount] = useState("");
  const [adjCrAccount, setAdjCrAccount] = useState("");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjComment, setAdjComment] = useState("");

  useEffect(() => { loadData(); }, [groupId, periodId]);

  const loadData = async () => { setIsLoading(true);
    try { const [compRes, structRes, gwRes] = await Promise.all([
        supabase.from("companies").select("id, name").eq("group_id", groupId).order("name"),
        supabase.from("group_structure").select("id, child_entity_id, goodwill_amount, acquisition_price, net_assets_at_acquisition, ownership_pct, child_entity:companies!group_structure_child_entity_id_fkey(name)").eq("group_id", groupId).not("goodwill_amount", "is", null),
        supabase.from("goodwill_schedule").select("*").eq("consolidation_period_id", periodId),
      ]);

      setCompanies(compRes.data || []);

      // Generate goodwill entries from structure if not already in schedule
      const existingGw = gwRes.data || [];
      const structures = (structRes.data || []);

      if (existingGw.length === 0 && structures.length > 0) { // Auto-create goodwill schedule entries
        const rows = structures.map((s: any) => ({ group_structure_id: s.id,
          consolidation_period_id: periodId,
          opening_value: s.goodwill_amount || 0,
          additions: 0,
          disposals: 0,
          amortization: Math.round((s.goodwill_amount || 0) / 5),
          impairment: 0,
          closing_value: (s.goodwill_amount || 0) - Math.round((s.goodwill_amount || 0) / 5),
          amortization_years: 5,
          years_remaining: 4,
          annual_charge: Math.round((s.goodwill_amount || 0) / 5),
        }));

        if (rows.length > 0) { await supabase.from("goodwill_schedule").insert(rows);
        }

        setGoodwillEntries(rows.map((r: any, i: number) => ({ ...r,
          id: `temp-${i}`,
          child_name: structures[i]?.child_entity?.name,
        })));
      } else { setGoodwillEntries(existingGw.map((g: any) => ({ ...g,
          child_name: structures.find((s: any) => s.id === g.group_structure_id)?.child_entity?.name || "—",
        })));
      }

      // Load adjustments (stored as elimination entries of type 'other')
      const { data: adjData } = await supabase
        .from("consolidation_elimination_entries")
        .select("*, lines:consolidation_elimination_lines(*)")
        .eq("consolidation_period_id", periodId)
        .eq("elimination_type", "other")
        .order("created_at");

      setAdjustments(adjData || []);
    } catch (err: any) { toast.error(err.message || "Kunde inte ladda data");
    } finally { setIsLoading(false);
    }
  };

  const handleCreateAdjustment = async () => { if (!adjEntity || !adjDrAccount || !adjCrAccount || !adjAmount) { toast.error("Fyll i alla obligatoriska fält");
      return;
    }
    try { const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ej inloggad");

      const amount = parseFloat(adjAmount);

      const { data: entry, error: entryErr } = await supabase
        .from("consolidation_elimination_entries")
        .insert([{ consolidation_period_id: periodId,
          elimination_type: "other",
          entity_a_id: adjEntity,
          is_auto: false,
          status: "approved",
          description: `Justering: ${adjType}`,
          comment: adjComment,
          total_amount: amount,
          created_by: user.id,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        }])
        .select("id")
        .maybeSingle();

      if (entryErr) throw entryErr;

      const { error: linesErr } = await supabase
        .from("consolidation_elimination_lines")
        .insert([
          { elimination_entry_id: entry.id, line_no: 1, account_no: adjDrAccount, debit: amount, credit: 0, description: adjComment },
          { elimination_entry_id: entry.id, line_no: 2, account_no: adjCrAccount, debit: 0, credit: amount, description: adjComment },
        ]);

      if (linesErr) throw linesErr;

      toast.success("Justering skapad");
      setIsDialogOpen(false);
      setAdjType("depreciation");
      setAdjEntity("");
      setAdjDrAccount("");
      setAdjCrAccount("");
      setAdjAmount("");
      setAdjComment("");
      loadData();
    } catch (err: any) { toast.error(err.message || "Kunde inte skapa justering");
    }
  };

  const deleteAdjustment = async (id: string) => { try { await supabase.from("consolidation_elimination_entries").delete().eq("id", id);
      toast.success("Justering borttagen");
      loadData();
    } catch (err: any) { toast.error(err.message || "Kunde inte ta bort");
    }
  };

  const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Laddar...</div>;

  return (
    <div className="space-y-6">
      {/* Goodwill schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Goodwill-avskrivning
          </CardTitle>
          <CardDescription>Automatisk avskrivningsplan för goodwill per förvärv (K3 max 10 år)</CardDescription>
        </CardHeader>
        <CardContent>
          {goodwillEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Ingen goodwill registrerad. Lägg till förvärvsinformation i Steg 1.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dotterbolag</TableHead>
                  <TableHead className="text-right">IB</TableHead>
                  <TableHead className="text-right">Avskrivning</TableHead>
                  <TableHead className="text-right">UB</TableHead>
                  <TableHead className="text-right">År kvar</TableHead>
                  <TableHead className="text-right">Årlig kostnad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {goodwillEntries.map(g => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.child_name}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(g.opening_value)}</TableCell>
                    <TableCell className="text-right tabular-nums text-[#7A1A1A]">−{fmt(g.amortization)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{fmt(g.closing_value)}</TableCell>
                    <TableCell className="text-right tabular-nums">{g.years_remaining || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{g.annual_charge ? fmt(g.annual_charge) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Manual adjustments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" />
                Principjusteringar
              </CardTitle>
              <CardDescription>Harmonisera redovisningsprinciper mellan bolag</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-2" />Ny justering</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Skapa principjustering</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Justeringstyp</Label>
                      <Select value={adjType} onValueChange={setAdjType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="depreciation">Avskrivningsprinciper</SelectItem>
                          <SelectItem value="inventory">Lagerredovisning</SelectItem>
                          <SelectItem value="accrual">Periodisering</SelectItem>
                          <SelectItem value="leasing">Leasing (K3 kap 20)</SelectItem>
                          <SelectItem value="other">Övrig justering</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Bolag</Label>
                      <Select value={adjEntity} onValueChange={setAdjEntity}>
                        <SelectTrigger><SelectValue placeholder="Välj..." /></SelectTrigger>
                        <SelectContent>
                          {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Debet konto</Label>
                      <Input value={adjDrAccount} onChange={e => setAdjDrAccount(e.target.value)} placeholder="7830" />
                    </div>
                    <div className="space-y-2">
                      <Label>Kredit konto</Label>
                      <Input value={adjCrAccount} onChange={e => setAdjCrAccount(e.target.value)} placeholder="1229" />
                    </div>
                    <div className="space-y-2">
                      <Label>Belopp (kr)</Label>
                      <Input type="number" value={adjAmount} onChange={e => setAdjAmount(e.target.value)} placeholder="0" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Kommentar</Label>
                    <Textarea value={adjComment} onChange={e => setAdjComment(e.target.value)} placeholder="Justering av avskrivningstid..." />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Avbryt</Button>
                    <Button onClick={handleCreateAdjustment}>Skapa justering</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {adjustments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Inga principjusteringar behövs ännu</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Typ</TableHead>
                  <TableHead>Beskrivning</TableHead>
                  <TableHead className="text-right">Belopp</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.description}</TableCell>
                    <TableCell className="text-muted-foreground">{a.comment || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(a.total_amount)} kr</TableCell>
                    <TableCell><Badge variant="outline">{a.status === "approved" ? "Godkänd" : "Förslag"}</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteAdjustment(a.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onComplete}>Gå vidare till Elimineringar →</Button>
      </div>
    </div>
  );
};
