import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Plus, Link as LinkIcon, Loader2, Pencil, Trash2, MoreVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GroupTree } from "./GroupTree";
import { BulkCompanyImport } from "./BulkCompanyImport";
import { DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Group { id: string;
  name: string;
  currency: string;
  fiscal_year_start: number;
  created_at: string;
  billing_company_id?: string | null;
  subscription_tier?: string | null;
  subscription_status?: string | null;
  monthly_price?: number | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  companies?: Company[];
}

interface Company { id: string;
  name: string;
  org_number: string;
  currency: string;
  group_id?: string | null;
}

export const GroupOverview = ({ onGroupCreated }: { onGroupCreated?: () => void }) => { const [groups, setGroups] = useState<Group[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [linkDialogGroupId, setLinkDialogGroupId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Create group form state (fixes FormData issue with shadcn Select)
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCurrency, setNewGroupCurrency] = useState("SEK");
  const [newGroupFiscalYearStart, setNewGroupFiscalYearStart] = useState("1");

  // Edit group state
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupCurrency, setEditGroupCurrency] = useState("SEK");
  const [editGroupFiscalYearStart, setEditGroupFiscalYearStart] = useState("1");

  // Delete confirmation
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  // New company creation state
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyOrgNumber, setNewCompanyOrgNumber] = useState("");
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lastLookedUpOrg, setLastLookedUpOrg] = useState("");

  useEffect(() => { loadData();
  }, []);

  // Auto-lookup company when org number is complete (10 digits)
  useEffect(() => { const digits = newCompanyOrgNumber.replace(/\D/g, "");
    if (digits.length !== 10) return;
    if (isLookingUp) return;
    if (digits === lastLookedUpOrg) return;

    const t = window.setTimeout(() => { setLastLookedUpOrg(digits);
      handleLookupCompany(digits);
    }, 450);

    return () => window.clearTimeout(t);
  }, [newCompanyOrgNumber, isLookingUp, lastLookedUpOrg]);

  const loadData = async () => { try { const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select(`
          *,
          companies:companies!companies_group_id_fkey(*)
        `)
        .order("created_at", { ascending: false });

      if (groupsError) throw groupsError;
      setGroups((groupsData || []) as unknown as Group[]);

      // Load unlinked companies
      const { data: companiesData, error: companiesError } = await supabase
        .from("companies")
        .select("*")
        .is("group_id", null)
        .order("name");

      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);
    } catch (error: any) { toast.error(error.message || "Kunde inte ladda data");
    } finally { setIsLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault();

    if (!newGroupName.trim()) { toast.error("Ange ett koncernnamn");
      return;
    }

    try { const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Användare ej inloggad");

      const { error } = await supabase.from("groups").insert([{ name: newGroupName.trim(),
        currency: newGroupCurrency,
        fiscal_year_start: parseInt(newGroupFiscalYearStart),
        created_by: user.id
      }]);

      if (error) throw error;

      toast.success("Koncern skapad!");
      setIsGroupDialogOpen(false);
      setNewGroupName("");
      setNewGroupCurrency("SEK");
      setNewGroupFiscalYearStart("1");
      loadData();
      onGroupCreated?.();
    } catch (error: any) { toast.error(error.message || "Kunde inte skapa koncern");
    }
  };

  const handleEditGroup = async () => { if (!editingGroup || !editGroupName.trim()) return;

    try { const { error } = await supabase
        .from("groups")
        .update({ name: editGroupName.trim(),
          currency: editGroupCurrency,
          fiscal_year_start: parseInt(editGroupFiscalYearStart),
        })
        .eq("id", editingGroup.id);

      if (error) throw error;

      toast.success("Koncern uppdaterad!");
      setEditingGroup(null);
      loadData();
      onGroupCreated?.();
    } catch (error: any) { toast.error(error.message || "Kunde inte uppdatera koncern");
    }
  };

  const handleDeleteGroup = async () => { if (!deletingGroupId) return;

    try { // First unlink all companies
      const { error: unlinkError } = await supabase
        .from("companies")
        .update({ group_id: null })
        .eq("group_id", deletingGroupId);

      if (unlinkError) throw unlinkError;

      const { error } = await supabase
        .from("groups")
        .delete()
        .eq("id", deletingGroupId);

      if (error) throw error;

      toast.success("Koncern borttagen!");
      setDeletingGroupId(null);
      loadData();
      onGroupCreated?.();
    } catch (error: any) { toast.error(error.message || "Kunde inte ta bort koncern");
    }
  };

  const openEditDialog = (group: Group) => { setEditGroupName(group.name);
    setEditGroupCurrency(group.currency);
    setEditGroupFiscalYearStart(group.fiscal_year_start.toString());
    setEditingGroup(group);
  };

  const handleLinkCompany = async (companyId: string) => { if (!selectedGroup) return;

    try { const { error } = await supabase
        .from("companies")
        .update({ group_id: selectedGroup })
        .eq("id", companyId);

      if (error) throw error;

      toast.success("Företag kopplat till koncern!");
      setLinkDialogGroupId(null);
      loadData();
    } catch (error: any) { toast.error(error.message || "Kunde inte koppla företag");
    }
  };

  const handleLookupCompany = async (orgDigits?: string) => { const digits = (orgDigits ?? newCompanyOrgNumber).replace(/\D/g, "");
    if (!digits) return;

    setIsLookingUp(true);
    try { const { data, error } = await supabase.functions.invoke("company-lookup", { body: { orgNumber: digits }
      });

      if (error) throw error;

      if (data?.name) { setNewCompanyName(data.name);
        toast.success(`Hittade: ${data.name}`);
      } else { toast.info("Företaget hittades inte - fyll i namn manuellt");
      }
    } catch (error: any) { console.error("Lookup error:", error);
      toast.info("Kunde inte slå upp företaget - fyll i namn manuellt");
    } finally { setIsLookingUp(false);
    }
  };

  const handleCreateNewCompany = async () => { if (!selectedGroup || !newCompanyName.trim()) { toast.error("Fyll i företagsnamn");
      return;
    }

    setIsCreatingCompany(true);
    try { const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ej inloggad");

      const { error } = await supabase
        .from("companies")
        .insert([{ name: newCompanyName.trim(),
          org_number: newCompanyOrgNumber.trim() || `TEMP-${Date.now()}`,
          group_id: selectedGroup,
          created_by: user.id,
          subscription_tier: 'mini',
          subscription_status: 'active'
        }]);

      if (error) throw error;

      toast.success(`${newCompanyName} har lagts till i koncernen!`);
      setNewCompanyName("");
      setNewCompanyOrgNumber("");
      setLinkDialogGroupId(null);
      loadData();
    } catch (error: any) { toast.error(error.message || "Kunde inte skapa företag");
    } finally { setIsCreatingCompany(false);
    }
  };

  const handleSetBillingCompany = async (groupId: string, companyId: string) => { try { const { error } = await supabase
        .from("groups")
        .update({ billing_company_id: companyId })
        .eq("id", groupId);

      if (error) throw error;

      toast.success("Faktureringsbolag uppdaterat");
      loadData();
    } catch (error: any) { toast.error(error.message || "Kunde inte uppdatera faktureringsbolag");
    }
  };

  if (isLoading) { return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Koncerner</h2>
          <p className="text-muted-foreground mt-1">
            Skapa koncerner och koppla samman företag för automatisk konsolidering
          </p>
        </div>

        <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Skapa koncern
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Skapa ny koncern</DialogTitle>
              <DialogDescription>
                Fyll i koncernens grunduppgifter
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateGroup} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Koncernnamn</Label>
                <Input
                  id="name"
                  required
                  placeholder="Acme Group AB"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rapportvaluta</Label>
                  <Select value={newGroupCurrency} onValueChange={setNewGroupCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SEK">SEK</SelectItem>
                      <SelectItem value="NOK">NOK</SelectItem>
                      <SelectItem value="DKK">DKK</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Räkenskapsår börjar</Label>
                  <Select value={newGroupFiscalYearStart} onValueChange={setNewGroupFiscalYearStart}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                        <SelectItem key={month} value={month.toString()}>
                          {new Date(2000, month - 1, 1).toLocaleDateString("sv-SE", { month: "long" })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsGroupDialogOpen(false)}>
                  Avbryt
                </Button>
                <Button type="submit">Skapa koncern</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Inga koncerner ännu</h3>
            <p className="text-muted-foreground mb-4">
              Skapa din första koncern för att börja konsolidera
            </p>
            <Button onClick={() => setIsGroupDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Skapa koncern
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{group.name}</CardTitle>
                    <CardDescription>
                      {group.currency} • Räkenskapsår börjar månad {group.fiscal_year_start}
                      {" • "}{(group.companies || []).length} företag
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <BulkCompanyImport
                      groupId={group.id}
                      groupName={group.name}
                      onComplete={loadData}
                    />
                    <Dialog open={linkDialogGroupId === group.id} onOpenChange={(open) => { if (open) { setSelectedGroup(group.id);
                        setLinkDialogGroupId(group.id);
                      } else { setLinkDialogGroupId(null);
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <LinkIcon className="w-4 h-4 mr-2" />
                          Koppla företag
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Lägg till företag i {group.name}</DialogTitle>
                          <DialogDescription>
                            Koppla befintligt eller skapa nytt företag
                          </DialogDescription>
                        </DialogHeader>

                        <Tabs defaultValue="create" className="mt-4">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="create">Skapa nytt</TabsTrigger>
                            <TabsTrigger value="existing">Koppla befintligt</TabsTrigger>
                          </TabsList>

                          <TabsContent value="create" className="space-y-4 mt-4">
                            <div className="space-y-2">
                              <Label htmlFor="orgNumber">Organisationsnummer</Label>
                              <p className="text-xs text-muted-foreground">Format: XXXXXX-XXXX (10 siffror)</p>
                              <div className="flex gap-2">
                                <Input
                                  id="orgNumber"
                                  placeholder="t.ex. 556123-4567"
                                  value={newCompanyOrgNumber}
                                  onChange={(e) => setNewCompanyOrgNumber(e.target.value)}
                                />
                                {isLookingUp && (
                                  <div className="flex items-center">
                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="companyName">Företagsnamn</Label>
                              <Input
                                id="companyName"
                                placeholder="Företag AB"
                                value={newCompanyName}
                                onChange={(e) => setNewCompanyName(e.target.value)}
                              />
                            </div>

                            <Button
                              onClick={handleCreateNewCompany}
                              disabled={isCreatingCompany || !newCompanyName.trim()}
                              className="w-full"
                            >
                              {isCreatingCompany ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Skapar...
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 h-4 mr-2" />
                                  Lägg till i koncernen
                                </>
                              )}
                            </Button>
                          </TabsContent>

                          <TabsContent value="existing" className="mt-4">
                            <div className="space-y-2">
                              {companies.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                  Inga okopplade företag finns. Använd "Skapa nytt" istället.
                                </p>
                              ) : (
                                companies.map((company) => (
                                  <Button
                                    key={company.id}
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={() => handleLinkCompany(company.id)}
                                  >
                                    <Building2 className="w-4 h-4 mr-2" />
                                    {company.name} ({company.org_number})
                                  </Button>
                                ))
                              )}
                            </div>
                          </TabsContent>
                        </Tabs>
                      </DialogContent>
                    </Dialog>

                    {/* Edit/Delete dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(group)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Redigera
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeletingGroupId(group.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Ta bort
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {(group.companies || []).length > 0 && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <Label className="text-sm font-medium mb-2 block">
                      Faktureringsbolag för Enterprise
                    </Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Välj vilket bolag som betalar för hela koncernen.
                    </p>
                    <Select
                      value={group.billing_company_id || ""}
                      onValueChange={(value) => handleSetBillingCompany(group.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Välj faktureringsbolag" />
                      </SelectTrigger>
                      <SelectContent>
                        {(group.companies || []).map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name} ({company.org_number})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <GroupTree
                  groupName={group.name}
                  groupCurrency={group.currency}
                  companies={group.companies || []}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Group Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={(open) => !open && setEditingGroup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redigera koncern</DialogTitle>
            <DialogDescription>Uppdatera koncernens uppgifter</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Koncernnamn</Label>
              <Input
                value={editGroupName}
                onChange={(e) => setEditGroupName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rapportvaluta</Label>
                <Select value={editGroupCurrency} onValueChange={setEditGroupCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEK">SEK</SelectItem>
                    <SelectItem value="NOK">NOK</SelectItem>
                    <SelectItem value="DKK">DKK</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Räkenskapsår börjar</Label>
                <Select value={editGroupFiscalYearStart} onValueChange={setEditGroupFiscalYearStart}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <SelectItem key={month} value={month.toString()}>
                        {new Date(2000, month - 1, 1).toLocaleDateString("sv-SE", { month: "long" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingGroup(null)}>Avbryt</Button>
              <Button onClick={handleEditGroup}>Spara ändringar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingGroupId} onOpenChange={(open) => !open && setDeletingGroupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort koncern?</AlertDialogTitle>
            <AlertDialogDescription>
              Alla företag kopplas bort från koncernen men raderas inte. Denna åtgärd kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
