import { useEffect, useState } from "react";
import { AutomationDashboard } from "@/components/automation/AutomationDashboard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Zap } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FinOSCrossModulePanel } from "@/components/finos/FinOSCrossModulePanel";
import { OnboardingEmptyState } from "@/components/common/OnboardingEmptyState";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";

const Automation = () => { const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) { loadCompany();
    }
  }, [user]);

  const loadCompany = async () => { if (!user) return;

    try { const { data, error } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setCompanyId(data?.company_id || null);
    } catch (error) { console.error('Error loading company:', error);
    } finally { setLoading(false);
    }
  };

  if (loading) { return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!companyId) { return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Inget företag hittat</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        icon={Zap}
        title="Automatiseringar"
        subtitle="Regler och flöden som körs automatiskt"
      />
      <div className="px-8 space-y-6">
        <AutomationEmptyBanner />
        <FinOSCrossModulePanel companyId={companyId} modules={["automation"]} />
        <AutomationDashboard companyId={companyId} />
      </div>
    </div>
  );
};

const AutomationEmptyBanner = () => {
  const { hasTransactions, loading } = useOnboardingProgress();
  if (loading || hasTransactions) return null;
  return <OnboardingEmptyState variant="ai-activity" />;
};

export default Automation;
