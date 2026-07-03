import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";

function fmt(n: number) { return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);
}

interface Props { companyType: "ab" | "ef";
}

interface TaxReserve { id: string;
  type: string;
  year_set: number;
  amount: number;
  must_reverse_by: string | null;
  status: string;
}

export function SkattereserverTab({ companyType }: Props) { const [reserves, setReserves] = useState<TaxReserve[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadReserves();
  }, []);

  async function loadReserves() { const companyId = localStorage.getItem("selectedCompanyId");
    if (!companyId) { setLoading(false); return; }

    const { data } = await supabase
      .from("tax_reserves")
      .select("*")
      .eq("company_id", companyId)
      .eq("status", "active")
      .order("year_set", { ascending: true });

    setReserves((data as TaxReserve[]) || []);
    setLoading(false);
  }

  const periodFonder = reserves.filter(r => r.type === "periodiseringsfond");
  const expansionFonder = reserves.filter(r => r.type === "expansionsfond");
  const totalPeriod = periodFonder.reduce((s, r) => s + Number(r.amount), 0);

  // Schablonränta: statslåneräntan 1 nov föregående år + 1% (approx 3.62% for 2025)
  const schablonRanta = 0.0362;
  const schablonIntakt = Math.round(totalPeriod * schablonRanta);

  return (
    <div className="space-y-6">
      {/* Periodiseringsfonder */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Periodiseringsfonder</CardTitle>
            <Badge variant="secondary" className="text-xs">Max 25% av taxerad inkomst</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {periodFonder.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>År avsatt</TableHead>
                  <TableHead className="text-right">Belopp</TableHead>
                  <TableHead className="text-right">Återförs senast</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Åtgärd</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periodFonder.map(f => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.year_set}</TableCell>
                    <TableCell className="text-right">{fmt(Number(f.amount))} kr</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {f.must_reverse_by || `${f.year_set + 6}-12-31`}
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">Aktiv</Badge></TableCell>
                    <TableCell className="text-right">
                      <ComingSoonButton tooltipText="Skapar återföring som verifikationsutkast i journalen">
                        Återför
                      </ComingSoonButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Inga periodiseringsfonder registrerade. Använd knappen nedan för att avsätta.
            </p>
          )}

          {/* AI recommendation */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">AI-rekommendation</p>
                <p className="text-xs text-muted-foreground">
                  Baserat på årets resultat kan du avsätta upp till 25% av taxerad inkomst
                  i periodiseringsfond och minska årets bolagsskatt.
                </p>
                <ComingSoonButton tooltipText="Direkt bokföring: Debet 8811 / Kredit 2120">
                  Bokför avsättning
                </ComingSoonButton>
              </div>
            </div>
          </div>

          {/* Schablonränta */}
          {totalPeriod > 0 && (
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Schablonintäkt 2025:</span>{" "}
                {fmt(schablonIntakt)} kr (baserat på {fmt(totalPeriod)} kr × {(schablonRanta * 100).toFixed(2)}%)
                — bokförs som intäkt i INK2.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expansionsfond (EF only) */}
      {companyType === "ef" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Expansionsfond</CardTitle>
              <Badge variant="secondary" className="text-xs">Max 79% av justerat överskott</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {expansionFonder.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>År</TableHead>
                    <TableHead className="text-right">Belopp</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expansionFonder.map(f => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.year_set}</TableCell>
                      <TableCell className="text-right">{fmt(Number(f.amount))} kr</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">Aktiv</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Ingen expansionsfond registrerad.
              </p>
            )}
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              Expansionsfondsskatt: 20,6% på avsättningen (konto 2510).
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
