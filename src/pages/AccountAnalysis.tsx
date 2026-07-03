import { useState, useMemo, useCallback } from 'react';
import { AccountingSubNav } from '@/components/accounting/AccountingSubNav';
import { PageHeader } from '@/components/layout/PageHeader';
import { BarChart3 } from 'lucide-react';
import { useAccountAnalysis } from '@/components/account-analysis/useAccountAnalysis';
import { useAnomalyDetection } from '@/components/account-analysis/useAnomalyDetection';
import { KPISummaryBar } from '@/components/account-analysis/KPISummaryBar';
import { PeriodSummaryStrip } from '@/components/account-analysis/PeriodSummaryStrip';
import { AccountListPanel } from '@/components/account-analysis/AccountListPanel';
import { AIInsightBar } from '@/components/account-analysis/AIInsightBar';
import { FilterToolbar } from '@/components/account-analysis/FilterToolbar';
import { TransactionTable } from '@/components/account-analysis/TransactionTable';
import { GroupedView } from '@/components/account-analysis/GroupedView';
import { FlowView } from '@/components/account-analysis/FlowView';
import { AnalysisView } from '@/components/account-analysis/AnalysisView';
import { EditableVoucherPanel } from '@/components/shared/EditableVoucherPanel';
import type { ViewMode, TypeFilter, JournalDetail } from '@/components/account-analysis/types';

const AccountAnalysis = () => {
  const {
    authLoading,
    companies,
    selectedCompany,
    setSelectedCompany,
    accounts,
    fromDate, setFromDate,
    toDate, setToDate,
    accountSummaries,
    selectedAccount,
    setSelectedAccount,
    selectedAccountSummary,
    journalDetails: rawDetails,
  } = useAccountAnalysis();

  const [viewMode, setViewMode] = useState<ViewMode>('transactions');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('Alla');
  const [showAnomalies, setShowAnomalies] = useState(false);
  const [transactionSearch, setTransactionSearch] = useState('');
  const [voucherDetail, setVoucherDetail] = useState<JournalDetail | null>(null);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  const detailsWithAnomalies = useAnomalyDetection(rawDetails);

  const detailsWithReviewed = useMemo(
    () => detailsWithAnomalies.map(d => ({ ...d, reviewed: reviewedIds.has(d.id) })),
    [detailsWithAnomalies, reviewedIds]
  );

  const filteredDetails = useMemo(() => {
    let list = detailsWithReviewed;
    if (transactionSearch) {
      const q = transactionSearch.toLowerCase();
      list = list.filter(d =>
        d.isVirtualRow ||
        d.description.toLowerCase().includes(q) ||
        d.journal_number.includes(q) ||
        d.counterAccounts.some(a => a.includes(q))
      );
    }
    if (showAnomalies) list = list.filter(d => d.isVirtualRow || d.anomalyType !== null);
    return list;
  }, [detailsWithReviewed, transactionSearch, showAnomalies]);

  const anomalyCount = detailsWithAnomalies.filter(d => d.anomalyType !== null && !d.isVirtualRow).length;

  const enrichedSummaries = useMemo(() => {
    if (!selectedAccount) return accountSummaries;
    return accountSummaries.map(s => ({
      ...s,
      hasAnomaly: s.accountNumber === selectedAccount
        ? detailsWithAnomalies.some(d => d.anomalyType !== null && !d.isVirtualRow)
        : s.hasAnomaly,
    }));
  }, [accountSummaries, selectedAccount, detailsWithAnomalies]);

  const toggleReviewed = useCallback((id: string) => {
    setReviewedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  if (authLoading) return null;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={BarChart3}
        title="Kontoanalys"
        subtitle="Finansiell intelligens — filtrera, analysera och spåra avvikelser"
      />
      <main className="flex flex-col flex-1 overflow-hidden">
        <div className="px-6 pb-2">
          <AccountingSubNav />
        </div>

        {/* KPI Bar */}
        <div className="px-6 pt-2 pb-2">
          <KPISummaryBar account={selectedAccountSummary} allSummaries={accountSummaries} />
        </div>

        {/* Period Summary Strip */}
        <div className="px-6 pb-3">
          <PeriodSummaryStrip account={selectedAccountSummary} allSummaries={accountSummaries} />
        </div>

        {/* Two-column workspace */}
        <div className="flex flex-1 gap-4 px-6 pb-6 overflow-hidden">
          {/* Left: Account list */}
          <div className="w-[300px] flex-shrink-0 bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
            <AccountListPanel
              summaries={enrichedSummaries}
              selectedAccount={selectedAccount}
              onSelectAccount={setSelectedAccount}
            />
          </div>

          {/* Right: Analysis area */}
          <div className="flex-1 flex flex-col gap-3 overflow-hidden min-w-0">
            <AIInsightBar account={selectedAccountSummary} details={filteredDetails} />

            <FilterToolbar
              search={transactionSearch}
              onSearchChange={setTransactionSearch}
              fromDate={fromDate}
              toDate={toDate}
              onFromDateChange={setFromDate}
              onToDateChange={setToDate}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              showAnomalies={showAnomalies}
              onToggleAnomalies={() => setShowAnomalies(prev => !prev)}
              anomalyCount={anomalyCount}
              companies={companies}
              selectedCompany={selectedCompany}
              onCompanyChange={setSelectedCompany}
            />

            {viewMode === 'transactions' && (
              <TransactionTable
                details={filteredDetails}
                onOpenVoucher={setVoucherDetail}
                onToggleReviewed={toggleReviewed}
              />
            )}
            {viewMode === 'grouped' && (
              <GroupedView details={filteredDetails} accounts={accounts} />
            )}
            {viewMode === 'flow' && (
              <FlowView
                details={filteredDetails}
                accountName={selectedAccountSummary?.accountName || 'Alla konton'}
                accounts={accounts}
              />
            )}
            {viewMode === 'analysis' && (
              <AnalysisView
                details={filteredDetails}
                account={selectedAccountSummary}
                accounts={accounts}
              />
            )}
          </div>
        </div>
      </main>

      <EditableVoucherPanel detail={voucherDetail} onClose={() => setVoucherDetail(null)} mode="edit" />
    </div>
  );
};

export default AccountAnalysis;
