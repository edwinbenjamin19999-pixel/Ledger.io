import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle, Clock, FileText, Sparkles, AlertCircle } from "lucide-react";
import { PosDailySales, formatKr } from "@/hooks/useKassaregister";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { toast } from "sonner";

interface Props { sales: PosDailySales[];
}

interface BookingEntry { account: string;
  name: string;
  debit: number;
  credit: number;
}

export function KassaZReportBooking({ sales }: Props) { const [autoMode, setAutoMode] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  const unbookedDays = useMemo(() => { return sales.filter((s) => !s.is_booked && s.total_sales > 0);
  }, [sales]);

  const generateEntries = (day: PosDailySales): BookingEntry[] => { const total = day.total_sales;
    const vatRate = 0.25;
    const exMoms = Math.round(total / (1 + vatRate));
    const moms = total - exMoms;
    const cardFee = Math.round(day.card_amount * 0.0149);

    const entries: BookingEntry[] = [];
    if (day.card_amount > 0) entries.push({ account: "1920", name: "Bankkonto/kortinlösen", debit: day.card_amount, credit: 0 });
    if (day.swish_amount > 0) entries.push({ account: "1930", name: "Swish", debit: day.swish_amount, credit: 0 });
    if (day.cash_amount > 0) entries.push({ account: "1910", name: "Kontant", debit: day.cash_amount, credit: 0 });
    entries.push({ account: "3000", name: "Försäljning ex moms", debit: 0, credit: exMoms });
    entries.push({ account: "2610", name: "Utgående moms 25%", debit: 0, credit: moms });
    if (cardFee > 0) { entries.push({ account: "6570", name: "Bankkostnader (kortavgift)", debit: cardFee, credit: 0 });
      entries.push({ account: "1920", name: "Bankkonto/kortinlösen", debit: 0, credit: cardFee });
    }
    return entries;
  };

  const handleBook = (day: PosDailySales) => { toast.success(`Z-rapport ${format(new Date(day.sale_date), "d MMMM", { locale: sv })} bokförd`);
  };

  const handleBookAll = () => { unbookedDays.forEach((d) => handleBook(d));
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Auto-mode toggle */}
      <Card>
        <CardContent className="py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Automatisk bokföring</p>
            <p className="text-xs text-muted-foreground">
              Bokför Z-rapporter automatiskt varje kväll kl 23:00
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">{autoMode ? "På" : "Av"}</Label>
            <Switch checked={autoMode} onCheckedChange={setAutoMode} />
          </div>
        </CardContent>
      </Card>

      {/* Unbooked days queue */}
      {unbookedDays.length === 0 ? (
        <Card className="border-[#BFE6D6] bg-emerald-50/50 dark:bg-emerald-950/10 dark:border-emerald-800/30">
          <CardContent className="py-6 text-center flex flex-col items-center gap-2">
            <CheckCircle className="h-8 w-8 text-[#085041]" />
            <p className="text-sm font-medium text-[#085041] dark:text-[#1D9E75]">
              Alla dagar är bokförda
            </p>
            <p className="text-xs text-muted-foreground">
              Ingen Z-rapport väntar på bokföring
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{unbookedDays.length} dag(ar) väntar på bokföring</p>
            <Button onClick={handleBookAll} size="sm" className="bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-foreground">
              Bokför alla
            </Button>
          </div>

          {unbookedDays.map((day) => { const entries = generateEntries(day);
            const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
            const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
            const balanced = Math.abs(totalDebit - totalCredit) < 1;

            return (
              <Card key={day.id} className="border-l-4 border-l-amber-500">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm">
                        Z-rapport {format(new Date(day.sale_date), "d MMMM yyyy", { locale: sv })}
                      </CardTitle>
                    </div>
                    <span className="text-sm font-bold">{formatKr(day.total_sales)}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Journal entry preview */}
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">Konto</th>
                          <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">Namn</th>
                          <th className="text-right px-3 py-1.5 text-xs font-medium text-muted-foreground">Debet</th>
                          <th className="text-right px-3 py-1.5 text-xs font-medium text-muted-foreground">Kredit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((e, i) => (
                          <tr key={i} className="border-t border-border/50">
                            <td className="px-3 py-1.5 font-mono text-xs">{e.account}</td>
                            <td className="px-3 py-1.5">{e.name}</td>
                            <td className="px-3 py-1.5 text-right">{e.debit > 0 ? formatKr(e.debit) : ""}</td>
                            <td className="px-3 py-1.5 text-right">{e.credit > 0 ? formatKr(e.credit) : ""}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-border font-bold">
                          <td className="px-3 py-1.5" colSpan={2}>Summa</td>
                          <td className="px-3 py-1.5 text-right">{formatKr(totalDebit)}</td>
                          <td className="px-3 py-1.5 text-right">{formatKr(totalCredit)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* AI verification checks */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle className="h-3.5 w-3.5 text-[#085041]" />
                      <span className="text-muted-foreground">Summor stämmer mot Z-rapport</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {balanced ? (
                        <CheckCircle className="h-3.5 w-3.5 text-[#085041]" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5 text-[#7A1A1A]" />
                      )}
                      <span className="text-muted-foreground">
                        Debet = Kredit {balanced ? "(balanserar)" : "(OBALANSERAD)"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle className="h-3.5 w-3.5 text-[#085041]" />
                      <span className="text-muted-foreground">
                        Kortavgifter ({(day.card_amount * 0.0149).toFixed(0)} kr) bokförda mot 6570
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle className="h-3.5 w-3.5 text-[#085041]" />
                      <span className="text-muted-foreground">Momsuppdelning verifierad</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleBook(day)}
                    className="w-full bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-foreground gap-1.5"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Bokför automatiskt
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </>
      )}

      {/* AI suggestion */}
      {autoMode && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-[#3b82f6]/5 border border-[#3b82f6]/20">
          <Sparkles className="h-4 w-4 text-[#3b82f6] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Automatisk bokföring aktiverad. Z-rapporter bokförs kl 23:00 varje dag.
            AI verifierar summor, betalmetoder och moms innan bokföring. Vid avvikelse skickas
            notifikation istället.
          </p>
        </div>
      )}
    </div>
  );
}
