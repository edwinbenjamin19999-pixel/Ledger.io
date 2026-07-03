import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Bot } from "lucide-react";
import { AgentDashboard } from "@/components/agent/AgentDashboard";
import { PageHeader } from "@/components/layout/PageHeader";

interface Company { id: string; name: string; }

const AgentPage = () => { const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);

  useEffect(() => { if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => { if (!user) return;
    const fetchCompany = async () => { const { data } = await supabase.from("user_roles").select("company_id").eq("user_id", user.id).limit(1).maybeSingle();
      setCompanyId(data?.company_id || null);
      setLoadingCompany(false);
    };
    fetchCompany();
  }, [user]);

  if (loading || loadingCompany) { return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!companyId) { return <div className="p-6 text-center text-muted-foreground"><p>Inget bolag anslutet. Skapa eller anslut ett bolag för att använda agenten.</p></div>;
  }

  return (
    <div>
      <PageHeader
        icon={Bot}
        title="Bokföringsagent"
        subtitle="AI-driven automatisk bokföring med intelligent regelmotor"
      />
      <div className="px-8">
        <AgentDashboard companyId={companyId} />
      </div>
    </div>
  );
};

export default AgentPage;
