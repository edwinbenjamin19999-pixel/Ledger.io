import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ChatBookkeeper } from "@/components/chat/ChatBookkeeper";
import { Loader2, Building2, ChevronDown, Shield, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface Company { id: string;
  name: string;
  org_number: string;
}

const Bookkeep = () => { const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  useEffect(() => { if (!loading && !user) { navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => { const fetchCompanies = async () => { if (!user) return;

      try { // Get all companies user has access to via user_roles
        const { data: userRoles, error: roleError } = await supabase
          .from("user_roles")
          .select(`
            company_id,
            role,
            companies (
              id,
              name,
              org_number
            )
          `)
          .eq("user_id", user.id);

        if (roleError) throw roleError;

        if (userRoles && userRoles.length > 0) { const companiesList = userRoles
            .filter((r) => r.companies)
            .map((r) => r.companies as unknown as Company);
          
          setCompanies(companiesList);
          
          // Auto-select first company
          if (companiesList.length > 0) { setSelectedCompany(companiesList[0]);
          }
        }
      } catch (error) { console.error("Error fetching companies:", error);
      } finally { setLoadingCompanies(false);
      }
    };

    if (user) { fetchCompanies();
    }
  }, [user]);

  const handleCompanyChange = (company: Company) => { setSelectedCompany(company);
  };

  if (loading || loadingCompanies) { return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Laddar...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (companies.length === 0) { return (
      <div>
<main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-4">Inget företag kopplat</h2>
            <p className="text-muted-foreground mb-6">
              Du behöver skapa eller koppla ett företag för att börja bokföra.
            </p>
            <Button onClick={() => navigate("/companies")}>
              Lägg till företag
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
{/* Company Selector Bar */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-[#085041]" />
              <span className="text-sm text-muted-foreground">Bokför på:</span>
              
              {companies.length === 1 ? (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-base py-1 px-3">
                    <Building2 className="w-4 h-4 mr-2" />
                    {selectedCompany?.name}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    ({selectedCompany?.org_number})
                  </span>
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Building2 className="w-4 h-4" />
                      {selectedCompany?.name || "Välj företag"}
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    {companies.map((company) => (
                      <DropdownMenuItem
                        key={company.id}
                        onClick={() => handleCompanyChange(company)}
                        className={selectedCompany?.id === company.id ? "bg-accent" : ""}
                      >
                        <div>
                          <div className="font-medium">{company.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {company.org_number}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {companies.length > 1 && (
              <div
                className="flex items-center gap-2 py-2 px-3"
                style={{
                  background: "rgba(37,99,235,0.08)",
                  border: "1px solid rgba(37,99,235,0.2)",
                  borderRadius: 10,
                }}
              >
                <span
                  aria-hidden
                  className="inline-flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 9999,
                    background: "#3b82f6",
                    color: "#0F1B2D",
                    fontWeight: 700,
                    fontSize: 11,
                    lineHeight: 1,
                  }}
                >
                  i
                </span>
                <p className="text-xs text-[#374151] dark:text-white/70">
                  Du har tillgång till {companies.length} företag. Kontrollera att rätt företag är valt innan du bokför.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedCompany && (
          <ChatBookkeeper 
            companyId={selectedCompany.id} 
            companyName={selectedCompany.name}
          />
        )}
      </main>
    </div>
  );
};

export default Bookkeep;
