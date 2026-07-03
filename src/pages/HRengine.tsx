import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ACTIVE_COMPANY_STORAGE_KEY } from "@/lib/company-selection";
import { PageHeader } from "@/components/layout/PageHeader";
import { Loader2, Brain } from "lucide-react";
import { HRSmartInput } from "@/components/hr-engine/HRSmartInput";
import { HRKpiRow } from "@/components/hr-engine/HRKpiRow";
import { HRTabBar } from "@/components/hr-engine/HRTabBar";
import { HROverviewTab } from "@/components/hr-engine/HROverviewTab";
import { HRTimeReportTab } from "@/components/hr-engine/HRTimeReportTab";
import { HRAbsenceTab } from "@/components/hr-engine/HRAbsenceTab";
import { HRPayrollBaseTab } from "@/components/hr-engine/HRPayrollBaseTab";
import { HREmployeesTab } from "@/components/hr-engine/HREmployeesTab";

const TABS = [
  { value: "overview", label: "Översikt" },
  { value: "time", label: "Tidsrapportering" },
  { value: "absence", label: "Frånvaro & Semester" },
  { value: "payroll", label: "Lönunderlag" },
  { value: "employees", label: "Anställda" },
  { value: "smart-input", label: "Smart Input (AI)" },
];

const HRengine = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    const stored = localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);
    if (stored) {
      setCompanyId(stored);
      return;
    }
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("company_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      setCompanyId(data?.company_id || null);
    })();
  }, [user]);

  if (loading || !companyId) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        icon={Brain}
        title="HR & Payroll Engine"
        subtitle="AI-driven löne- och personalhantering — från fritext till lönekörning"
      />

      <div className="px-8 pb-12 space-y-4">
        <HRKpiRow companyId={companyId} />

        <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] overflow-hidden">
          <HRTabBar tabs={TABS} value={tab} onChange={setTab} />
          <div className="px-4 pb-4">
            {tab === "overview" && (
              <HROverviewTab companyId={companyId} onOpenSmartInput={() => setTab("smart-input")} />
            )}
            {tab === "time" && <HRTimeReportTab companyId={companyId} />}
            {tab === "absence" && <HRAbsenceTab companyId={companyId} />}
            {tab === "payroll" && <HRPayrollBaseTab companyId={companyId} />}
            {tab === "employees" && <HREmployeesTab companyId={companyId} />}
            {tab === "smart-input" && (
              <div className="mt-4">
                <HRSmartInput companyId={companyId} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRengine;
