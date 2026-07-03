import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface CCAccountOverrideDialogProps {
  open: boolean;
  onClose: () => void;
  transactionId: string | null;
  companyId: string;
  merchant: string;
  currentAccount?: string;
  currentVatCode?: string;
  onSaved: () => void;
}

export function CCAccountOverrideDialog({
  open,
  onClose,
  transactionId,
  companyId,
  merchant,
  currentAccount,
  currentVatCode,
  onSaved,
}: CCAccountOverrideDialogProps) {
  const [account, setAccount] = useState(currentAccount || "");
  const [vatCode, setVatCode] = useState(currentVatCode || "25");
  const [saveAsRule, setSaveAsRule] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAccount(currentAccount || "");
    setVatCode(currentVatCode || "25");
  }, [currentAccount, currentVatCode, transactionId]);

  const { data: accounts = [] } = useQuery({
    queryKey: ["cc-coa", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("chart_of_accounts")
        .select("account_number, account_name, account_type")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .in("account_type", ["expense", "asset"])
        .order("account_number");
      return data || [];
    },
    enabled: !!companyId && open,
  });

  const handleSave = async () => {
    if (!transactionId || !account) {
      toast({ title: "Konto krävs", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const acct = accounts.find((a: any) => a.account_number === account);
      const ai_suggestion = {
        debit_account: account,
        debit_account_name: acct?.account_name || "",
        vat_code: vatCode,
        confidence: 1,
        explanation: "Användarens manuella val",
      };

      const { error } = await supabase
        .from("credit_card_transactions")
        .update({
          ai_suggestion,
          confidence: 1,
          status: "ready",
        })
        .eq("id", transactionId);
      if (error) throw error;

      if (saveAsRule && merchant) {
        await supabase.from("cc_learning_rules").insert({
          company_id: companyId,
          merchant_pattern: merchant.toLowerCase().slice(0, 60),
          expense_account: account,
          expense_account_name: acct?.account_name || null,
          vat_code: vatCode,
        });
      }

      toast({ title: "Sparat", description: saveAsRule ? "Regel sparad för framtida transaktioner." : "Konto uppdaterat." });
      onSaved();
      onClose();
    } catch (e: any) {
      toast({ title: "Fel", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ändra konto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Leverantör</Label>
            <p className="font-medium">{merchant || "Okänd"}</p>
          </div>
          <div>
            <Label htmlFor="acct">Konto</Label>
            <Select value={account} onValueChange={setAccount}>
              <SelectTrigger id="acct">
                <SelectValue placeholder="Välj konto" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {accounts.map((a: any) => (
                  <SelectItem key={a.account_number} value={a.account_number}>
                    {a.account_number} {a.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="vat">Momssats</Label>
            <Select value={vatCode} onValueChange={setVatCode}>
              <SelectTrigger id="vat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25%</SelectItem>
                <SelectItem value="12">12%</SelectItem>
                <SelectItem value="6">6%</SelectItem>
                <SelectItem value="0">0% / Momsfri</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-start gap-2 pt-2">
            <Checkbox id="rule" checked={saveAsRule} onCheckedChange={(v) => setSaveAsRule(!!v)} />
            <Label htmlFor="rule" className="text-sm leading-tight cursor-pointer">
              Spara som regel — framtida köp från <span className="font-medium">{merchant}</span> bokförs automatiskt på {account || "..."}
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Avbryt</Button>
          <Button onClick={handleSave} disabled={saving || !account}>
            {saving ? "Sparar..." : "Spara"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
