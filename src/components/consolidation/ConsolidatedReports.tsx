import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, RefreshCw, FileText, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ConsolidatedReportTable } from "./ConsolidatedReportTable";
import { exportConsolidatedIncomeStatementPDF,
  exportConsolidatedBalanceSheetPDF,
  exportConsolidatedFullPDF,
} from "@/lib/consolidated-pdf-export";

interface Group { id: string;
  name: string;
  currency: string;
}

interface ReportItem { account: string;
  amount: number;
  previousAmount?: number;
}

interface ConsolidatedData { income_statement: ReportItem[];
  balance_sheet: { assets: ReportItem[];
    liabilities: ReportItem[];
  };
  total_income: number;
  total_expenses: number;
  net_income: number;
  total_assets: number;
  total_liabilities: number;
}

export const ConsolidatedReports = () => { const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [currentData, setCurrentData] = useState<ConsolidatedData | null>(null);
  const [previousData, setPreviousData] = useState<ConsolidatedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [companyCount, setCompanyCount] = useState(0);

  useEffect(() => { loadGroups();
  }, []);

  // Real-time subscription to journal_entries changes
  useEffect(() => { if (!currentData || !selectedGroup) return;

    const channel = supabase
      .channel('consolidated-reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'journal_entries' }, () => { // Auto-refresh when journal entries change
        handleConsolidate(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eliminations' }, () => { handleConsolidate(true);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedGroup, selectedYear, currentData !== null]);

  const loadGroups = async () => { try { const { data, error } = await supabase
        .from("groups")
        .select("id, name, currency")
        .order("name");
      if (error) throw error;
      setGroups(data || []);
      if (data && data.length > 0) setSelectedGroup(data[0].id);
    } catch (error: any) { toast.error(error.message || "Kunde inte ladda koncerner");
    }
  };

  const handleConsolidate = useCallback(async (silent = false) => { if (!selectedGroup) return;
    if (!silent) setIsLoading(true);

    try { // Fetch current year and previous year in parallel
      const [currentRes, previousRes] = await Promise.all([
        supabase.functions.invoke("consolidate-group", { body: { group_id: selectedGroup, year: parseInt(selectedYear) },
        }),
        supabase.functions.invoke("consolidate-group", { body: { group_id: selectedGroup, year: parseInt(selectedYear) - 1 },
        }),
      ]);

      if (currentRes.error) throw currentRes.error;

      setCurrentData(currentRes.data);
      setCompanyCount(currentRes.data.company_count || 0);

      if (!previousRes.error && previousRes.data) { setPreviousData(previousRes.data);

        // Merge previous year amounts into current data items
        const prevIncomeMap = new Map(previousRes.data.income_statement?.map((i: ReportItem) => [i.account, i.amount]) || []);
        const prevAssetMap = new Map(previousRes.data.balance_sheet?.assets?.map((i: ReportItem) => [i.account, i.amount]) || []);
        const prevLiabMap = new Map(previousRes.data.balance_sheet?.liabilities?.map((i: ReportItem) => [i.account, i.amount]) || []);

        currentRes.data.income_statement?.forEach((item: ReportItem) => { item.previousAmount = (prevIncomeMap.get(item.account) as number) || 0;
        });
        currentRes.data.balance_sheet?.assets?.forEach((item: ReportItem) => { item.previousAmount = (prevAssetMap.get(item.account) as number) || 0;
        });
        currentRes.data.balance_sheet?.liabilities?.forEach((item: ReportItem) => { item.previousAmount = (prevLiabMap.get(item.account) as number) || 0;
        });

        setCurrentData({ ...currentRes.data });
      }

      if (!silent) toast.success("Konsolidering genomförd!");
    } catch (error: any) { if (!silent) toast.error(error.message || "Kunde inte genomföra konsolidering");
    } finally { if (!silent) setIsLoading(false);
    }
  }, [selectedGroup, selectedYear]);

  const selectedGroupData = groups.find((g) => g.id === selectedGroup);

  const getPdfData = () => ({ groupName: selectedGroupData?.name || "",
    currency: selectedGroupData?.currency || "SEK",
    year: parseInt(selectedYear),
    companyCount,
    incomeStatement: currentData!.income_statement,
    balanceSheet: currentData!.balance_sheet,
    totalIncome: currentData!.total_income,
    totalExpenses: currentData!.total_expenses,
    netIncome: currentData!.net_income,
    totalAssets: currentData!.total_assets,
    totalLiabilities: currentData!.total_liabilities,
    previousYear: previousData ? { totalIncome: previousData.total_income,
      totalExpenses: previousData.total_expenses,
      netIncome: previousData.net_income,
      totalAssets: previousData.total_assets,
      totalLiabilities: previousData.total_liabilities,
    } : undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Konsoliderade rapporter</h2>
          <p className="text-muted-foreground mt-1">
            Automatisk konsolidering med jämförelsetal föregående år
          </p>
        </div>
        {currentData && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportConsolidatedIncomeStatementPDF(getPdfData())}>
              <Download className="w-4 h-4 mr-2" />RR PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportConsolidatedBalanceSheetPDF(getPdfData())}>
              <Download className="w-4 h-4 mr-2" />BR PDF
            </Button>
            <Button size="sm" onClick={() => exportConsolidatedFullPDF(getPdfData())}>
              <FileText className="w-4 h-4 mr-2" />Komplett bokslut
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Välj koncern och period</CardTitle>
          <CardDescription>
            Systemet konsoliderar alla bolag och hämtar jämförelsetal automatiskt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Koncern</label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger><SelectValue placeholder="Välj koncern" /></SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>{group.name} ({group.currency})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">År</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={() => handleConsolidate(false)} disabled={isLoading || !selectedGroup} className="w-full">
            {isLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Konsoliderar...</>
            ) : (
              <><RefreshCw className="w-4 h-4 mr-2" />Genomför konsolidering</>
            )}
          </Button>
        </CardContent>
      </Card>

      {currentData && (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <KPICard
              title="Totala intäkter"
              amount={currentData.total_income}
              previousAmount={previousData?.total_income}
              currency={selectedGroupData?.currency || "SEK"}
            />
            <KPICard
              title="Totala kostnader"
              amount={currentData.total_expenses}
              previousAmount={previousData?.total_expenses}
              currency={selectedGroupData?.currency || "SEK"}
              invertTrend
            />
            <KPICard
              title="Koncernresultat"
              amount={currentData.net_income}
              previousAmount={previousData?.net_income}
              currency={selectedGroupData?.currency || "SEK"}
              highlight
            />
          </div>

          {/* Income Statement */}
          <ConsolidatedReportTable
            title="Koncernresultaträkning"
            items={currentData.income_statement}
            currency={selectedGroupData?.currency || "SEK"}
            year={parseInt(selectedYear)}
            hasPreviousYear={!!previousData}
            onExportPDF={() => exportConsolidatedIncomeStatementPDF(getPdfData())}
          />

          {/* Balance Sheet - Assets */}
          <ConsolidatedReportTable
            title="Koncernbalansräkning – Tillgångar"
            items={currentData.balance_sheet.assets}
            currency={selectedGroupData?.currency || "SEK"}
            year={parseInt(selectedYear)}
            hasPreviousYear={!!previousData}
            totalLabel="Summa tillgångar"
            totalAmount={currentData.total_assets}
            totalPreviousAmount={previousData?.total_assets}
          />

          {/* Balance Sheet - Liabilities */}
          <ConsolidatedReportTable
            title="Koncernbalansräkning – Eget kapital och skulder"
            items={currentData.balance_sheet.liabilities}
            currency={selectedGroupData?.currency || "SEK"}
            year={parseInt(selectedYear)}
            hasPreviousYear={!!previousData}
            totalLabel="Summa eget kapital och skulder"
            totalAmount={currentData.total_liabilities}
            totalPreviousAmount={previousData?.total_liabilities}
            onExportPDF={() => exportConsolidatedBalanceSheetPDF(getPdfData())}
          />
        </>
      )}
    </div>
  );
};

// KPI Card with comparison
const KPICard = ({ title, amount, previousAmount, currency, highlight, invertTrend,
}: { title: string;
  amount: number;
  previousAmount?: number;
  currency: string;
  highlight?: boolean;
  invertTrend?: boolean;
}) => { const change = previousAmount != null ? amount - previousAmount : null;
  const pctChange = previousAmount && previousAmount !== 0 ? ((amount - previousAmount) / Math.abs(previousAmount)) * 100 : null;
  const isPositive = invertTrend ? (change != null && change <= 0) : (change != null && change >= 0);

  return (
    <Card className={highlight ? "border-primary/30 bg-primary/5" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${highlight ? (amount >= 0 ? 'text-[#085041]' : 'text-[#7A1A1A]') : ''}`}>
          {amount.toLocaleString('sv-SE', { maximumFractionDigits: 0 })} {currency}
        </div>
        {change != null && (
          <div className={`flex items-center gap-1 mt-1 text-sm ${isPositive ? 'text-[#085041]' : 'text-[#7A1A1A]'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{change >= 0 ? '+' : ''}{change.toLocaleString('sv-SE', { maximumFractionDigits: 0 })}</span>
            {pctChange != null && <span className="text-muted-foreground">({pctChange >= 0 ? '+' : ''}{pctChange.toFixed(1)}%)</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
