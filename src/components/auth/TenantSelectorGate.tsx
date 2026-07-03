import { useEffect, useState } from "react";
import { Building2, Check, Mail, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ACTIVE_COMPANY_STORAGE_KEY,
  getStoredActiveCompanyId,
  setStoredActiveCompanyId,
} from "@/lib/company-selection";

interface CompanyOption {
  id: string;
  name: string;
  org_number: string | null;
}

/**
 * After login: if the user has membership in 2+ companies AND no active
 * company is stored (or the stored id is no longer valid), force them to
 * pick which company to enter. Prevents the silent "wrong tenant"
 * behaviour where the alphabetically first company was auto-selected.
 *
 * Renders nothing once an active company is set.
 */
export const TenantSelectorGate = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading, signOut } = useAuth();
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [resolved, setResolved] = useState(false);
  const [needsPick, setNeedsPick] = useState(false);
  const [noAccess, setNoAccess] = useState(false);

  useEffect(() => {
    if (authLoading || !user) {
      setResolved(false);
      setNeedsPick(false);
      setNoAccess(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("company_id, companies:company_id(id, name, org_number)")
        .eq("user_id", user.id);

      if (cancelled) return;
      if (error) {
        setResolved(true);
        return;
      }

      const list: CompanyOption[] = [];
      const seen = new Set<string>();
      for (const row of data ?? []) {
        const c = (row as any).companies;
        if (c?.id && !seen.has(c.id)) {
          seen.add(c.id);
          list.push({ id: c.id, name: c.name, org_number: c.org_number ?? null });
        }
      }
      list.sort((a, b) => a.name.localeCompare(b.name, "sv"));
      setCompanies(list);

      const stored = getStoredActiveCompanyId();
      const storedValid = stored && list.some((c) => c.id === stored);
      const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const isTestAccount = userMeta.test_account === true || userMeta.is_test_account === true;

      if (list.length === 0) {
        setNoAccess(true);
      } else if (isTestAccount && !storedValid && list[0]) {
        setStoredActiveCompanyId(list[0].id);
        window.dispatchEvent(new Event("company-changed"));
      } else if (list.length >= 2 && !storedValid) {
        setNeedsPick(true);
      } else if (!storedValid && list[0]) {
        // single company → auto-select silently
        setStoredActiveCompanyId(list[0].id);
        window.dispatchEvent(new Event("company-changed"));
      }
      setResolved(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const choose = (id: string) => {
    setStoredActiveCompanyId(id);
    window.dispatchEvent(new Event("company-changed"));
    setNeedsPick(false);
  };

  if (!resolved) return <>{children}</>;

  if (noAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-6">
        <Card className="w-full max-w-md p-8 space-y-6 shadow-lg">
          <div className="space-y-2 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-xl font-semibold">Inget bolag är kopplat till ditt konto ännu</h1>
            <p className="text-sm text-muted-foreground">
              Om du har blivit inbjuden till ett bolag måste inbjudan accepteras
              med exakt samma e-postadress som den skickades till
              <span className="font-medium text-foreground"> ({user?.email})</span>.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">Så här gör du:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Öppna inbjudningsmejlet och klicka på länken.</li>
              <li>Be ägaren skicka inbjudan igen om du inte hittar den.</li>
              <li>Kontrollera att inbjudan är skickad till {user?.email}.</li>
            </ol>
          </div>

          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-2" />
              Logga ut och byt konto
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!needsPick) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-6">
      <Card className="w-full max-w-md p-8 space-y-6 shadow-lg">
        <div className="space-y-2 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-semibold">Välj bolag</h1>
          <p className="text-sm text-muted-foreground">
            Du har åtkomst till flera bolag. Välj vilket du vill arbeta i.
          </p>
        </div>

        <div className="space-y-2">
          {companies.map((c) => (
            <Button
              key={c.id}
              variant="outline"
              className="w-full justify-start h-auto py-3 px-4"
              onClick={() => choose(c.id)}
            >
              <Building2 className="h-4 w-4 mr-3 shrink-0 text-muted-foreground" />
              <div className="flex-1 text-left min-w-0">
                <div className="font-medium truncate">{c.name}</div>
                {c.org_number && (
                  <div className="text-xs text-muted-foreground truncate">
                    Org.nr {c.org_number}
                  </div>
                )}
              </div>
              <Check className="h-4 w-4 ml-2 opacity-0" />
            </Button>
          ))}
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Du kan byta bolag när som helst i toppmenyn.
        </p>
      </Card>
    </div>
  );
};

export default TenantSelectorGate;
