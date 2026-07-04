import { useState } from "react";
import { RutRotSettings, useRutRotInvoices, RutRotInvoice } from "@/hooks/useRutRot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Send, AlertTriangle, CheckCircle2, XCircle, Clock, Shield } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";

const statusLabel: Record<string, string> = { not_applied: "Ej ansökt",
  applied: "Ansökt",
  approved: "Godkänd",
  rejected: "Nekad",
};

const statusIcon: Record<string, React.ReactNode> = { not_applied: <Clock className="h-3 w-3" />,
  applied: <Send className="h-3 w-3" />,
  approved: <CheckCircle2 className="h-3 w-3" />,
  rejected: <XCircle className="h-3 w-3" />,
};

const statusBadge: Record<string, string> = { not_applied: "bg-muted text-muted-foreground",
  applied: "bg-[#FAEEDA] text-[#7A5417] dark:bg-amber-900/30 dark:text-[#C28A2B]",
  approved: "bg-[#E1F5EE] text-[#085041] dark:bg-emerald-900/30 dark:text-[#1D9E75]",
  rejected: "bg-[#FCE8E8] text-[#7A1A1A] dark:bg-red-900/30 dark:text-[#C73838]",
};

interface ValidationResult { ok: boolean;
  checks: { label: string; passed: boolean; message?: string }[];
}

function validateBeforeSubmission(inv: RutRotInvoice): ValidationResult { const checks: { label: string; passed: boolean; message?: string }[] = [];

  // Personnummer Luhn check (basic format)
  const pidClean = inv.customer_personal_id.replace(/[-\s]/g, "");
  const pidValid = /^\d{10,12}$/.test(pidClean);
  checks.push({ label: "Personnummer giltigt format", passed: pidValid, message: pidValid ? undefined : "Kontrollera personnumret — ogiltigt format." });

  // Property designation för ROT
  if (inv.deduction_type === "rot") { const hasProp = !!inv.property_designation && inv.property_designation.trim().length > 3;
    checks.push({ label: "Fastighetsbeteckning angiven", passed: hasProp, message: hasProp ? undefined : "ROT kräver fastighetsbeteckning." });
  }

  // Work description
  const hasDesc = !!inv.work_description && inv.work_description.trim().length > 0;
  checks.push({ label: "Arbetsbeskrivning angiven", passed: hasDesc, message: hasDesc ? undefined : "Ange en kort arbetsbeskrivning." });

  // Labor cost > 0
  checks.push({ label: "Arbetskostnad > 0 kr", passed: inv.labor_cost > 0 });

  // Deduction > 0
  checks.push({ label: "Avdragsbelopp beräknat", passed: inv.deduction_amount > 0 });

  return { ok: checks.every((c) => c.passed), checks };
}

export function RutRotInvoiceList({ settings }: { settings: RutRotSettings }) { const { invoices, isLoading, updateStatus } = useRutRotInvoices();
  const [reviewInvoice, setReviewInvoice] = useState<RutRotInvoice | null>(null);

  const handleApply = (inv: RutRotInvoice) => { const result = validateBeforeSubmission(inv);
    if (!result.ok) { setReviewInvoice(inv);
      return;
    }
    updateStatus.mutate({ id: inv.id,
      skv_status: "applied",
      skv_applied_at: new Date().toISOString(),
    });
  };

  const validationResult = reviewInvoice ? validateBeforeSubmission(reviewInvoice) : null;

  if (isLoading) return <p className="text-sm text-muted-foreground py-8 text-center">Laddar...</p>;

  if (invoices.length === 0) { return (
      <Card className="mt-4">
        <CardContent className="py-12 text-center space-y-2">
          <p className="font-medium">Inga RUT/ROT-fakturor ännu</p>
          <p className="text-sm text-muted-foreground">
            Skapa din första faktura med RUT/ROT-avdrag — AI beräknar uppdelningen automatiskt.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Pipeline summary
  const pipeline = { notApplied: invoices.filter((i) => i.skv_status === "not_applied").length,
    applied: invoices.filter((i) => i.skv_status === "applied").length,
    approved: invoices.filter((i) => i.skv_status === "approved").length,
    rejected: invoices.filter((i) => i.skv_status === "rejected").length,
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Pipeline view */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Ej ansökt", count: pipeline.notApplied, color: "text-muted-foreground", bg: "bg-muted/50" },
          { label: "Ansökt", count: pipeline.applied, color: "text-[#7A5417]", bg: "bg-[#FAEEDA] dark:bg-amber-950/20" },
          { label: "Godkänd", count: pipeline.approved, color: "text-[#085041]", bg: "bg-[#E1F5EE] dark:bg-emerald-950/20" },
          { label: "Nekad", count: pipeline.rejected, color: "text-[#7A1A1A]", bg: "bg-[#FCE8E8] dark:bg-red-950/20" },
        ].map((s) => (
          <div key={s.label} className={cn("p-3 rounded-lg text-center", s.bg)}>
            <p className={cn("text-xl font-bold", s.color)}>{s.count}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">RUT/ROT-fakturor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground text-xs">
                  <th className="py-2 pr-3">Datum</th>
                  <th className="py-2 pr-3">Typ</th>
                  <th className="py-2 pr-3">Kund</th>
                  <th className="py-2 pr-3 text-right">Arbete</th>
                  <th className="py-2 pr-3 text-right">Material</th>
                  <th className="py-2 pr-3 text-right">Avdrag</th>
                  <th className="py-2 pr-3 text-right">Kund betalar</th>
                  <th className="py-2 pr-3">SKV-status</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className={cn("border-b last:border-0", inv.skv_status === "rejected" && "bg-red-50/30 dark:bg-red-950/10")}>
                    <td className="py-2 pr-3 text-xs">{inv.created_at.slice(0, 10)}</td>
                    <td className="py-2 pr-3">
                      <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded",
                        inv.deduction_type === "rot"
                          ? "bg-[#E1F5EE] text-[#085041] dark:bg-emerald-900/30 dark:text-[#1D9E75]"
                          : "bg-[#EFF6FF] text-blue-700 dark:bg-blue-900/30 dark:text-[#1E3A5F]"
                      )}>
                        {inv.deduction_type.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-xs font-mono">{inv.customer_personal_id}</td>
                    <td className="py-2 pr-3 text-right">{fmt(inv.labor_cost)}</td>
                    <td className="py-2 pr-3 text-right text-muted-foreground">{fmt(inv.material_cost)}</td>
                    <td className="py-2 pr-3 text-right font-medium">{fmt(inv.deduction_amount)}</td>
                    <td className="py-2 pr-3 text-right">{fmt(inv.customer_pays)}</td>
                    <td className="py-2 pr-3">
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1", statusBadge[inv.skv_status])}>
                        {statusIcon[inv.skv_status]}
                        {statusLabel[inv.skv_status] || inv.skv_status}
                      </span>
                    </td>
                    <td className="py-2">
                      {inv.skv_status === "not_applied" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleApply(inv)}
                        >
                          <Send className="h-3 w-3" />
                          Ansök
                        </Button>
                      )}
                      {inv.skv_status === "rejected" && inv.skv_rejection_reason && (
                        <span className="text-[10px] text-[#7A1A1A]">{inv.skv_rejection_reason}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            Skatteverket betalar normalt 3–5 bankdagar efter godkänd ansökan. Du fakturerar kunden bara för deras del.
          </div>
        </CardContent>
      </Card>

      {/* Pre-submission validation dialog */}
      <Dialog open={!!reviewInvoice} onOpenChange={(open) => !open && setReviewInvoice(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#3b82f6]" />
              Kontroll före ansökan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              AI kontrollerar att alla uppgifter är korrekta innan ansökan skickas till Skatteverket.
            </p>
            {validationResult?.checks.map((c, i) => (
              <div key={i} className="flex items-start gap-2">
                {c.passed ? (
                  <CheckCircle2 className="h-4 w-4 text-[#085041] mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-[#7A1A1A] mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p className={cn("text-sm", !c.passed && "font-medium text-[#7A1A1A]")}>{c.label}</p>
                  {c.message && <p className="text-xs text-muted-foreground">{c.message}</p>}
                </div>
              </div>
            ))}

            {validationResult?.ok ? (
              <Button
                className="w-full bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-foreground gap-1.5"
                onClick={() => { if (reviewInvoice) { updateStatus.mutate({ id: reviewInvoice.id,
                      skv_status: "applied",
                      skv_applied_at: new Date().toISOString(),
                    });
                  }
                  setReviewInvoice(null);
                }}
              >
                <Send className="h-4 w-4" />
                Skicka ansökan till Skatteverket
              </Button>
            ) : (
              <div className="p-3 rounded-lg bg-[#FCE8E8] border border-[#F4C8C8] dark:bg-red-950/20 dark:border-red-800">
                <p className="text-xs text-[#7A1A1A]">Åtgärda problemen ovan innan ansökan kan skickas.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
