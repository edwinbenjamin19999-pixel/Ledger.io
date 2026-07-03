import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Check, FileText } from "lucide-react";

type TxType = "inköp" | "försäljning" | "svinn" | "justering" | "inventering";

interface InventoryTx { id: string;
  date: string;
  type: TxType;
  article: string;
  qty: number;
  unitPrice: number;
  total: number;
  verification: string;
  booked: boolean;
}

const typeColor: Record<TxType, string> = { inköp: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]",
  försäljning: "bg-[#EFF6FF] text-blue-600 border-[#C8DDF5]",
  svinn: "bg-destructive/10 text-destructive border-destructive/20",
  justering: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]",
  inventering: "bg-[#F1F5F9] text-violet-600 border-[#E2E8F0]",
};

const typeLabel: Record<TxType, string> = { inköp: "Inköp",
  försäljning: "Försäljning",
  svinn: "Svinn",
  justering: "Justering",
  inventering: "Inventering",
};

const filters: (TxType | "alla")[] = ["alla", "inköp", "försäljning", "svinn", "justering", "inventering"];

export const InventoryTransactions = () => { const [filter, setFilter] = useState<TxType | "alla">("alla");
  const [showSvinn, setShowSvinn] = useState(false);
  const [transactions] = useState<InventoryTx[]>([]);

  const filtered = filter === "alla" ? transactions : transactions.filter((t) => t.type === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {filters.map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className="text-xs h-8"
            >
              {f === "alla" ? "Alla" : typeLabel[f]}
            </Button>
          ))}
        </div>

        <Dialog open={showSvinn} onOpenChange={setShowSvinn}>
          <DialogTrigger asChild>
            <Button size="sm" variant="destructive"><AlertTriangle className="h-4 w-4 mr-1" /> Registrera svinn</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrera svinn / kassation</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Artikel</Label><Input placeholder="Sök artikel..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Antal</Label><Input type="number" placeholder="0" /></div>
                <div>
                  <Label>Orsak</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Välj orsak" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expired">Utgånget datum</SelectItem>
                      <SelectItem value="theft">Stöld</SelectItem>
                      <SelectItem value="damage">Skada</SelectItem>
                      <SelectItem value="unknown">Okänt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Kommentar</Label><Textarea placeholder="Beskriv omständigheterna..." /></div>
              <Card className="border-muted bg-muted/30">
                <CardContent className="p-3 text-sm">
                  <p className="font-medium">AI-bokföring som skapas:</p>
                  <p className="text-muted-foreground mt-1">Debet: 4990 (Svinn och kassation) | Kredit: 1460 (Lager handelsvaror)</p>
                </CardContent>
              </Card>
              <Button className="w-full" onClick={() => setShowSvinn(false)}>Registrera svinn</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-foreground">Inga lagertransaktioner</p>
            <p className="text-sm mt-1">Transaktioner visas här när artiklar köps in, säljs eller justeras.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Artikel</TableHead>
                  <TableHead className="text-right">Antal</TableHead>
                  <TableHead className="text-right">á-pris</TableHead>
                  <TableHead className="text-right">Totalt</TableHead>
                  <TableHead>Verifikation</TableHead>
                  <TableHead>Bokfört</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm">{tx.date}</TableCell>
                    <TableCell><Badge variant="outline" className={typeColor[tx.type]}>{typeLabel[tx.type]}</Badge></TableCell>
                    <TableCell className="font-medium">{tx.article}</TableCell>
                    <TableCell className={`text-right font-mono ${tx.qty < 0 ? "text-destructive" : "text-[#085041]"}`}>
                      {tx.qty > 0 ? "+" : ""}{tx.qty}
                    </TableCell>
                    <TableCell className="text-right">{tx.unitPrice} kr</TableCell>
                    <TableCell className={`text-right font-medium ${tx.total < 0 ? "text-destructive" : ""}`}>
                      {Math.abs(tx.total).toLocaleString("sv-SE")} kr
                    </TableCell>
                    <TableCell className="font-mono text-xs">{tx.verification}</TableCell>
                    <TableCell>{tx.booked && <Check className="h-4 w-4 text-[#085041]" />}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
