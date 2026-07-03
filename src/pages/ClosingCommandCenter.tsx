import { useState, useEffect } from "react";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useClosingStatus } from "@/hooks/useClosingStatus";
import { supabase } from "@/integrations/supabase/client";
import { ClosingStatusPanel } from "@/components/closing/ClosingStatusPanel";
import { AIInsightsCenterpiece } from "@/components/closing/AIInsightsCenterpiece";
import { ClosingTaskList } from "@/components/closing/ClosingTaskList";
import { LiveFinancialPreview } from "@/components/closing/LiveFinancialPreview";
import { AutoCloseDialog } from "@/components/closing/AutoCloseDialog";

export default function ClosingCommandCenter() {
  const companyId = useCompanyId();
  const [fiscalYear] = useState(() => new Date().getFullYear() - 1);
  const [annualReportId, setAnnualReportId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: status, isLoading } = useClosingStatus(companyId, fiscalYear);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("annual_reports")
        .select("id")
        .eq("company_id", companyId)
        .eq("fiscal_year", fiscalYear)
        .maybeSingle();
      if (!cancelled) setAnnualReportId(data?.id ?? null);
    })();
    return () => { cancelled = true; };
  }, [companyId, fiscalYear]);

  return (
    <div className="bg-white min-h-screen -m-6 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-[16px]">
        <ClosingStatusPanel
          status={status}
          isLoading={isLoading}
          fiscalYear={fiscalYear}
          onAutoClose={() => setDialogOpen(true)}
          isClosing={false}
        />

        <LiveFinancialPreview
          preview={status?.live_preview}
          isLoading={isLoading}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]">
          <AIInsightsCenterpiece
            annualReportId={annualReportId}
            companyId={companyId}
            fiscalYear={fiscalYear}
          />
          <ClosingTaskList
            tasks={status?.tasks ?? []}
            isLoading={isLoading}
          />
        </div>
      </div>

      {companyId && (
        <AutoCloseDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          companyId={companyId}
          fiscalYear={fiscalYear}
        />
      )}
    </div>
  );
}
