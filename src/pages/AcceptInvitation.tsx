import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { setStoredActiveCompanyId } from "@/lib/company-selection";

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const acceptedRef = useRef<string | null>(null);

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setError("Ogiltig länk – ingen inbjudningstoken hittades");
      setLoading(false);
      return;
    }

    if (authLoading) return;

    if (!user) {
      const next = encodeURIComponent(`/accept-invitation?token=${token}`);
      navigate(`/auth?next=${next}`, { replace: true });
      return;
    }

    // Reset guard if the user (email) changed since last attempt — supports "log out and retry"
    const guardKey = `${user.id}:${token}`;
    if (acceptedRef.current === guardKey) return;
    acceptedRef.current = guardKey;
    setError(null);
    setLoading(true);

    runAcceptFlow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.id, user?.email, authLoading]);

  const runAcceptFlow = async () => {
    try {
      const { data, error: loadError } = await supabase
        .from("user_invitations")
        .select("id, email, role, status, expires_at, company_id")
        .eq("token", token)
        .maybeSingle();

      if (loadError) throw loadError;

      if (!data) {
        setError("Inbjudan hittades inte eller har redan använts");
        setLoading(false);
        return;
      }

      if (data.status !== "pending") {
        setError(`Denna inbjudan har redan ${data.status === "accepted" ? "accepterats" : "utgått"}`);
        setLoading(false);
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setError("Denna inbjudan har utgått");
        setLoading(false);
        return;
      }

      if (user?.email?.toLowerCase() !== data.email.toLowerCase()) {
        setError(`Denna inbjudan skickades till ${data.email}. Du är inloggad som ${user?.email}.`);
        setLoading(false);
        return;
      }

      const response = await supabase.functions.invoke("accept-invitation", {
        body: { token },
      });

      if (response.error) throw response.error;

      const companyName = response.data?.companyName;
      const acceptedCompanyId: string | undefined =
        response.data?.companyId || data.company_id || undefined;

      // Activate the new company immediately so the next route has the right tenant
      if (acceptedCompanyId) {
        setStoredActiveCompanyId(acceptedCompanyId);
        window.dispatchEvent(new Event("company-changed"));
      }

      toast.success(companyName ? `Välkommen till ${companyName}!` : "Välkommen!");
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      console.error("Error in invitation flow:", err);
      setError(err.message || "Kunde inte acceptera inbjudan");
      setLoading(false);
    }
  };

  if (authLoading || (loading && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Aktiverar din åtkomst…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    const isWrongEmail = error.includes("skickades till");
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Något gick fel</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 items-center">
            {isWrongEmail ? (
              <Button onClick={() => signOut()}>Logga ut och försök igen</Button>
            ) : (
              <Button onClick={() => navigate("/dashboard")}>Gå till Dashboard</Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default AcceptInvitation;
