import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Receipt } from "lucide-react";
import { ARAgent } from "@/components/ar-agent/ARAgent";
import { PageHeader } from "@/components/layout/PageHeader";

const ARAgentPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);

  const customerFilter = searchParams.get("customer");

  useEffect(() => { if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => { if (!user) return;
    const fetch = async () => { const { data } = await supabase.from("user_roles").select("company_id").eq("user_id", user.id).limit(1).maybeSingle();
      setCompanyId(data?.company_id || null);
      setLoadingCompany(false);
    };
    fetch();
  }, [user]);

  if (loading || loadingCompany) { return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!companyId) { return <div className="p-6 text-center text-muted-foreground"><p>Inget bolag anslutet.</p></div>;
  }

  const handleClearCustomerFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("customer");
    setSearchParams(next, { replace: true });
  };

  return (
    <div>
      <PageHeader
        icon={Receipt}
        title={customerFilter ? `Kundreskontra · ${customerFilter}` : "Kundreskontra-agent"}
        subtitle={customerFilter ? "Fokuserad vy för en kund" : "Automatiserad uppföljning av kundfordringar och betalningar"}
      />
      <div className="px-8">
        <ARAgent
          companyId={companyId}
          customerFilter={customerFilter}
          onClearCustomerFilter={handleClearCustomerFilter}
        />
      </div>
    </div>
  );
};

export default ARAgentPage;
