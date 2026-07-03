import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp } from "lucide-react";
import { Predictive90Forecast } from "@/components/cashflow/Predictive90Forecast";
import { PageHeader } from "@/components/layout/PageHeader";

const Predictive90Page = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("company_id").eq("user_id", user.id).limit(1).maybeSingle()
      .then(({ data }) => { setCompanyId(data?.company_id || null); setLoadingCompany(false); });
  }, [user]);

  if (loading || loadingCompany) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!companyId) {
    return <div className="p-6 text-center text-muted-foreground">Inget bolag anslutet.</div>;
  }

  return (
    <div>
      <PageHeader
        icon={TrendingUp}
        title="Likviditetsprognos – 90 dagar"
        subtitle="Daglig kassaflödesprognos från bank, fakturor och AI-mönster"
      />
      <div className="px-8 pb-8">
        <Predictive90Forecast companyId={companyId} />
      </div>
    </div>
  );
};

export default Predictive90Page;
