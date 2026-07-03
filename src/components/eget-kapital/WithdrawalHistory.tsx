import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatKr(amount: number) { return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(amount) + " kr";
}

interface WithdrawalHistoryProps { withdrawals: Array<{ id: string; date: string; amount: number; description: string }>;
  totalThisYear: number;
  totalLastYear: number;
}

export function WithdrawalHistory({ withdrawals, totalThisYear, totalLastYear }: WithdrawalHistoryProps) { let accumulated = 0;

  // Build rows with running total (sorted chronologically för accumulation)
  const sorted = [...withdrawals].sort((a, b) => a.date.localeCompare(b.date));
  const rows = sorted.map((w) => { accumulated += w.amount;
    return { ...w, accumulated };
  });
  rows.reverse(); // Most recent first för display

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Uttag i år</CardTitle>
          <div className="text-sm text-muted-foreground">
            Totalt: <span className="font-semibold text-foreground">{formatKr(totalThisYear)}</span>
            {totalLastYear > 0 && (
              <span className="ml-2">
                (förra året: {formatKr(totalLastYear)})
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Inga uttag registrerade i år.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead className="text-right">Belopp</TableHead>
                <TableHead className="text-right">Ackumulerat i år</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    {new Date(row.date).toLocaleDateString("sv-SE")}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatKr(row.amount)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatKr(row.accumulated)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
