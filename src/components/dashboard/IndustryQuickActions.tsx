import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Zap, AlertTriangle, Info } from "lucide-react";
import { IndustryType, getIndustryTemplate } from "@/lib/industry-templates";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface IndustryQuickActionsProps { companyId: string;
  industry: IndustryType | null;
}

export const IndustryQuickActions = ({ companyId, industry }: IndustryQuickActionsProps) => { const template = getIndustryTemplate(industry);
  const [selectedAction, setSelectedAction] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateEntry = async () => { if (!selectedAction || !amount || parseFloat(amount) <= 0) { toast.error("Fyll i belopp");
      return;
    }

    const action = template.quickActions[selectedAction];
    setIsCreating(true);

    try { const amountValue = parseFloat(amount);

      // VALIDATION 1: Check för invoice-related actions
      if (action.title.toLowerCase().includes("faktura") || 
          action.title.toLowerCase().includes("betald")) { // Check if this should match an existing invoice
        const { data: invoices } = await supabase
          .from("invoices")
          .select("id, invoice_number, total_amount, status, journal_entry_id")
          .eq("company_id", companyId)
          .or("status.eq.sent,status.eq.overdue")
          .gte("total_amount", amountValue * 0.99) // Allow 1% variance
          .lte("total_amount", amountValue * 1.01);

        if (invoices && invoices.length > 0) { const matchedInvoice = invoices[0];
          
          // Check if payment already recorded
          if (matchedInvoice.journal_entry_id) { const { data: paymentEntries } = await supabase
              .from("journal_entries")
              .select(`
                id,
                description,
                journal_entry_lines!inner(account_id, debit)
              `)
              .eq("company_id", companyId)
              .contains("journal_entry_lines.debit", [{ account_id: "1930" }]);

            if (paymentEntries && paymentEntries.length > 0) { toast.error("Varning: Det finns redan en liknande betalning bokförd", { description: `Faktura ${matchedInvoice.invoice_number} kan redan vara betald. Kontrollera Fakturor-sidan.`
              });
              return;
            }
          }

          toast.info(`Hittade matchande faktura: ${matchedInvoice.invoice_number}`, { description: "Överväg att använda automatisk bankmatchning istället."
          });
        }
      }

      // VALIDATION 2: Check för duplicate entries
      const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
      const { data: recentEntries } = await supabase
        .from("journal_entries")
        .select(`
          id,
          description,
          journal_entry_lines(debit, credit)
        `)
        .eq("company_id", companyId)
        .gte("created_at", thirtySecondsAgo)
        .eq("description", description || action.title);

      if (recentEntries && recentEntries.length > 0) { const hasSameAmount = recentEntries.some(entry => 
          entry.journal_entry_lines?.some((line: any) => 
            line.debit === amountValue || line.credit === amountValue
          )
        );

        if (hasSameAmount) { toast.error("Möjlig dubblering upptäckt", { description: "En liknande verifikation skapades nyligen. Kontrollera bokföringen."
          });
          return;
        }
      }

      // Get account IDs
      const { data: accounts } = await supabase
        .from("chart_of_accounts")
        .select("id, account_number")
        .eq("company_id", companyId)
        .in("account_number", action.accounts.flatMap(a => [a.debit, a.credit]));

      if (!accounts || accounts.length === 0) { toast.error("Kontona finns inte i kontoplanen");
        return;
      }

      // Create journal entry
      const { data: entry, error: entryError } = await supabase
        .from("journal_entries")
        .insert([{ company_id: companyId,
          entry_date: new Date().toISOString().split("T")[0],
          description: description || action.title,
          status: "draft",
          created_by: (await supabase.auth.getUser()).data.user?.id,
        }])
        .select()
        .maybeSingle();

      if (entryError) throw entryError;
      if (!entry) throw new Error('Failed to create journal entry');

      // Create lines
      const lines = action.accounts.map(({ debit, credit }) => { const debitAccount = accounts.find(a => a.account_number === debit);
        const creditAccount = accounts.find(a => a.account_number === credit);

        return { journal_entry_id: entry.id,
          account_id: debit ? debitAccount?.id : creditAccount?.id,
          debit: debit ? amountValue : 0,
          credit: credit ? amountValue : 0,
        };
      });

      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert(lines);

      if (linesError) throw linesError;

      toast.success("✓ Verifikation skapad!", { description: "Kontrollera att allt stämmer under Bokföring"
      });
      setSelectedAction(null);
      setAmount("");
      setDescription("");
    } catch (error: any) { console.error("Error creating entry:", error);
      toast.error("Kunde inte skapa verifikation");
    } finally { setIsCreating(false);
    }
  };

  if (template.quickActions.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Snabbåtgärder för {template.name}
              </CardTitle>
              <CardDescription>
                Vanliga transaktioner för din bransch
              </CardDescription>
            </div>
            <Badge variant="outline">{template.quickActions.length} mallar</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Tips:</strong> De flesta transaktioner bokförs automatiskt när du skapar fakturor eller synkar bankkontot. 
              Använd snabbåtgärderna endast för speciella händelser som inte täcks av automatiken.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {template.quickActions.map((action, idx) => (
              <Button
                key={idx}
                variant="outline"
                className="h-auto flex-col items-start p-4 text-left"
                onClick={() => setSelectedAction(idx)}
              >
                <span className="font-semibold">{action.title}</span>
                <span className="text-xs text-muted-foreground mt-1">
                  {action.description}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={selectedAction !== null} onOpenChange={() => setSelectedAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedAction !== null && template.quickActions[selectedAction].title}
            </DialogTitle>
            <DialogDescription>
              {selectedAction !== null && template.quickActions[selectedAction].description}
            </DialogDescription>
          </DialogHeader>

          {selectedAction !== null && (
            template.quickActions[selectedAction].title.toLowerCase().includes("faktura") ||
            template.quickActions[selectedAction].title.toLowerCase().includes("betald")
          ) && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Normalt bokförs fakturor automatiskt när de skickas, och betalningar matchas via banken. 
                Använd bara manuell bokföring om du är säker på att transaktionen inte redan är registrerad.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Belopp (SEK)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beskrivning (valfri)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ytterligare beskrivning..."
              />
            </div>

            {selectedAction !== null && (
              <div className="bg-muted p-3 rounded-lg text-sm">
                <p className="font-semibold mb-2">Konteringsmallar:</p>
                {template.quickActions[selectedAction].accounts.map((acc, idx) => (
                  <div key={idx} className="flex justify-between py-1">
                    <span>Debet: {acc.debit}</span>
                    <span>Kredit: {acc.credit}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setSelectedAction(null)}>
                Avbryt
              </Button>
              <Button onClick={handleCreateEntry} disabled={isCreating}>
                {isCreating ? "Skapar..." : "Skapa verifikation"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
