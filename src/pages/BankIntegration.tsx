import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, BarChart3, FileCheck, Brain, Landmark, RefreshCw,
  ArrowUpRight, ArrowDownRight, FileUp, Upload, Wallet, ArrowLeftRight,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { BankLinking } from "@/components/bank/BankLinking";
import { BankAccountsOverview } from "@/components/bank/BankAccountsOverview";
import { TransactionsList } from "@/components/bank/TransactionsList";
import { TransactionExport } from "@/components/bank/TransactionExport";
import { BankAnalytics } from "@/components/bank/BankAnalytics";
import { AIReconciliation } from "@/components/bank/AIReconciliation";
import { BankNotifications } from "@/components/bank/BankNotifications";
import { AILearningDashboard } from "@/components/bank/AILearningDashboard";
import { Camt054Import } from "@/components/bank/Camt054Import";
import { SwedishBankCards } from "@/components/bank/SwedishBankCards";
import { ManualBankImport } from "@/components/bank/ManualBankImport";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GradientKPICard, KPI_GRADIENTS, type GradientKPICardData } from "@/components/shared/GradientKPICard";
import { useCompanyId } from "@/hooks/useCompanyId";
import { deriveBankConnectionIssue, type BankConnectionEventLike } from "@/lib/bankConnectionIssue";

interface BankAccount { id: string;
  bank_name: string;
  account_name: string;
  iban: string;
  balance: number | null;
  currency: string;
  last_synced_at: string | null;
}

interface BankTransaction { id: string;
  booking_date: string;
  amount: number;
  currency: string;
  counterparty_name: string | null;
  reference: string | null;
  description: string | null;
  status: string;
  suggested_account_id: string | null;
  ai_confidence: number | null;
  ai_explanation: string | null;
  chart_of_accounts: { account_number: string;
    account_name: string;
    account_type: string;
  } | null;
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

export default function BankIntegration() { const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const activeCompanyId = useCompanyId();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [matching, setMatching] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [bankIssue, setBankIssue] = useState<ReturnType<typeof deriveBankConnectionIssue>>(null);

  useEffect(() => { if (!user) { navigate("/auth"); return; }
    if (!activeCompanyId) { setLoading(false); return; }
    setSelectedCompanyId(activeCompanyId);
    setSelectedAccount(null);
    loadBankAccounts(activeCompanyId);

    const success = searchParams.get('success') || searchParams.get('bank');
    const error = searchParams.get('error');
    const reason = searchParams.get('reason');
    if (success === 'true' || success === 'success') {
      toast.success("Bankkonto kopplat! Transaktioner synkroniseras nu.");
      navigate('/bank', { replace: true });
    } else if (success === 'warning') {
      toast.warning(
        reason === 'no_usable_accounts'
          ? 'Banken svarade, men inga riktiga konton kunde sparas.'
          : 'Bankkopplingen slutfördes utan användbara konton.',
      );
      navigate('/bank', { replace: true });
    } else if (error) { toast.error(decodeURIComponent(error));
      navigate('/bank', { replace: true });
    }

    const channel = supabase
      .channel('bank-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bank_transactions' }, () => { if (selectedAccount) loadTransactions(selectedAccount);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bank_accounts' }, () => { loadBankAccounts(activeCompanyId);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, navigate, searchParams, activeCompanyId]);

  useEffect(() => { if (selectedAccount) loadTransactions(selectedAccount);
  }, [selectedAccount]);

  const loadBankAccounts = async (companyId: string) => {
    try {
      const [accountsRes, eventsRes] = await Promise.all([
        supabase
          .from("bank_accounts")
          .select("*")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("account_name"),
        supabase
          .from("bank_connection_events")
          .select("event_type, created_at, metadata")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      if (accountsRes.error) throw accountsRes.error;
      if (eventsRes.error) throw eventsRes.error;

      const accounts = accountsRes.data || [];
      setBankAccounts(accounts);
      setBankIssue(deriveBankConnectionIssue((eventsRes.data || []) as BankConnectionEventLike[]));
      if (accounts.length) {
        if (!selectedAccount || !accounts.some((a: any) => a.id === selectedAccount)) {
          setSelectedAccount(accounts[0].id);
        }
      } else {
        setSelectedAccount(null);
        setTransactions([]);
      }
    } catch (error: any) { toast.error(error.message);
    } finally { setLoading(false);
    }
  };

  const loadTransactions = async (accountId: string) => {
    if (!activeCompanyId) return;
    try {
      const { data, error } = await supabase
        .from("bank_transactions")
        .select(`*, chart_of_accounts:suggested_account_id (account_number, account_name, account_type)`)
        .eq("company_id", activeCompanyId)
        .eq("bank_account_id", accountId)
        .order("booking_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) { toast.error(error.message);
    }
  };

  const syncTransactions = async (accountId: string) => { setSyncing(true);
    try { const { data, error } = await supabase.functions.invoke("fetch-bank-transactions", { body: { bank_account_id: accountId } });
      if (error) throw error;
      toast.success(`${data.count} transaktioner importerade`);
      await loadTransactions(accountId);
      if (activeCompanyId) await loadBankAccounts(activeCompanyId);
    } catch (error: any) { toast.error(error.message);
    } finally { setSyncing(false);
    }
  };

  const matchTransaction = async (transactionId: string) => {
    setMatching(transactionId);
    try {
      const { data, error } = await supabase.functions.invoke("categorize-transaction", {
        body: { transaction_id: transactionId },
      });
      if (error) throw error;
      if (data?.already_booked) {
        toast.info("Transaktionen är redan bokförd");
      } else if (data?.categorization?.auto_booked) {
        toast.success("AI-matchad och bokförd automatiskt");
      } else {
        toast.success("AI-förslag skapat — granska och godkänn");
      }
      if (selectedAccount) await loadTransactions(selectedAccount);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setMatching(null);
    }
  };

  if (loading) {
    const shimmerStyle: React.CSSProperties = {
      background:
        "linear-gradient(90deg, rgba(0,0,0,0.06) 25%, rgba(0,0,0,0.10) 50%, rgba(0,0,0,0.06) 75%)",
      backgroundSize: "400% 100%",
      animation: "bankint-shimmer 1.5s infinite",
      borderRadius: 12,
    };
    return (
      <div className="px-6 py-6 space-y-6">
        <style>{`@keyframes bankint-shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0F1B2D] dark:text-white">
          Bankintegration
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ ...shimmerStyle, height: 100 }} />
          ))}
        </div>
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} style={{ ...shimmerStyle, height: 56 }} />
          ))}
        </div>
        <div style={{ ...shimmerStyle, height: 200 }} />
      </div>
    );
  }

  // Compute quick stats — distinguish between "no balance fetched yet" and 0 kr
  const accountsWithBalance = bankAccounts.filter(a => a.balance !== null);
  const hasAnyBalance = accountsWithBalance.length > 0;
  const totalBalance = accountsWithBalance.reduce((s, a) => s + (a.balance || 0), 0);
  const unmatchedCount = transactions.filter(t => t.status === "pending" || t.status === "unmatched").length;
  const incomeThisMonth = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenseThisMonth = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  // Group bank accounts by bank name for SwedishBankCards
  const connectedBanks = Object.values(
    bankAccounts.reduce((acc, ba) => { if (!acc[ba.bank_name]) acc[ba.bank_name] = { bank_name: ba.bank_name, accounts: [] };
      acc[ba.bank_name].accounts.push({ id: ba.id,
        account_name: ba.account_name,
        iban: ba.iban,
        balance: ba.balance,
        last_synced_at: ba.last_synced_at,
      });
      return acc;
    }, {} as Record<string, any>)
  );

  const kpiCards: GradientKPICardData[] = [
    {
      label: "Totalt saldo",
      value: hasAnyBalance ? `${fmt(totalBalance)} kr` : "Ej hämtat",
      sub: hasAnyBalance
        ? `${accountsWithBalance.length} av ${bankAccounts.length} konton`
        : `Klicka "Synka" på kontot`,
      icon: Wallet,
      gradient: KPI_GRADIENTS.emerald,
    },
    { label: "Omatchade", value: unmatchedCount.toString(), sub: "transaktioner", icon: RefreshCw, gradient: KPI_GRADIENTS.amber },
    { label: "Inkomster", value: `${fmt(incomeThisMonth)} kr`, sub: "senaste period", icon: ArrowUpRight, gradient: KPI_GRADIENTS.blue },
    { label: "Utgifter", value: `${fmt(expenseThisMonth)} kr`, sub: "senaste period", icon: ArrowDownRight, gradient: KPI_GRADIENTS.rose },
  ];

  const tabs = [
    { id: "overview", label: "Översikt", icon: null },
    { id: "transactions", label: "Transaktioner", icon: null },
    { id: "analytics", label: "Analys", icon: BarChart3 },
    { id: "reconciliation", label: "Avstämning", icon: FileCheck },
    { id: "import", label: "Import", icon: Upload },
    { id: "learning", label: "Lärande", icon: Brain },
  ];

  return (
    <div className="bg-white min-h-screen">
      <div className="px-8 pt-6 pb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-medium tracking-[-0.02em] text-[#0F172A]">Bankintegration</h1>
          <p className="text-[12px] text-[#475569] mt-[2px]">Direktkoppling till din bank via Open Banking (PSD2)</p>
        </div>
        <div className="flex gap-[8px]">
          <button
            onClick={() => navigate("/bankavstamning")}
            className="h-[34px] px-[12px] rounded-[8px] border-[0.5px] border-[#E2E8F0] bg-white text-[12px] text-[#475569] hover:bg-[#F8FAFB] inline-flex items-center gap-[6px]"
          >
            <ArrowLeftRight className="h-[14px] w-[14px]" />
            Bankavstämning
          </button>
          {selectedAccount && transactions.length > 0 && (
            <TransactionExport
              transactions={transactions}
              accountName={bankAccounts.find(a => a.id === selectedAccount)?.account_name || "Konto"}
            />
          )}
          <button
            onClick={() => setShowLinkDialog(true)}
            className="h-[34px] px-[14px] rounded-[8px] bg-[#1D4ED8] text-white text-[12px] font-medium hover:bg-[#093d54] inline-flex items-center gap-[6px]"
          >
            <Plus className="h-[14px] w-[14px]" />Koppla bank
          </button>
        </div>
      </div>
      <main className="px-8 space-y-[16px]">
        {selectedCompanyId && <BankNotifications companyId={selectedCompanyId} />}

        {/* Neutral KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-[12px]">
          {kpiCards.map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <div key={i} className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-[14px] flex flex-col gap-[6px]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">{kpi.label}</span>
                  {Icon && <Icon className="h-[14px] w-[14px] text-[#475569]" />}
                </div>
                <span className="text-[20px] font-medium tracking-[-0.02em] tabular-nums text-[#0F172A]">{kpi.value}</span>
                <span className="text-[11px] text-[#94A3B8]">{kpi.sub}</span>
              </div>
            );
          })}
        </div>

        {/* Connected banks (only when accounts exist) — empty state CTA otherwise */}
        {bankAccounts.length > 0 ? (
          <div className="space-y-[10px]">
            <h3 className="text-[13px] font-medium text-[#0F172A]">Anslutna banker</h3>
            <SwedishBankCards
              connectedBanks={connectedBanks}
              onConnect={(bankName) => setShowLinkDialog(true)}
              onManualImport={() => setShowImportDialog(true)}
            />
          </div>
        ) : (
          <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-[20px]">
            <h3 className="text-[14px] font-medium text-[#0F172A]">Inga bankkonton anslutna ännu</h3>
            <p className="text-[12px] text-[#475569] mt-[4px]">
              {bankIssue?.message || "Anslut ditt företagskonto via PSD2 och BankID för att aktivera AI-bokföring, automatisk avstämning och kassaflödesanalys."}
            </p>
            <div className="flex flex-col sm:flex-row gap-[8px] mt-[14px]">
              <button
                onClick={() => setShowLinkDialog(true)}
                className="h-[36px] px-[16px] rounded-[8px] bg-[#1D4ED8] text-white text-[12px] font-medium hover:bg-[#093d54] inline-flex items-center justify-center gap-[6px]"
              >
                <Plus className="h-[14px] w-[14px]" />
                Anslut bankkonto
              </button>
              <button
                onClick={() => setShowImportDialog(true)}
                className="h-[36px] px-[16px] rounded-[8px] border-[0.5px] border-[#E2E8F0] bg-white text-[12px] text-[#475569] hover:bg-[#F8FAFB] inline-flex items-center justify-center gap-[6px]"
              >
                <Upload className="h-[14px] w-[14px]" />
                Importera kontoutdrag manuellt
              </button>
            </div>
          </div>
        )}

        {bankAccounts.length > 0 && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full sm:w-auto h-auto p-0 bg-transparent border-b-[0.5px] border-[#E2E8F0] rounded-none gap-[2px] overflow-x-auto justify-start">
              {tabs.map(t => {
                const Icon = t.icon;
                return (
                  <TabsTrigger
                    key={t.id}
                    value={t.id}
                    className="h-[34px] px-[14px] rounded-none border-b-2 border-transparent bg-transparent text-[12px] text-[#475569] data-[state=active]:bg-transparent data-[state=active]:text-[#1D4ED8] data-[state=active]:border-[#1D4ED8] data-[state=active]:shadow-none gap-[6px]"
                  >
                    {Icon && <Icon className="h-[14px] w-[14px]" />}
                    {t.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-4">
              <BankAccountsOverview
                accounts={bankAccounts}
                selectedAccount={selectedAccount}
                onSelectAccount={setSelectedAccount}
                onSync={syncTransactions}
                syncing={syncing}
              />
            </TabsContent>

            <TabsContent value="transactions" className="mt-4">
              <TransactionsList transactions={transactions} onMatch={matchTransaction} matching={matching} />
            </TabsContent>

            <TabsContent value="analytics" className="mt-4">
              <BankAnalytics transactions={transactions} />
            </TabsContent>

            <TabsContent value="reconciliation" className="mt-4">
              {selectedAccount && (
                <AIReconciliation
                  account={bankAccounts.find(a => a.id === selectedAccount)!}
                  transactions={transactions}
                  onSync={syncTransactions}
                  syncing={syncing}
                  onTransactionsUpdated={() => { if (selectedAccount) loadTransactions(selectedAccount); }}
                />
              )}
            </TabsContent>

            <TabsContent value="import" className="mt-4 space-y-6">
              {selectedCompanyId && (
                <>
                  <ManualBankImport
                    companyId={selectedCompanyId}
                    bankAccountId={selectedAccount || undefined}
                    onImportComplete={() => { if (selectedAccount) loadTransactions(selectedAccount); }}
                  />
                  <Camt054Import
                    companyId={selectedCompanyId}
                    bankAccountId={selectedAccount || undefined}
                    onImportComplete={() => { if (selectedAccount) loadTransactions(selectedAccount); }}
                  />
                </>
              )}
            </TabsContent>

            <TabsContent value="learning" className="mt-4">
              {selectedCompanyId && <AILearningDashboard companyId={selectedCompanyId} />}
            </TabsContent>
          </Tabs>
        )}

        <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Koppla bankkonto</DialogTitle>
              <DialogDescription>Anslut ditt företagskonto via PSD2-standarden</DialogDescription>
            </DialogHeader>
            {selectedCompanyId && (
              <BankLinking companyId={selectedCompanyId} flow="standalone" onSuccess={() => { setShowLinkDialog(false); if (activeCompanyId) loadBankAccounts(activeCompanyId); }} />
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Importera kontoutdrag manuellt</DialogTitle>
              <DialogDescription>Ladda upp CSV, OFX eller CAMT.054 från din bank</DialogDescription>
            </DialogHeader>
            {selectedCompanyId && (
              <ManualBankImport
                companyId={selectedCompanyId}
                bankAccountId={selectedAccount || undefined}
                onImportComplete={() => { setShowImportDialog(false); if (selectedAccount) loadTransactions(selectedAccount); }}
              />
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
