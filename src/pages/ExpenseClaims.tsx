import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, BarChart3, Receipt } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import ExpenseListView, { ExpenseClaimRow } from "@/components/expenses/ExpenseListView";
import ExpenseDetailView from "@/components/expenses/ExpenseDetailView";
import CreateExpenseDialog from "@/components/expenses/CreateExpenseDialog";
import ExpenseStatistics from "@/components/expenses/ExpenseStatistics";

const ExpenseClaims = () => { const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [claims, setClaims] = useState<ExpenseClaimRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [companyUsers, setCompanyUsers] = useState<{ id: string; name: string }[]>([]);
  const [mainTab, setMainTab] = useState("expenses");

  useEffect(() => { if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => { if (user) loadCompanies();
  }, [user]);

  useEffect(() => { if (selectedCompany) { loadClaims();
      loadCompanyUsers();
    }
  }, [selectedCompany]);

  const loadCompanies = async () => { const { data } = await supabase.from("companies").select("id, name").order("name");
    if (data?.length) { setCompanies(data);
      setSelectedCompany(data[0].id);
    }
  };

  const loadCompanyUsers = async () => { const { data } = await supabase
      .from("user_roles")
      .select("user_id, profiles!inner(id, first_name, last_name, email)")
      .eq("company_id", selectedCompany);

    const users = (data || []).map((r: any) => ({ id: r.profiles.id,
      name: [r.profiles.first_name, r.profiles.last_name].filter(Boolean).join(" ") || r.profiles.email || "Okänd",
    }));
    // Deduplicate
    const unique = Array.from(new Map(users.map((u: any) => [u.id, u])).values());
    setCompanyUsers(unique);
  };

  const loadClaims = async () => { setLoadingData(true);
    try { const { data, error } = await supabase
        .from("expense_claims")
        .select("*")
        .eq("company_id", selectedCompany)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get file counts
      const claimIds = (data || []).map((c: any) => c.id);
      let fileCounts = new Map<string, number>();
      if (claimIds.length > 0) { const { data: files } = await supabase
          .from("expense_claim_files")
          .select("expense_claim_id")
          .in("expense_claim_id", claimIds);
        for (const f of files || []) { fileCounts.set(f.expense_claim_id, (fileCounts.get(f.expense_claim_id) || 0) + 1);
        }
      }

      // Get user names
      const userIds = [...new Set((data || []).map((c: any) => c.user_id).filter(Boolean))];
      let userMap = new Map<string, string>();
      if (userIds.length > 0) { const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", userIds);
        for (const p of profiles || []) { userMap.set(p.id, [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Okänd");
        }
      }

      const rows: ExpenseClaimRow[] = (data || []).map((c: any) => ({ id: c.id,
        description: c.description || "",
        category: c.category,
        user_name: userMap.get(c.user_id) || "Okänd",
        company_name: companies.find((co) => co.id === c.company_id)?.name || "",
        amount: Number(c.amount) || 0,
        vat_amount: Number(c.vat_amount) || 0,
        expense_date: c.expense_date,
        approver_name: c.approver_id ? userMap.get(c.approver_id) || null : null,
        status: c.status,
        account_number: c.account_number,
        file_count: fileCounts.get(c.id) || 0,
      }));

      setClaims(rows);
    } catch (err) { console.error(err);
    } finally { setLoadingData(false);
    }
  };

  const handleApprove = async (id: string) => { // Quick approve from list - delegates to detail view logic
    setSelectedClaimId(id);
  };

  const handleReject = async (id: string) => { setSelectedClaimId(id);
  };

  const handleDelete = async (id: string) => { if (!confirm("Vill du ta bort detta utlägg?")) return;
    const { error } = await supabase.from("expense_claims").delete().eq("id", id);
    if (error) { toast.error("Kunde inte ta bort");
    } else { toast.success("Utlägg borttaget");
      loadClaims();
    }
  };

  const selectedIndex = useMemo(() => claims.findIndex((c) => c.id === selectedClaimId), [claims, selectedClaimId]);

  const handleNavigate = (direction: "prev" | "next") => { const newIdx = direction === "prev" ? selectedIndex - 1 : selectedIndex + 1;
    if (newIdx >= 0 && newIdx < claims.length) { setSelectedClaimId(claims[newIdx].id);
    }
  };

  if (loading) return null;

  // Detail view
  if (selectedClaimId && user) { return (
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <ExpenseDetailView
          claimId={selectedClaimId}
          companyId={selectedCompany}
          userId={user.id}
          onBack={() => { setSelectedClaimId(null); loadClaims(); }}
          onNavigate={handleNavigate}
          currentIndex={selectedIndex}
          totalCount={claims.length}
        />
      </main>
    );
  }

  return (
    <div>
      <PageHeader
        icon={Receipt}
        title="Utlägg"
        subtitle="Hantera och attestera anställdas utlägg"
        actions={ <div className="flex items-center gap-2">
            {companies.length > 1 && (
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="w-48 h-[34px] rounded-[8px] border-[0.5px] border-[#E2E8F0] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              onClick={() => setShowCreate(true)}
              className="h-[34px] rounded-[8px] bg-[#0F1F3D] hover:bg-[#0F1F3D]/90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" /> Nytt utlägg
            </Button>
          </div>
        }
      />
      <main className="px-8 space-y-6">

        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList className="bg-[#F1F5F9] p-1 rounded-[10px] h-auto">
            <TabsTrigger value="expenses" className="h-[28px] px-3 rounded-[8px] data-[state=active]:bg-[#0F1F3D] data-[state=active]:text-white data-[state=active]:shadow-none">
              <Receipt className="w-4 h-4 mr-1" /> Utlägg
            </TabsTrigger>
            <TabsTrigger value="statistics" className="h-[28px] px-3 rounded-[8px] data-[state=active]:bg-[#0F1F3D] data-[state=active]:text-white data-[state=active]:shadow-none">
              <BarChart3 className="w-4 h-4 mr-1" /> Statistik
            </TabsTrigger>
          </TabsList>

          <TabsContent value="expenses">
            <ExpenseListView
              claims={claims}
              loading={loadingData}
              onSelect={setSelectedClaimId}
              onApprove={handleApprove}
              onReject={handleReject}
              onDelete={handleDelete}
            />
          </TabsContent>

          <TabsContent value="statistics">
            <ExpenseStatistics
              claims={claims.map((c) => ({ amount: c.amount,
                vat_amount: c.vat_amount,
                category: c.category,
                user_name: c.user_name,
                expense_date: c.expense_date,
                status: c.status,
              }))}
            />
          </TabsContent>
        </Tabs>

        {user && (
          <CreateExpenseDialog
            open={showCreate}
            onOpenChange={setShowCreate}
            companyId={selectedCompany}
            userId={user.id}
            users={companyUsers}
            onCreated={loadClaims}
          />
        )}
      </main>
    </div>
  );
};

export default ExpenseClaims;
