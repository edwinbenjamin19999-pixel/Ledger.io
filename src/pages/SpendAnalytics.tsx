import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, PieChart } from "lucide-react";
import { SpendAnalytics } from "@/components/spend-analytics/SpendAnalytics";
import { PageHeader } from "@/components/layout/PageHeader";

const SpendAnalyticsPage = () => { const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);

  useEffect(() => { if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => { if (!user) return;
    const fetch = async () => { const { data: role } = await supabase.from("user_roles").select("company_id").eq("user_id", user.id).limit(1).maybeSingle();
      setCompanyId(role?.company_id || null);
      setLoadingCompany(false);
    };
    fetch();
  }, [user]);

  if (loading || loadingCompany) { return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!companyId) { return <div className="p-6 text-center text-muted-foreground"><p>Inget bolag anslutet.</p></div>;
  }

  return (
    <div>
      <PageHeader
        icon={PieChart}
        title="Utgiftsanalys"
        subtitle="AI-driven analys av kostnader, trender och besparingsmöjligheter"
      />
      <div className="px-8">
        <SpendAnalytics companyId={companyId} />
      </div>
    </div>
  );
};

export default SpendAnalyticsPage;
