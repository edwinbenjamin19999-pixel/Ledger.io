// DEPRECATED: Use src/components/tax-agent/forms/AGIForm.tsx instead
// Kept for reference — do not import this component

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AGIForm } from "@/components/tax-agent/forms/AGIForm";

const AGISubmission = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [taxYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      supabase
        .from("companies")
        .select("id")
        .order("name")
        .limit(1)
        .then(({ data }) => {
          if (data?.[0]) setCompanyId(data[0].id);
        });
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div>
      <PageHeader
        icon={Users}
        title="Arbetsgivardeklaration (AGI)"
        subtitle="Sammanställ, granska och lämna in AGI till Skatteverket"
      />
      <div className="px-8 pb-8">
        {companyId ? (
          <AGIForm companyId={companyId} taxYear={taxYear} />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Laddar bolag...
          </div>
        )}
      </div>
    </div>
  );
};

export default AGISubmission;
