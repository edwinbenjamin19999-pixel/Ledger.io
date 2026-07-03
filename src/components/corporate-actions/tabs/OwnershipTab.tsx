import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FlaskConical, Users } from "lucide-react";
import { useShareholders, useCreateShareholder } from "@/hooks/useCorporateActions";
import { formatNumber } from "@/lib/formatNumber";
import { toast } from "sonner";

interface OwnershipTabProps {
  onSimulate: () => void;
}

export const OwnershipTab = ({ onSimulate }: OwnershipTabProps) => {
  const { data: shareholders, isLoading } = useShareholders();
  const createShareholder = useCreateShareholder();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newShares, setNewShares] = useState("");

  const totalShares = (shareholders ?? []).reduce((s, o) => s + (o.shares ?? 0), 0);

  const handleAdd = () => {
    if (!newName || !newShares) return;
    createShareholder.mutate(
      { name: newName, shares: parseInt(newShares) },
      {
        onSuccess: () => {
          toast.success("Ägare tillagd");
          setNewName("");
          setNewShares("");
          setShowAdd(false);
        },
        onError: () => toast.error("Kunde inte lägga till ägare"),
      }
    );
  };

  const colors = [
    "hsl(var(--primary))",
    "hsl(var(--secondary))",
    "hsl(210 60% 50%)",
    "hsl(30 80% 55%)",
    "hsl(280 50% 55%)",
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const owners = (shareholders ?? []).map(s => ({
    ...s,
    percentage: totalShares > 0 ? Math.round(((s.shares ?? 0) / totalShares) * 10000) / 100 : 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Ägarstruktur</h2>
          <p className="text-sm text-muted-foreground">Visualisera och hantera bolagets ägare och kapitalinsatser</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onSimulate} disabled={owners.length === 0}>
            <FlaskConical className="h-3.5 w-3.5 mr-1" /> Simulera förändring
          </Button>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Lägg till ägare</Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>Lägg till ägare</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Namn</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Förnamn Efternamn eller Bolag AB" /></div>
                <div><Label>Antal aktier</Label><Input type="number" value={newShares} onChange={e => setNewShares(e.target.value)} placeholder="1000" /></div>
                <Button className="w-full" onClick={handleAdd} disabled={createShareholder.isPending}>
                  {createShareholder.isPending ? "Sparar..." : "Lägg till"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {owners.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-10 w-10 mx-auto mb-4 text-muted-foreground/40" />
            <p className="font-medium">Ingen ägarstruktur registrerad</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Lägg till bolagets ägare för att se ägarfördelning, simulera förändringar och få smarta rekommendationer.
            </p>
            <Button size="sm" className="mt-4" onClick={() => setShowAdd(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Lägg till första ägaren
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Ägarfördelning</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-4">
                <svg viewBox="0 0 100 100" className="w-40 h-40">
                  {(() => {
                    let cumAngle = 0;
                    return owners.map((o, i) => {
                      const angle = (o.percentage / 100) * 360;
                      const startAngle = cumAngle;
                      cumAngle += angle;
                      const startRad = (startAngle - 90) * (Math.PI / 180);
                      const endRad = (cumAngle - 90) * (Math.PI / 180);
                      const largeArc = angle > 180 ? 1 : 0;
                      const x1 = 50 + 40 * Math.cos(startRad);
                      const y1 = 50 + 40 * Math.sin(startRad);
                      const x2 = 50 + 40 * Math.cos(endRad);
                      const y2 = 50 + 40 * Math.sin(endRad);
                      const d = owners.length === 1
                        ? `M 50 10 A 40 40 0 1 1 49.99 10 Z`
                        : `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`;
                      return <path key={o.id} d={d} fill={colors[i % colors.length]} opacity={0.85} />;
                    });
                  })()}
                </svg>
              </div>
              <div className="space-y-2 mt-2">
                {owners.map((o, i) => (
                  <div key={o.id} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors[i % colors.length] }} />
                    <span className="flex-1 truncate">{o.name}</span>
                    <span className="font-medium">{o.percentage}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Ägare & kapital</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ägare</TableHead>
                    <TableHead className="text-right">Andelar</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">Aktieklass</TableHead>
                    <TableHead className="text-right">Förvärvsdatum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {owners.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{o.name}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatNumber(o.shares ?? 0)}</TableCell>
                      <TableCell className="text-right">{o.percentage}%</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{o.share_class ?? 'A'}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {o.acquisition_date ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
