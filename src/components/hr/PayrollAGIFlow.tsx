import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Send, CheckCircle, AlertTriangle, Loader2, ArrowRight, Shield, BookOpen } from "lucide-react";

interface PayrollLine { id: string;
  employee_name: string;
  gross_salary: number;
  tax_deduction: number;
  employer_contributions: number;
  net_salary: number;
}

interface PayrollAGIFlowProps { companyId: string;
  payrollRunId: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  onStatusChange?: () => void;
}

export const PayrollAGIFlow = ({ companyId, payrollRunId, periodStart, periodEnd, status, onStatusChange }: PayrollAGIFlowProps) => { const [isOpen, setIsOpen] = useState(false);
  const [lines, setLines] = useState<PayrollLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"review" | "booking" | "agi" | "done">("review");
  const [bookingPreview, setBookingPreview] = useState<any>(null);
  const [agiStatus, setAgiStatus] = useState<"pending" | "sending" | "sent" | "error">("pending");

  const loadPayrollDetails = async () => { setLoading(true);
    try { const { data, error } = await supabase
        .from("payroll_lines")
        .select(`
          id, gross_salary, tax_deduction, employer_contributions, net_salary,
          employees ( first_name, last_name )
        `)
        .eq("payroll_run_id", payrollRunId);

      if (error) throw error;
      setLines((data || []).map((l: any) => ({ ...l,
        employee_name: `${l.employees?.first_name || ""} ${l.employees?.last_name || ""}`.trim(),
      })));
    } catch (error) { toast.error("Kunde inte ladda lönedetaljer");
    } finally { setLoading(false);
    }
  };

  const handleOpen = () => { setIsOpen(true);
    setStep("review");
    loadPayrollDetails();
  };

  const totalGross = lines.reduce((s, l) => s + l.gross_salary, 0);
  const totalTax = lines.reduce((s, l) => s + l.tax_deduction, 0);
  const totalEmployer = lines.reduce((s, l) => s + l.employer_contributions, 0);
  const totalNet = lines.reduce((s, l) => s + l.net_salary, 0);

  const generateBooking = () => { setBookingPreview({ lines: [
        { account: "7010", name: "Löner", debit: totalGross, credit: 0 },
        { account: "7510", name: "Arbetsgivaravgifter", debit: totalEmployer, credit: 0 },
        { account: "2710", name: "Personalskatt", debit: 0, credit: totalTax },
        { account: "2731", name: "Sociala avgifter", debit: 0, credit: totalEmployer },
        { account: "1930", name: "Företagskonto", debit: 0, credit: totalNet },
      ],
    });
    setStep("booking");
  };

  const confirmBooking = async () => { try { const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Inte inloggad");

      // Create journal entry för payroll
      const { data: entry, error: entryError } = await supabase
        .from("journal_entries")
        .insert({ company_id: companyId,
          entry_date: periodEnd,
          description: `Lön ${periodStart} - ${periodEnd}`,
          status: "approved",
          created_by: user.id,
        })
        .select()
        .maybeSingle();

      if (entryError || !entry) throw entryError || new Error("Misslyckades");

      // Find account IDs
      const { data: accounts } = await supabase
        .from("chart_of_accounts")
        .select("id, account_number")
        .eq("company_id", companyId)
        .in("account_number", ["7010", "7510", "2710", "2731", "1930"]);

      const acctMap = new Map((accounts || []).map(a => [a.account_number, a.id]));

      const journalLines = bookingPreview.lines
        .filter((l: any) => acctMap.has(l.account))
        .map((l: any) => ({ journal_entry_id: entry.id,
          account_id: acctMap.get(l.account),
          debit: l.debit,
          credit: l.credit,
        }));

      if (journalLines.length > 0) { const { error: linesError } = await supabase
          .from("journal_entry_lines")
          .insert(journalLines);
        if (linesError) throw linesError;
      }

      toast.success("Lönebokföring skapad!");
      setStep("agi");
    } catch (error: any) { toast.error(error.message || "Kunde inte bokföra lön");
    }
  };

  const sendAGI = async () => { setAgiStatus("sending");
    try { const { data, error } = await supabase.functions.invoke("prepare-agi-submission", { body: { company_id: companyId, payroll_run_id: payrollRunId },
      });

      if (error) throw error;
      setAgiStatus("sent");
      setStep("done");
      toast.success("AGI förberedd! Signera med BankID för att skicka till Skatteverket.");
      onStatusChange?.();
    } catch (error: any) { setAgiStatus("error");
      toast.error(error.message || "Kunde inte förbereda AGI");
    }
  };

  const steps = [
    { key: "review", label: "Granska", icon: FileText },
    { key: "booking", label: "Bokför", icon: BookOpen },
    { key: "agi", label: "AGI", icon: Send },
    { key: "done", label: "Klart", icon: CheckCircle },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" onClick={handleOpen}>
          <ArrowRight className="w-4 h-4 mr-1" />
          Lönflöde
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Löneflöde: {periodStart} → {periodEnd}
          </DialogTitle>
          <DialogDescription>Granska → Bokför → Skicka AGI</DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-lg">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${ step === s.key ? "bg-primary text-primary-foreground" :
                steps.findIndex(st => st.key === step) > i ? "bg-green-600 text-white" :
                "bg-muted text-muted-foreground"
              }`}>
                {steps.findIndex(st => st.key === step) > i ? <CheckCircle className="w-4 h-4" /> : <s.icon className="w-3.5 h-3.5" />}
              </div>
              <span className="text-xs font-medium hidden sm:inline">{s.label}</span>
              {i < steps.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground mx-1" />}
            </div>
          ))}
        </div>

        {/* Step: Review */}
        {step === "review" && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : (
              <>
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">Anställd</th>
                        <th className="p-2 text-right">Brutto</th>
                        <th className="p-2 text-right">Skatt</th>
                        <th className="p-2 text-right">Arb.avg.</th>
                        <th className="p-2 text-right">Netto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map(l => (
                        <tr key={l.id} className="border-t">
                          <td className="p-2">{l.employee_name}</td>
                          <td className="p-2 text-right font-mono">{l.gross_salary.toLocaleString()}</td>
                          <td className="p-2 text-right font-mono text-destructive">{l.tax_deduction.toLocaleString()}</td>
                          <td className="p-2 text-right font-mono text-[#7A5417]">{l.employer_contributions.toLocaleString()}</td>
                          <td className="p-2 text-right font-mono font-medium">{l.net_salary.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-bold bg-muted/50">
                        <td className="p-2">Totalt</td>
                        <td className="p-2 text-right font-mono">{totalGross.toLocaleString()}</td>
                        <td className="p-2 text-right font-mono text-destructive">{totalTax.toLocaleString()}</td>
                        <td className="p-2 text-right font-mono text-[#7A5417]">{totalEmployer.toLocaleString()}</td>
                        <td className="p-2 text-right font-mono">{totalNet.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="flex justify-end">
                  <Button onClick={generateBooking} disabled={lines.length === 0}>
                    Nästa: Bokför <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step: Booking */}
        {step === "booking" && bookingPreview && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Bokföringsförslag</CardTitle>
                <CardDescription>Kontrollera konteringen innan bokning</CardDescription>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Konto</th>
                      <th className="p-2 text-left">Namn</th>
                      <th className="p-2 text-right">Debet</th>
                      <th className="p-2 text-right">Kredit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookingPreview.lines.map((l: any, i: number) => (
                      <tr key={i} className="border-t">
                        <td className="p-2 font-mono">{l.account}</td>
                        <td className="p-2">{l.name}</td>
                        <td className="p-2 text-right font-mono">{l.debit > 0 ? l.debit.toLocaleString() : "—"}</td>
                        <td className="p-2 text-right font-mono">{l.credit > 0 ? l.credit.toLocaleString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("review")}>Tillbaka</Button>
              <Button onClick={confirmBooking}>
                <BookOpen className="w-4 h-4 mr-1" />Bekräfta bokföring
              </Button>
            </div>
          </div>
        )}

        {/* Step: AGI */}
        {step === "agi" && (
          <div className="space-y-4 text-center py-6">
            <Card>
              <CardContent className="py-6 space-y-4">
                <Send className="w-10 h-10 text-primary mx-auto" />
                <h3 className="text-lg font-semibold">Skicka arbetsgivardeklaration (AGI)</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Individuppgifter: {lines.length} anställda</p>
                  <p>Total skatt: {totalTax.toLocaleString()} kr</p>
                  <p>Totala arbetsgivaravgifter: {totalEmployer.toLocaleString()} kr</p>
                </div>
                <Button
                  onClick={sendAGI}
                  disabled={agiStatus === "sending"}
                  className="mt-4"
                  size="lg"
                >
                  {agiStatus === "sending" ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Förbereder AGI...</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" />Förbered och skicka AGI</>
                  )}
                </Button>
                {agiStatus === "error" && (
                  <p className="text-sm text-destructive flex items-center justify-center gap-1">
                    <AlertTriangle className="w-4 h-4" />Kunde inte skicka. Försök igen.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <div className="text-center py-8 space-y-4">
            <CheckCircle className="w-16 h-16 text-[#085041] mx-auto" />
            <h3 className="text-xl font-bold">Löneflöde klart!</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>✅ Lön granskad</p>
              <p>✅ Bokföring skapad</p>
              <p>✅ AGI förberedd</p>
            </div>
            <Button onClick={() => setIsOpen(false)}>Stäng</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
