import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { KYCOnboarding } from "@/components/kyc/KYCOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useKYCStatus } from "@/hooks/useKYC";
import { getStoredActiveCompanyId } from "@/lib/company-selection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

const KYCVerification = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { data: kycData } = useKYCStatus();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadCompany();
    }
  }, [user]);

  const loadCompany = async () => {
    try {
      const activeId = getStoredActiveCompanyId();
      let query = supabase.from("companies").select("*");
      if (activeId) {
        query = query.eq("id", activeId);
      } else {
        // Fallback: load the user's first accessible company via user_roles
        const { data: { user: u } } = await supabase.auth.getUser();
        if (u) {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("company_id")
            .eq("user_id", u.id)
            .limit(1);
          const cid = roles?.[0]?.company_id;
          if (cid) query = query.eq("id", cid);
          else query = query.limit(1);
        } else {
          query = query.limit(1);
        }
      }
      const { data, error } = await query.maybeSingle();

      if (error) throw error;

      if (data?.kyc_status === 'approved') {
        navigate("/dashboard");
        return;
      }

      setCompany(data);
    } catch (error) {
      console.error("Error loading company:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    navigate("/dashboard");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto p-3 rounded-full bg-muted w-fit mb-3">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>Ingen åtkomst</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground text-sm">
              {!user ? "Du behöver logga in för att komma åt KYC-verifiering." : "Inget företag hittades kopplat till ditt konto."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show status-based view
  const kycStatus = kycData?.kyc_status || company?.kyc_status;

  if (kycStatus === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto p-3 rounded-full bg-[#FAEEDA] dark:bg-amber-900/30 w-fit mb-3">
              <Clock className="h-8 w-8 text-[#7A5417]" />
            </div>
            <CardTitle>Väntar på verifiering</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground text-sm">
              Dina uppgifter är inlämnade och granskas. Detta tar normalt 1–2 bankdagar.
            </p>
            <div className="flex items-center justify-center gap-2">
              <Badge variant="outline" className="bg-[#FAEEDA] text-[#7A5417] dark:bg-amber-900/20 dark:text-[#C28A2B]">
                <Clock className="h-3 w-3 mr-1" /> Väntar på granskning
              </Badge>
            </div>
            {/* Stepper */}
            <div className="flex items-center justify-center gap-2 pt-4">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-5 w-5 text-[#085041]" />
                <span className="text-xs text-muted-foreground">Inlämnad</span>
              </div>
              <div className="h-px w-8 bg-amber-400" />
              <div className="flex items-center gap-1">
                <Clock className="h-5 w-5 text-[#7A5417]" />
                <span className="text-xs font-medium">Granskas</span>
              </div>
              <div className="h-px w-8 bg-muted" />
              <div className="flex items-center gap-1">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Verifierad</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (kycStatus === 'approved' || kycStatus === 'verified') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto p-3 rounded-full bg-[#E1F5EE] dark:bg-emerald-900/30 w-fit mb-3">
              <CheckCircle2 className="h-8 w-8 text-[#085041]" />
            </div>
            <CardTitle>KYC Verifierad</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground text-sm">
              Ditt företag är verifierat och redo att använda alla funktioner.
            </p>
            <Badge variant="outline" className="bg-[#E1F5EE] text-[#085041] dark:bg-emerald-900/20 dark:text-[#1D9E75]">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Verifierad
            </Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <KYCOnboarding companyId={company.id} onComplete={handleComplete} />;
};

export default KYCVerification;
