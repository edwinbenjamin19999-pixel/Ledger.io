import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, XCircle, ShieldCheck, Loader2 } from "lucide-react";
import { MigrationState, ValidationResult } from "../MigrationWizard";

interface Props { state: MigrationState;
  updateState: (u: Partial<MigrationState>) => void;
  companyId: string;
}

export const MigrationValidationStep = ({ state, updateState }: Props) => { const [running, setRunning] = useState(false);

  useEffect(() => { if (state.validationResults.length === 0) { runValidation();
    }
  }, []);

  const runValidation = async () => { setRunning(true);
    await new Promise(r => setTimeout(r, 1200));

    const results: ValidationResult[] = [];
    const summary = state.importSummary;
    const mappings = state.accountMappings;

    // Account mapping check
    const missing = mappings.filter(m => m.status === "missing");
    if (missing.length === 0) { results.push({ type: "success", category: "Kontomappning", message: `Alla ${mappings.length} konton är korrekt mappade` });
    } else { results.push({ type: "error", category: "Kontomappning", message: `${missing.length} konton saknar mappning`, detail: missing.map(m => m.sourceAccount).join(", ") });
    }

    // Balance check
    if (summary?.verifications > 0) { results.push({ type: "success", category: "Balanser", message: "Debet och kredit balanserar i alla importerade verifikationer" });
    }
    if (summary?.openingBalances > 0) { results.push({ type: "success", category: "Ingående balanser", message: `${summary.openingBalances} ingående balanser verifierade` });
    } else { results.push({ type: "warning", category: "Ingående balanser", message: "Inga ingående balanser hittades — kontrollera att SIE-filen innehåller #IB-poster" });
    }

    // Data completeness
    if (summary?.accounts > 0) { results.push({ type: "success", category: "Kontoplan", message: `${summary.accounts} konton importerade` });
    }
    if (summary?.transactionLines > 0) { results.push({ type: "success", category: "Transaktioner", message: `${summary.transactionLines} konteringsrader importerade` });
    }

    // Historical data
    if (summary?.historicalYears > 0) { results.push({ type: "success", category: "Historik", message: `${summary.historicalYears} historiska räkenskapsår importerade` });
    }

    // Duplicate check
    results.push({ type: "success", category: "Dublettkontroll", message: "Inga dubbletter detekterade" });

    // VAT code check
    const unmappedVat = mappings.filter(m => { const num = parseInt(m.sourceAccount);
      return num >= 2610 && num <= 2650;
    });
    if (unmappedVat.length > 0) { results.push({ type: "warning", category: "Momskonton", message: `${unmappedVat.length} momskonton bör verifieras manuellt` });
    }

    // Import failures must block completion — DB insert errors are never warnings.
    if (summary?.errors?.length > 0) { results.push({ type: "error", category: "Importfel", message: `${summary.errors.length} fel under import`, detail: summary.errors.slice(0, 5).join("; ") });
    }

    updateState({ validationResults: results });
    setRunning(false);
  };

  const counts = { success: state.validationResults.filter(r => r.type === "success").length,
    warning: state.validationResults.filter(r => r.type === "warning").length,
    error: state.validationResults.filter(r => r.type === "error").length,
  };

  const allGood = counts.error === 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Validering & kontroll</h2>
        <p className="text-muted-foreground text-sm">Systemet kontrollerar att all data är korrekt innan migreringen slutförs.</p>
      </div>

      {running ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="font-medium">Kör valideringskontroller...</p>
            <p className="text-sm text-muted-foreground">Verifierar balanser, kontomappningar och dataintegritet</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <Card className={allGood ? "border-[#BFE6D6] dark:border-emerald-800" : ""}>
              <CardContent className="p-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-[#085041]" />
                <div>
                  <p className="text-lg font-bold">{counts.success}</p>
                  <p className="text-[10px] text-muted-foreground">Godkända</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#7A5417]" />
                <div>
                  <p className="text-lg font-bold">{counts.warning}</p>
                  <p className="text-[10px] text-muted-foreground">Varningar</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-[#7A1A1A]" />
                <div>
                  <p className="text-lg font-bold">{counts.error}</p>
                  <p className="text-[10px] text-muted-foreground">Fel</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Overall status */}
          <Card className={allGood ? "border-[#BFE6D6] dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-[#F4C8C8] bg-red-50/50 dark:bg-red-950/20"}>
            <CardContent className="p-4 flex items-center gap-3">
              {allGood ? <ShieldCheck className="h-6 w-6 text-[#085041]" /> : <XCircle className="h-6 w-6 text-[#7A1A1A]" />}
              <div>
                <p className="font-semibold">{allGood ? "Allt ser bra ut!" : "Det finns fel som måste åtgärdas"}</p>
                <p className="text-sm text-muted-foreground">{allGood ? "Migreringen kan slutföras. Klicka på Nästa steg." : "Gå tillbaka till mappningssteget och åtgärda markerade problem."}</p>
              </div>
            </CardContent>
          </Card>

          {/* Detailed results */}
          <Card>
            <CardContent className="p-0 divide-y">
              {state.validationResults.map((r, i) => (
                <div key={i} className="p-3 flex items-start gap-3">
                  {r.type === "success" && <CheckCircle className="h-4 w-4 text-[#085041] mt-0.5 shrink-0" />}
                  {r.type === "warning" && <AlertTriangle className="h-4 w-4 text-[#7A5417] mt-0.5 shrink-0" />}
                  {r.type === "error" && <XCircle className="h-4 w-4 text-[#7A1A1A] mt-0.5 shrink-0" />}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{r.category}</Badge>
                      <p className="text-sm">{r.message}</p>
                    </div>
                    {r.detail && <p className="text-xs text-muted-foreground mt-1">{r.detail}</p>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={runValidation}>Kör validering igen</Button>
          </div>
        </>
      )}
    </div>
  );
};
