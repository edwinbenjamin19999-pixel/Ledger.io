import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { CommandCenter } from "@/components/cfo/home";

const CFOPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | undefined>(undefined);
  const [userName, setUserName] = useState("du");
  const [loadingCompany, setLoadingCompany] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: role }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("company_id").eq("user_id", user.id).limit(1).maybeSingle(),
        supabase.from("profiles").select("first_name").eq("id", user.id).maybeSingle(),
      ]);
      const cid = role?.company_id || null;
      setCompanyId(cid);
      setUserName(profile?.first_name || "du");
      if (cid) {
        const { data: company } = await supabase.from("companies").select("name").eq("id", cid).maybeSingle();
        setCompanyName(company?.name);
      }
      setLoadingCompany(false);
    })();
  }, [user]);

  if (loading || loadingCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!companyId) {
    return <div className="p-6 text-center text-muted-foreground"><p>Inget bolag anslutet.</p></div>;
  }

  return <CommandCenter companyId={companyId} companyName={companyName} userName={userName} />;
};

export default CFOPage;
