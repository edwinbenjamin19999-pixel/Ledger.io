import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Calendar, AlertCircle, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

const allFeatures = [
  "AI-driven bokföring",
  "Bankintegration (PSD2)",
  "Momsrapportering",
  "Fakturahantering",
  "Kvittohantering med AI",
  "Real-time rapporter",
  "Export till SIE4/SAF-T",
  "Användarroller & behörigheter",
  "Prioriterad support",
];

interface CompanySub { id: string;
  name: string;
  org_number: string;
  subscription_status: string | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  monthly_price: number | null;
}

export const SubscriptionSettings = ({ companyId }: { companyId: string }) => { const navigate = useNavigate();
  const [companies, setCompanies] = useState<CompanySub[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => { loadCompanySubscriptions();
  }, [companyId]);

  const loadCompanySubscriptions = async () => { try { const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all companies user has access to
      const { data: roles } = await supabase
        .from("user_roles")
        .select("company_id")
        .eq("user_id", user.id);

      if (!roles?.length) { setLoading(false);
        return;
      }

      const companyIds = roles.map(r => r.company_id);
      const { data } = await supabase
        .from("companies")
        .select("id, name, org_number, subscription_status, subscription_start_date, subscription_end_date, monthly_price")
        .in("id", companyIds)
        .order("name");

      setCompanies(data || []);
    } catch (error) { console.error("Error loading subscriptions:", error);
    } finally { setLoading(false);
    }
  };

  const handleManageSubscription = async () => { setPortalLoading(true);
    try { const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (error) { console.error("Portal error:", error);
      toast.error("Kunde inte öppna prenumerationshantering");
    } finally { setPortalLoading(false);
    }
  };

  const getStatusBadge = (status: string | null) => { const s = status || 'trialing';
    const variants: Record<string, { variant: any; label: string }> = { active: { variant: 'default', label: 'Aktiv' },
      trialing: { variant: 'secondary', label: 'Provperiod' },
      canceled: { variant: 'destructive', label: 'Avslutad' },
      past_due: { variant: 'destructive', label: 'Förfallen' },
      unpaid: { variant: 'destructive', label: 'Obetald' },
    };
    const config = variants[s] || { variant: 'secondary', label: s };
    return <Badge variant={(config.variant as "default" | "secondary" | "destructive" | "outline")}>{config.label}</Badge>;
  };

  const totalMonthlyCost = companies.reduce((sum, c) => { const status = c.subscription_status || 'trialing';
    if (['active'].includes(status)) return sum + (c.monthly_price || 399);
    return sum;
  }, 0);

  if (loading) return <div className="text-center py-8">Laddar...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Prenumerationer</CardTitle>
          <CardDescription>
            399 kr/bolag/månad – alla funktioner ingår. {companies.length} bolag anslutna.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {totalMonthlyCost > 0 && (
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Total månadskostnad</p>
              <p className="text-2xl font-bold">{totalMonthlyCost.toLocaleString("sv-SE")} kr/mån</p>
              <p className="text-xs text-muted-foreground">exkl. moms</p>
            </div>
          )}

          <div className="divide-y">
            {companies.map((company) => (
              <div key={company.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{company.name}</p>
                    <p className="text-xs text-muted-foreground">{company.org_number}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">399 kr/mån</span>
                  {getStatusBadge(company.subscription_status)}
                </div>
              </div>
            ))}
          </div>

          {companies.length === 0 && (
            <p className="text-center text-muted-foreground py-4">Inga bolag hittades</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button onClick={handleManageSubscription} disabled={portalLoading} variant="outline">
              <CreditCard className="h-4 w-4 mr-2" />
              {portalLoading ? "Laddar..." : "Hantera betalning"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inkluderade funktioner</CardTitle>
          <CardDescription>Allt ingår i NorthLedger Komplett – per bolag</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {allFeatures.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2 py-1">
                <Check className="w-4 h-4 text-primary" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
