import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText } from "lucide-react";

function fmt(n: number) { return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);
}

export function DividendHistory() { // Data will come from K10 filings / tax_declarations when available
  const history: { year: number; allocated: number; used: number; remaining: number }[] = [];
  const totalSaved = history.reduce((s, h) => s + h.remaining, 0);

  if (history.length === 0) { return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-foreground">Ingen utdelningshistorik</p>
          <p className="text-sm mt-1">Historik visas här när du lämnar in K10-deklarationer.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground">Ackumulerat sparat utdelningsutrymme</p>
          <p className="text-3xl font-bold text-primary mt-1">{fmt(totalSaved)} kr</p>
          <p className="text-xs text-muted-foreground mt-1">
            Kan användas för utdelning med 20% skatt kommande år
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historik per år</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>År</TableHead>
                <TableHead className="text-right">Gränsbelopp</TableHead>
                <TableHead className="text-right">Utnyttjat</TableHead>
                <TableHead className="text-right">Sparat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((h) => (
                <TableRow key={h.year}>
                  <TableCell className="font-medium">{h.year}</TableCell>
                  <TableCell className="text-right">{fmt(h.allocated)} kr</TableCell>
                  <TableCell className="text-right">{fmt(h.used)} kr</TableCell>
                  <TableCell className={`text-right font-medium ${h.remaining > 0 ? "text-[#085041] dark:text-[#1D9E75]" : ""}`}>
                    {fmt(h.remaining)} kr
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
