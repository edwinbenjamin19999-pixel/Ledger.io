import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileSpreadsheet, FileText, Download, Loader2, Activity, Wallet } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useCashflowStatement, type CashflowPeriodMode, type CashflowMethod, periodRangeFor } from "@/hooks/useCashflowStatement";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { FinancialReportTable } from "@/components/reports/table/FinancialReportTable";
import type { FinancialColumn, FinancialRowData } from "@/components/reports/table/types";

import { CashflowReportHeader } from "@/components/cashflow/report/CashflowReportHeader";
import { CashflowDrilldownDrawer } from "@/components/cashflow/report/CashflowDrilldownDrawer";
import { CashflowAIInsight } from "@/components/cashflow/report/CashflowAIInsight";
import { CashflowModuleHeader } from "@/components/cashflow/CashflowModuleHeader";
import {
  exportCashflowPDF,
  exportCashflowXLSX,
  exportCashflowCSV,
} from "@/lib/cashflow/exportCashflowStatement";
import type { CashflowCategory, CashflowDrillRow } from "@/lib/cashflow/buildCashflowStatement";
import { cn } from "@/lib/utils";

interface Company {
  id: string;
  name: string;
}

const PERIOD_TABS: Array<{ key: CashflowPeriodMode; label: string }> = [
  { key: "month", label: "Månad" },
  { key: "quarter", label: "Kvartal" },
  { key: "year", label: "År" },
];

// ── Map a StatementRow → FinancialRowData for the shared table ──
function toFinancialRows(
  doc: ReturnType<typeof useCashflowStatement>["data"] extends infer T
    ? T extends { doc: infer D }
      ? D
      : never
    : never,
  onCategoryClick: (label: string) => void,
  onAccountCodeClick: (code: string) => void,
): FinancialRowData[] {
  if (!doc) return [];
  const rows: FinancialRowData[] = [];
  let i = 0;
  for (const r of doc.rows) {
    if (r.kind === "spacer") continue;
    if (r.kind === "section") {
      rows.push({
        id: `sec-${i++}`,
        variant: "section",
        cells: { code: "", label: r.label, period: null, ytd: null },
      });
      continue;
    }
    if (r.kind === "subtotal" || r.kind === "total" || r.kind === "group") {
      const values = "values" in r ? r.values : [];
      rows.push({
        id: `tot-${i++}`,
        variant: "total",
        cells: {
          code: "",
          label: r.label,
          period: values[0] ?? null,
          ytd: values[2] ?? null,
        },
        onClick: () => onCategoryClick(r.label),
      });
      continue;
    }
    // account
    rows.push({
      id: `a-${i++}-${r.code}-${r.label}`,
      variant: "account",
      indent: 1,
      cells: {
        code: r.code,
        label: r.label,
        period: r.values[0] ?? null,
        ytd: r.values[2] ?? null,
      },
      onClick: () => onCategoryClick(r.label),
    });
  }
  return rows;
}

const TABLE_COLUMNS: FinancialColumn[] = [
  { key: "code",   label: "Konto",     align: "left",  format: "text",   width: "w-16" },
  { key: "label",  label: "Benämning", align: "left",  format: "text" },
  { key: "period", label: "Period",    align: "right", format: "number", width: "w-28" },
  { key: "ytd",    label: "YTD",       align: "right", format: "number", width: "w-28" },
];

const CashFlowReport = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const localCompanyId = useCompanyId();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [mode, setMode] = useState<CashflowPeriodMode>("month");
  const [method, setMethod] = useState<CashflowMethod>("indirect");
  const [drillLabel, setDrillLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("companies").select("id, name").order("name");
      setCompanies(data || []);
      const initial = localCompanyId || data?.[0]?.id || "";
      setSelectedCompany(initial);
    })();
  }, [localCompanyId]);

  const companyName = useMemo(
    () => companies.find((c) => c.id === selectedCompany)?.name || "",
    [companies, selectedCompany],
  );

  const { data, loading: loadingData, error } = useCashflowStatement({
    companyId: selectedCompany || null,
    companyName,
    mode,
    method,
  });

  const drillRows: CashflowDrillRow[] = useMemo(() => {
    if (!data || !drillLabel) return [];
    const cat = (Object.keys(data.categoriesByKey) as CashflowCategory[]).find(
      (k) => data.categoriesByKey[k].label === drillLabel,
    );
    return cat ? data.drilldown[cat] : [];
  }, [data, drillLabel]);

  const handleAccountCodeClick = (code: string) => {
    const { from, to } = periodRangeFor(mode, new Date());
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);
    navigate(`/account-analysis?account=${code}&from=${fromStr}&to=${toStr}`);
  };

  const tableRows = useMemo(
    () =>
      toFinancialRows(
        data?.doc as any,
        (label) => setDrillLabel(label),
        handleAccountCodeClick,
      ),
    [data, mode],
  );

  const onExport = async (kind: "pdf" | "xlsx" | "csv") => {
    if (!data) {
      toast.error("Ingen data att exportera");
      return;
    }
    try {
      if (kind === "pdf") exportCashflowPDF(data.doc);
      else if (kind === "xlsx") await exportCashflowXLSX(data.doc);
      else exportCashflowCSV(data.doc);
      toast.success(`Exporterad som ${kind.toUpperCase()}`);
    } catch (e: any) {
      toast.error(e?.message || "Exporten misslyckades");
    }
  };

  const reconciles = useMemo(() => {
    if (!data) return false;
    return Math.abs(data.summary.closingCash - data.summary.openingCash - data.summary.net) <= 1;
  }, [data]);

  return (
    <div className="min-h-screen bg-slate-50/40">
      <PageHeader
        icon={FileSpreadsheet}
        title="Kassaflödesanalys"
        subtitle="Realtidskassaflöde från huvudboken — välj indirekt (K2/K3) eller direkt metod"
        actions={
          <div className="flex items-center gap-2">
            {companies.length > 1 && (
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="w-[200px] bg-white">
                  <SelectValue placeholder="Välj bolag" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" size="sm" onClick={() => onExport("pdf")} disabled={!data}>
              <FileText className="h-4 w-4 mr-1.5" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => onExport("xlsx")} disabled={!data}>
              <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => onExport("csv")} disabled={!data}>
              <Download className="h-4 w-4 mr-1.5" /> CSV
            </Button>
          </div>
        }
      />

      <div className="px-8 pb-12 pt-2 space-y-5 max-w-[1200px] mx-auto">
        {/* Bridge buttons row — unified across all 3 cashflow modules */}
        <CashflowModuleHeader
          self="report"
          links={["live", "command"]}
          // suppress its own title block — PageHeader already renders title
          className="hidden"
        />
        <div className="flex items-center justify-end gap-2 -mt-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate("/cashflow")}>
            <Wallet className="h-3.5 w-3.5 mr-1.5" /> Live likviditet
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate("/cash-command")}>
            <Activity className="h-3.5 w-3.5 mr-1.5" /> Cash Command
          </Button>
        </div>

        {/* Period + method chips inline (no card wrapper) */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            {PERIOD_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setMode(t.key)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                  mode === t.key
                    ? "bg-[#3b82f6] text-white"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="inline-flex items-center rounded-md border border-slate-200 bg-white p-0.5">
            {([
              { key: "indirect", label: "Indirekt metod" },
              { key: "direct", label: "Direkt metod" },
            ] as Array<{ key: CashflowMethod; label: string }>).map((m) => (
              <button
                key={m.key}
                onClick={() => setMethod(m.key)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-[5px] transition-colors",
                  method === m.key
                    ? "bg-[#3b82f6] text-white"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
                )}
                title={m.key === "indirect"
                  ? "Standard för svenska årsredovisningar (BFNAR K2/K3)"
                  : "Faktiska in- och utbetalningar"}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {loadingData && (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center text-slate-500">
            <Loader2 className="h-6 w-6 mx-auto animate-spin mb-2 text-slate-400" />
            Laddar kassaflödesdata…
          </div>
        )}

        {error && !loadingData && (
          <div className="rounded-xl border border-[#F4C8C8] bg-[#FCE8E8] px-5 py-4 text-sm text-[#7A1A1A]">
            {error}
          </div>
        )}

        {!loadingData && data && (
          <>
            <CashflowReportHeader
              net={data.summary.net}
              priorNet={data.summary.priorNet}
              openingCash={data.summary.openingCash}
              closingCash={data.summary.closingCash}
              period={data.doc.header.period}
              reconciles={reconciles}
            />

            <CashflowAIInsight
              net={data.summary.net}
              priorNet={data.summary.priorNet}
              inflows={data.summary.inflows}
              outflows={data.summary.outflows}
              closingCash={data.summary.closingCash}
            />

            {/* Statement table — sits directly on white, no nested card */}
            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-2.5 flex items-baseline justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                  Kassaflödesanalys
                </div>
                <div className="text-xs text-slate-500">{data.doc.header.company}</div>
              </div>
              <FinancialReportTable
                columns={TABLE_COLUMNS}
                rows={tableRows}
                emptyMessage="Inga kassaflöden i vald period"
                density="compact"
              />
            </div>
          </>
        )}
      </div>

      <CashflowDrilldownDrawer
        open={!!drillLabel}
        onClose={() => setDrillLabel(null)}
        title={drillLabel || ""}
        rows={drillRows}
      />
    </div>
  );
};

export default CashFlowReport;
