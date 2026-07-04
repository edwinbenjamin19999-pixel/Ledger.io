import { useState } from "react";
import { Project, useProjectTransactions } from "@/hooks/useProjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";

export function ProjectTransaktionerTab({ project }: { project: Project }) { const { transactions, isLoading, addTransaction, removeTransaction } = useProjectTransactions(project.id);
  const [showAdd, setShowAdd] = useState(false);
  const [txType, setTxType] = useState("cost");
  const [txAmount, setTxAmount] = useState("");
  const [txDesc, setTxDesc] = useState("");
  const [txDate, setTxDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const handleAdd = () => { if (!txAmount) return;
    addTransaction.mutate(
      { project_id: project.id,
        transaction_type: txType,
        amount: parseFloat(txAmount),
        description: txDesc || null,
        transaction_date: txDate,
        auto_linked: false,
        journal_entry_id: null,
        invoice_id: null,
      },
      { onSuccess: () => { setShowAdd(false); setTxAmount(""); setTxDesc(""); } }
    );
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Transaktioner</CardTitle>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Lägg till
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Lägg till transaktion</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Typ</Label>
                <Select value={txType} onValueChange={setTxType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cost">Kostnad</SelectItem>
                    <SelectItem value="revenue">Intäkt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Belopp (kr)</Label>
                <Input type="number" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} />
              </div>
              <div>
                <Label>Beskrivning</Label>
                <Input value={txDesc} onChange={(e) => setTxDesc(e.target.value)} />
              </div>
              <div>
                <Label>Datum</Label>
                <Input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} />
              </div>
              <Button onClick={handleAdd} disabled={addTransaction.isPending || !txAmount} className="w-full bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white">
                Lägg till
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Laddar...</p>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Inga transaktioner kopplade till projektet ännu</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground text-xs">
                  <th className="py-2 pr-4">Datum</th>
                  <th className="py-2 pr-4">Beskrivning</th>
                  <th className="py-2 pr-4">Typ</th>
                  <th className="py-2 pr-4 text-right">Belopp</th>
                  <th className="py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 text-xs">{tx.transaction_date}</td>
                    <td className="py-2 pr-4">{tx.description || "—"}</td>
                    <td className="py-2 pr-4">
                      <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded", tx.transaction_type === "revenue" ? "bg-[#E1F5EE] text-[#085041] dark:bg-emerald-900/30 dark:text-[#1D9E75]" : "bg-[#FCE8E8] text-[#7A1A1A] dark:bg-red-900/30 dark:text-[#C73838]")}>
                        {tx.transaction_type === "revenue" ? "Intäkt" : "Kostnad"}
                      </span>
                    </td>
                    <td className={cn("py-2 pr-4 text-right font-medium", tx.transaction_type === "revenue" ? "text-[#085041]" : "text-destructive")}>
                      {tx.transaction_type === "revenue" ? "+" : "-"}{fmt(Math.abs(tx.amount))}
                    </td>
                    <td className="py-2">
                      {!tx.auto_linked && (
                        <button onClick={() => removeTransaction.mutate(tx.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
