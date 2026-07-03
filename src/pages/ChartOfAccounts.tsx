import { AccountingSubNav } from "@/components/accounting/AccountingSubNav";
import { RefreshCw, Layout, Plus, Building2, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useChartOfAccounts } from "@/components/chart-of-accounts/useChartOfAccounts";
import { KPIFilterCards } from "@/components/chart-of-accounts/KPIFilterCards";
import { AccountFilterToolbar } from "@/components/chart-of-accounts/AccountFilterToolbar";
import { AccountClassTable } from "@/components/chart-of-accounts/AccountClassTable";
import { AccountDrawer } from "@/components/chart-of-accounts/AccountDrawer";
import { BASUpdateModal } from "@/components/chart-of-accounts/BASUpdateModal";
import { IndustryTemplatesModal } from "@/components/chart-of-accounts/IndustryTemplatesModal";

const AI_INSIGHTS = [
  "12 konton är oanvända sedan 6 månader",
  "3 konton saknar momskoppling",
  "5 liknande konton kan slås ihop",
];

export default function ChartOfAccounts() {
  const h = useChartOfAccounts();

  if (h.authLoading) return null;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-50/50 to-white">
      <div className="px-8"><AccountingSubNav /></div>

      {/* Header */}
      <div className="flex items-start justify-between px-8 pt-7 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Kontoplan</h1>
            {h.companies.length > 1 && (
              <Select value={h.selectedCompany} onValueChange={h.setSelectedCompany}>
                <SelectTrigger className="w-[200px] h-9 text-sm">
                  <Building2 className="h-3.5 w-3.5 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {h.companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Hantera aktiva konton, BAS-struktur, momskopplingar och egna kontoinställningar.
          </p>
          <p className="text-[11px] text-slate-300 mt-1.5">Senast uppdaterad: BAS 2026 — 14 april 2026</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => h.setBasModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Uppdatera BAS
          </button>
          <button
            onClick={() => h.setTemplateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Layout className="w-3.5 h-3.5" /> Branschmallar
          </button>
          <button
            onClick={h.openAddDrawer}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F1F3D] text-white text-sm font-semibold hover:shadow-lg hover:shadow-[#3b82f6]/20 hover:-translate-y-0.5 transition-all duration-200 shadow-md"
          >
            <Plus className="w-4 h-4" /> Lägg till konto
          </button>
        </div>
      </div>

      <KPIFilterCards stats={h.stats} currentFilter={h.kpiFilter} onFilterChange={h.setKpiFilter} />

      {/* AI Insights Strip */}
      <div className="mx-8 mb-2 px-5 py-3.5 rounded-2xl bg-[#0F1F3D] border border-blue-100/50 flex items-center gap-4">
        <div className="w-8 h-8 rounded-xl bg-[#0F1F3D] flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-[#3b82f6]" />
        </div>
        <div className="flex items-center gap-6 text-sm">
          {AI_INSIGHTS.map((insight, i) => (
            <span key={i} className="text-slate-600 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[#3b82f6] flex-shrink-0" />
              {insight}
            </span>
          ))}
        </div>
      </div>

      <AccountFilterToolbar
        search={h.search} onSearchChange={h.setSearch}
        classFilter={h.classFilter} onClassFilterChange={h.setClassFilter}
        typeFilter={h.typeFilter} onTypeFilterChange={h.setTypeFilter}
        vatFilter={h.vatFilter} onVatFilterChange={h.setVatFilter}
        showInactive={h.showInactive} onShowInactiveChange={h.setShowInactive}
        filteredCount={h.filteredAccounts.length} totalCount={h.accounts.length}
      />

      <div className="flex-1 overflow-auto">
        <AccountClassTable
          accounts={h.filteredAccounts}
          loading={h.loading}
          search={h.search}
          expandedClasses={h.expandedClasses}
          onToggleExpanded={h.toggleClassExpanded}
          onEdit={h.openEditDrawer}
          onToggleActive={h.handleToggleActive}
          filteredCount={h.filteredAccounts.length}
          totalCount={h.accounts.length}
        />
      </div>

      <AccountDrawer
        open={h.drawerOpen}
        editingAccount={h.editingAccount}
        formNumber={h.formNumber} setFormNumber={h.setFormNumber}
        formName={h.formName} setFormName={h.setFormName}
        formVatCode={h.formVatCode} setFormVatCode={h.setFormVatCode}
        formType={h.formType} setFormType={h.setFormType}
        formActive={h.formActive} setFormActive={h.setFormActive}
        formOrigin={h.formOrigin} setFormOrigin={h.setFormOrigin}
        formNote={h.formNote} setFormNote={h.setFormNote}
        formError={h.formError}
        saving={h.saving}
        onSave={h.handleSave}
        onClose={h.closeDrawer}
      />

      <BASUpdateModal
        open={h.basModalOpen}
        saving={h.saving}
        onConfirm={h.handleRefreshBAS}
        onClose={() => h.setBasModalOpen(false)}
      />

      <IndustryTemplatesModal
        open={h.templateModalOpen}
        saving={h.saving}
        onApply={h.handleImportTemplate}
        onClose={() => h.setTemplateModalOpen(false)}
      />
    </div>
  );
}
