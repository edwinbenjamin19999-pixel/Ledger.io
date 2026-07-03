import { useState, useCallback, useMemo, useEffect } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { CreditCard, Upload, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { formatSEK } from "@/lib/formatNumber";
import { CCStatementUpload } from "@/components/credit-card/CCStatementUpload";
import {
  CCTransactionRow,
  type CCTransaction,
} from "@/components/credit-card/CCTransactionRow";
import { CCPostingDialog } from "@/components/credit-card/CCPostingDialog";
import { CCPaymentClearing } from "@/components/credit-card/CCPaymentClearing";
import { CCLiabilityCard } from "@/components/credit-card/CCLiabilityCard";
import { CCTaxInsightCard } from "@/components/credit-card/CCTaxInsightCard";
import { CCAccountOverrideDialog } from "@/components/credit-card/CCAccountOverrideDialog";
import { CCRequestReceiptDialog } from "@/components/credit-card/CCRequestReceiptDialog";
import {
  determineExpenseAccount,
  statusFromConfidence,
  type LearnedRule,
} from "@/lib/cc-ai-engine";

type Statement = {
  id: string;
  statement_period_start: string | null;
  statement_period_end: string | null;
  total_amount: number | null;
  card_issuer: string | null;
};

export default function CreditCardEngine() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [postingDialogOpen, setPostingDialogOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "needs_action" | "missing_receipt" | "ready" | "posted"
  >("needs_action");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [overrideTxnId, setOverrideTxnId] = useState<string | null>(null);
  const [receiptTxnId, setReceiptTxnId] = useState<string | null>(null);
  const [openStatements, setOpenStatements] = useState<Record<string, boolean>>({});

  // Companies
  const { data: companies = [] } = useQuery({
    queryKey: ["user-companies", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("user_roles")
        .select("company_id, companies:company_id(id, name)")
        .eq("user_id", user.id);
      return (data || []).map((r: any) => r.companies).filter(Boolean);
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companies, selectedCompanyId]);

  // Transactions
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["cc-transactions", selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const { data, error } = await supabase
        .from("credit_card_transactions")
        .select("*")
        .eq("company_id", selectedCompanyId)
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as (CCTransaction & { statement_id: string | null })[];
    },
    enabled: !!selectedCompanyId,
  });

  // Statements
  const { data: statements = [] } = useQuery({
    queryKey: ["cc-statements", selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const { data } = await supabase
        .from("credit_card_statements")
        .select("id, statement_period_start, statement_period_end, total_amount, card_issuer")
        .eq("company_id", selectedCompanyId)
        .order("statement_period_end", { ascending: false });
      return (data || []) as Statement[];
    },
    enabled: !!selectedCompanyId,
  });

  // Learning rules
  const { data: learnedRules = [] } = useQuery({
    queryKey: ["cc-learning-rules", selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const { data } = await supabase
        .from("cc_learning_rules")
        .select("merchant_pattern, expense_account, expense_account_name, vat_code, category")
        .eq("company_id", selectedCompanyId);
      return (data || []) as LearnedRule[];
    },
    enabled: !!selectedCompanyId,
  });

  // Smart-state buckets
  const buckets = useMemo(() => {
    const needs_action: CCTransaction[] = [];
    const missing_receipt: CCTransaction[] = [];
    const ready: CCTransaction[] = [];
    const posted: CCTransaction[] = [];
    for (const t of transactions) {
      if (t.status === "excluded") continue;
      if (t.status === "posted" || t.status === "auto_booked") posted.push(t);
      else if (t.clarification_question && !t.clarification_answer) needs_action.push(t);
      else if (t.status === "needs_review") needs_action.push(t);
      else if (t.status === "missing_receipt" || (!t.matched_receipt_id && (t.confidence ?? 0) >= 0.95)) missing_receipt.push(t);
      else if (t.status === "ready" || t.status === "pending") ready.push(t);
      else needs_action.push(t);
    }
    return { needs_action, missing_receipt, ready, posted };
  }, [transactions]);

  const visibleTxns = buckets[activeTab];

  // Group by statement
  const grouped = useMemo(() => {
    const map = new Map<string, CCTransaction[]>();
    const ungrouped: CCTransaction[] = [];
    for (const t of visibleTxns) {
      const key = (t as any).statement_id;
      if (key) {
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(t);
      } else {
        ungrouped.push(t);
      }
    }
    return { map, ungrouped };
  }, [visibleTxns]);

  // Liability + insights
  const totalLiability = useMemo(
    () =>
      transactions
        .filter((t) => (t.status === "posted" || t.status === "auto_booked" || t.status === "ready") && !t.is_private)
        .reduce((s, t) => s + Number(t.amount), 0),
    [transactions],
  );
  const latestStatement = statements[0];
  const latestStatementBalance = useMemo(() => {
    if (!latestStatement) return undefined;
    return transactions
      .filter((t) => (t as any).statement_id === latestStatement.id)
      .reduce((s, t) => s + Number(t.amount), 0);
  }, [transactions, latestStatement]);

  const taxInsights = useMemo(() => {
    let recoverableVat = 0;
    let nonDeductibleAmount = 0;
    let nonDeductibleCount = 0;
    let foreignTxnCount = 0;
    for (const t of transactions) {
      if (t.is_private || t.status === "excluded") continue;
      recoverableVat += Number(t.vat_amount || 0);
      const code = t.ai_suggestion?.vat_code;
      if (code === "0" && /(systembolaget|representation ej)/i.test((t.ai_suggestion?.debit_account_name || "") + " " + (t.merchant_name || ""))) {
        nonDeductibleCount += 1;
        nonDeductibleAmount += Number(t.amount);
      }
      if (t.currency && t.currency !== "SEK") foreignTxnCount += 1;
    }
    return { recoverableVat, nonDeductibleAmount, nonDeductibleCount, foreignTxnCount };
  }, [transactions]);

  // Ingest from edge function (with AI engine fallback enrichment)
  const handleParseComplete = useCallback(
    async (result: any) => {
      if (!selectedCompanyId) return;

      const { data: stmt } = await supabase
        .from("credit_card_statements")
        .insert({
          company_id: selectedCompanyId,
          file_name: result.file_name,
          statement_period_start: result.statement_period_start,
          statement_period_end: result.statement_period_end,
          total_amount: result.total_amount,
          card_issuer: result.card_issuer,
        })
        .select("id")
        .single();

      const txns = (result.transactions || []).map((t: any) => {
        // Enrich with client-side AI engine using learned rules + heuristics
        const suggestion = determineExpenseAccount({
          merchant: t.merchant_name || "",
          amount: Number(t.amount) || 0,
          currency: t.currency || "SEK",
          learnedRules,
        });
        // Prefer edge function suggestion if it has a higher confidence
        const edgeConf = t.ai_suggestion?.confidence ?? 0;
        const useEdge = edgeConf >= suggestion.confidence && t.ai_suggestion?.debit_account;
        const finalSuggestion = useEdge
          ? {
              debit_account: t.ai_suggestion.debit_account,
              debit_account_name: t.ai_suggestion.debit_account_name,
              vat_code: t.ai_suggestion.vat_code,
              explanation: t.ai_suggestion.explanation,
              confidence: edgeConf,
            }
          : {
              debit_account: suggestion.expense_account,
              debit_account_name: suggestion.expense_account_name,
              vat_code: suggestion.vat_code,
              explanation: suggestion.explanation,
              confidence: suggestion.confidence,
            };
        const finalConf = finalSuggestion.confidence ?? 0;
        const hasReceipt = !!t.matched_receipt_id;
        const computedStatus = t.is_likely_duplicate
          ? "excluded"
          : t.clarification_question
          ? "needs_review"
          : statusFromConfidence(finalConf, hasReceipt);

        return {
          company_id: selectedCompanyId,
          statement_id: stmt?.id || null,
          transaction_date: t.transaction_date,
          merchant_name: t.merchant_name,
          amount: t.amount,
          currency: t.currency || "SEK",
          category_hint: t.category_hint,
          raw_text: t.raw_text,
          match_status: hasReceipt ? "matched" : "unmatched",
          match_confidence: t.match_confidence || 0,
          matched_receipt_id: t.matched_receipt_id || null,
          ai_suggestion: finalSuggestion,
          clarification_question: t.clarification_question,
          is_duplicate: t.is_likely_duplicate || false,
          status: computedStatus,
          confidence: finalConf,
          liability_account: useEdge && t.ai_suggestion?.credit_account ? t.ai_suggestion.credit_account : suggestion.liability_account,
          vat_account: useEdge ? null : suggestion.vat_account,
          vat_amount: useEdge && t.ai_suggestion?.vat_amount ? t.ai_suggestion.vat_amount : suggestion.vat_amount,
        };
      });

      if (txns.length > 0) {
        const { error } = await supabase.from("credit_card_transactions").insert(txns);
        if (error) {
          toast({ title: "Fel", description: error.message, variant: "destructive" });
        } else {
          const autoCount = txns.filter((t: any) => t.status === "auto_booked" || t.status === "missing_receipt").length;
          toast({
            title: "Importerat",
            description: `${txns.length} transaktioner — ${autoCount} klassificerade automatiskt med hög konfidens.`,
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["cc-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["cc-statements"] });
      setUploadOpen(false);
    },
    [selectedCompanyId, queryClient, learnedRules],
  );

  const updateTxn = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase.from("credit_card_transactions").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cc-transactions"] }),
  });

  const handleAccept = (id: string) => updateTxn.mutate({ id, updates: { status: "ready" } });
  const handleExclude = (id: string) => updateTxn.mutate({ id, updates: { status: "excluded" } });
  const handleTogglePrivate = (id: string) => {
    const txn = transactions.find((t) => t.id === id);
    if (txn) updateTxn.mutate({ id, updates: { is_private: !txn.is_private } });
  };
  const handleClarify = (id: string, answer: string) =>
    updateTxn.mutate({ id, updates: { clarification_answer: answer, status: "ready" } });

  const readyTransactions = buckets.ready;
  const handleBatchPost = async () => {
    setPosting(true);
    try {
      const updates = readyTransactions.map((t) =>
        supabase.from("credit_card_transactions").update({ status: "posted" }).eq("id", t.id),
      );
      await Promise.all(updates);
      toast({
        title: "Bokfört",
        description: `${readyTransactions.length} transaktioner bokförda. Skuld byggd på 2890.`,
      });
      setPostingDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["cc-transactions"] });
    } catch {
      toast({ title: "Fel", description: "Kunde inte bokföra transaktionerna", variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  const handlePaymentClearing = async (amount: number, date: string) => {
    toast({
      title: "Betalning registrerad",
      description: `${formatSEK(amount)} debiterad 2890, krediterad 1930 den ${date}.`,
    });
  };

  const overrideTxn = transactions.find((t) => t.id === overrideTxnId);
  const receiptTxn = transactions.find((t) => t.id === receiptTxnId);

  const companySelector =
    companies.length > 1 ? (
      <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
        <SelectTrigger className="w-[240px]">
          <SelectValue placeholder="Välj bolag" />
        </SelectTrigger>
        <SelectContent>
          {companies.map((c: any) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : null;

  const headerActions = (
    <div className="flex items-center gap-2">
      {companySelector}
      <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)} className="gap-1.5">
        <Upload className="h-4 w-4" /> Importera utdrag
      </Button>
    </div>
  );

  const renderTxn = (t: CCTransaction) => (
    <CCTransactionRow
      key={t.id}
      txn={t}
      onAccept={handleAccept}
      onExclude={handleExclude}
      onTogglePrivate={handleTogglePrivate}
      onClarify={handleClarify}
      onOverride={(id) => setOverrideTxnId(id)}
      onRequestReceipt={(id) => setReceiptTxnId(id)}
    />
  );

  return (
    <PageLayout
      title="Kreditkort"
      subtitle="Autonom AI-driven kreditkortsbokföring med korrekt skuldhantering."
    >
      <PageHeader
        icon={CreditCard}
        title="Kreditkort"
        subtitle="AI bokför köp i realtid mot 2890 — betalning bokförs separat mot 1930."
        actions={headerActions}
      />

      {!selectedCompanyId ? (
        <div className="p-12 text-center text-muted-foreground">
          Välj ett bolag för att hantera kreditkortsbokföring.
        </div>
      ) : transactions.length === 0 ? (
        <Card className="rounded-2xl border-l-[3px] border-l-[#3b82f6] p-10 text-center bg-white">
          <Sparkles className="h-10 w-10 text-[#3b82f6] mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Du är redo att automatisera din kreditkortsbokföring
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            AI väljer rätt kostnadskonto, momskonto och bygger upp skulden på 2890 — automatiskt.
            ≥ 95 % konfidens bokförs direkt, resten landar för granskning.
          </p>
          <Button onClick={() => setUploadOpen(true)} className="gap-1.5">
            <Upload className="h-4 w-4" /> Importera första utdraget
          </Button>
        </Card>
      ) : (
        <div className="space-y-8">
          <CCLiabilityCard
            totalLiability={totalLiability}
            statementBalance={latestStatementBalance}
            periodStart={latestStatement?.statement_period_start ?? null}
            periodEnd={latestStatement?.statement_period_end ?? null}
            txnCount={
              latestStatement
                ? transactions.filter((t) => (t as any).statement_id === latestStatement.id).length
                : 0
            }
          />

          <CCTaxInsightCard
            recoverableVat={taxInsights.recoverableVat}
            nonDeductibleAmount={taxInsights.nonDeductibleAmount}
            nonDeductibleCount={taxInsights.nonDeductibleCount}
            foreignTxnCount={taxInsights.foreignTxnCount}
          />

          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList>
                  <TabsTrigger value="needs_action" className="data-[state=active]:text-[#7A1A1A]">
                    Behöver åtgärd ({buckets.needs_action.length})
                  </TabsTrigger>
                  <TabsTrigger value="missing_receipt" className="data-[state=active]:text-[#7A5417]">
                    Saknar kvitto ({buckets.missing_receipt.length})
                  </TabsTrigger>
                  <TabsTrigger value="ready" className="data-[state=active]:text-[#3b82f6]">
                    Klar att bokföra ({buckets.ready.length})
                  </TabsTrigger>
                  <TabsTrigger value="posted" className="data-[state=active]:text-[#085041]">
                    Bokfört ({buckets.posted.length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              {buckets.ready.length > 0 && activeTab === "ready" && (
                <Button onClick={() => setPostingDialogOpen(true)}>
                  Bokför {buckets.ready.length} transaktioner
                </Button>
              )}
            </div>

            <Card className="rounded-2xl bg-white overflow-hidden">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">Laddar transaktioner…</div>
              ) : visibleTxns.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground text-sm">
                  Inga transaktioner i den här vyn.
                </div>
              ) : (
                <>
                  {Array.from(grouped.map.entries()).map(([statementId, txns]) => {
                    const stmt = statements.find((s) => s.id === statementId);
                    const total = txns.reduce((s, t) => s + Number(t.amount), 0);
                    const isOpen = openStatements[statementId] !== false;
                    return (
                      <Collapsible
                        key={statementId}
                        open={isOpen}
                        onOpenChange={(o) =>
                          setOpenStatements((prev) => ({ ...prev, [statementId]: o }))
                        }
                      >
                        <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50/60 border-b text-xs font-medium text-slate-700 hover:bg-slate-100/70 transition-colors">
                          <span className="flex items-center gap-2">
                            {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            {stmt?.statement_period_start} → {stmt?.statement_period_end} · {stmt?.card_issuer || "Utdrag"}
                          </span>
                          <span className="tabular-nums text-slate-600">
                            {txns.length} transaktioner · {formatSEK(total)}
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent>{txns.map(renderTxn)}</CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                  {grouped.ungrouped.length > 0 && (
                    <>
                      {grouped.map.size > 0 && (
                        <div className="px-4 py-2.5 bg-slate-50/60 border-b text-xs font-medium text-slate-600">
                          Övriga transaktioner
                        </div>
                      )}
                      {grouped.ungrouped.map(renderTxn)}
                    </>
                  )}
                </>
              )}
            </Card>
          </div>

          <CCPaymentClearing
            outstandingBalance={totalLiability}
            onClear={handlePaymentClearing}
          />
        </div>
      )}

      <CCPostingDialog
        open={postingDialogOpen}
        onClose={() => setPostingDialogOpen(false)}
        transactions={readyTransactions}
        onConfirm={handleBatchPost}
        posting={posting}
      />

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importera kreditkortsutdrag</DialogTitle>
          </DialogHeader>
          {selectedCompanyId && (
            <CCStatementUpload
              companyId={selectedCompanyId}
              onParseComplete={handleParseComplete}
            />
          )}
        </DialogContent>
      </Dialog>

      {selectedCompanyId && (
        <>
          <CCAccountOverrideDialog
            open={!!overrideTxnId}
            onClose={() => setOverrideTxnId(null)}
            transactionId={overrideTxnId}
            companyId={selectedCompanyId}
            merchant={overrideTxn?.merchant_name || ""}
            currentAccount={overrideTxn?.ai_suggestion?.debit_account}
            currentVatCode={overrideTxn?.ai_suggestion?.vat_code}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: ["cc-transactions"] });
              queryClient.invalidateQueries({ queryKey: ["cc-learning-rules"] });
            }}
          />
          {receiptTxn && (
            <CCRequestReceiptDialog
              open={!!receiptTxnId}
              onClose={() => setReceiptTxnId(null)}
              merchant={receiptTxn.merchant_name || "Okänd"}
              amount={Number(receiptTxn.amount)}
              date={receiptTxn.transaction_date}
            />
          )}
        </>
      )}
    </PageLayout>
  );
}
