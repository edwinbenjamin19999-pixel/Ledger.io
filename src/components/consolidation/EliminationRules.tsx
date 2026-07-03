import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Elimination { id: string;
  group_id: string;
  company_a_id: string;
  company_b_id: string;
  elimination_type: string;
  amount: number;
  currency: string;
  period_start: string;
  period_end: string;
  notes?: string;
  company_a?: { name: string };
  company_b?: { name: string };
}

interface Group { id: string;
  name: string;
  currency?: string;
  fiscal_year_start?: number;
  billing_company_id?: string | null;
  subscription_tier?: string | null;
  subscription_status?: string | null;
  companies?: Company[];
}

interface Company { id: string;
  name: string;
}

export const EliminationRules = () => { const [eliminations, setEliminations] = useState<Elimination[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadData();
  }, []);

  const loadData = async () => { try { // Load groups with companies
      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select("*, companies:companies(id, name)")
        .order("created_at", { ascending: false });

      if (groupsError) throw groupsError;
      setGroups((groupsData || []) as unknown as Group[]);

      // Load eliminations
      const { data: eliminationsData, error: eliminationsError } = await supabase
        .from("eliminations")
        .select(`
          *,
          company_a:companies!eliminations_company_a_id_fkey(name),
          company_b:companies!eliminations_company_b_id_fkey(name)
        `)
        .order("created_at", { ascending: false });

      if (eliminationsError) throw eliminationsError;
      setEliminations(eliminationsData || []);
    } catch (error: any) { toast.error(error.message || "Kunde inte ladda data");
    } finally { setIsLoading(false);
    }
  };

  const handleCreateElimination = async (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try { const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Användare ej inloggad");

      const { error } = await supabase.from("eliminations").insert([{ group_id: selectedGroup,
        company_a_id: formData.get("company_a") as string,
        company_b_id: formData.get("company_b") as string,
        elimination_type: formData.get("type") as string,
        amount: parseFloat(formData.get("amount") as string),
        currency: formData.get("currency") as string,
        period_start: formData.get("period_start") as string,
        period_end: formData.get("period_end") as string,
        notes: formData.get("notes") as string || null,
        created_by: user.id
      }] as any);

      if (error) throw error;

      toast.success("Elimineringsregel skapad!");
      setIsDialogOpen(false);
      loadData();
      (e.target as HTMLFormElement).reset();
    } catch (error: any) { toast.error(error.message || "Kunde inte skapa elimineringsregel");
    }
  };

  const handleDeleteElimination = async (id: string) => { try { const { error } = await supabase
        .from("eliminations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Elimineringsregel raderad!");
      loadData();
    } catch (error: any) { toast.error(error.message || "Kunde inte radera elimineringsregel");
    }
  };

  if (isLoading) { return <div>Laddar...</div>;
  }

  const selectedGroupData = groups.find((g) => g.id === selectedGroup);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Elimineringar</h2>
          <p className="text-muted-foreground mt-1">
            Definiera interna transaktioner som ska elimineras vid konsolidering
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={groups.length === 0}>
              <Plus className="w-4 h-4 mr-2" />
              Ny eliminering
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Skapa elimineringsregel</DialogTitle>
              <DialogDescription>
                Definiera en intern transaktion som ska elimineras vid koncernkonsolidering
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateElimination} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="group">Koncern</Label>
                <Select
                  name="group"
                  value={selectedGroup}
                  onValueChange={setSelectedGroup}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Välj koncern" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedGroup && selectedGroupData && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company_a">Företag A</Label>
                      <Select name="company_a" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Välj företag" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedGroupData.companies?.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company_b">Företag B</Label>
                      <Select name="company_b" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Välj företag" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedGroupData.companies?.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Typ av eliminering</Label>
                      <Select name="type" required>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="intercompany_receivable">Koncernintern fordran</SelectItem>
                          <SelectItem value="intercompany_payable">Koncernintern skuld</SelectItem>
                          <SelectItem value="intercompany_revenue">Koncernintern intäkt</SelectItem>
                          <SelectItem value="intercompany_expense">Koncernintern kostnad</SelectItem>
                          <SelectItem value="dividend">Utdelning</SelectItem>
                          <SelectItem value="investment">Aktieinnehav</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amount">Belopp</Label>
                      <Input
                        id="amount"
                        name="amount"
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="currency">Valuta</Label>
                      <Select name="currency" defaultValue="SEK" required>
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="period_start">Period start</Label>
                      <Input
                        id="period_start"
                        name="period_start"
                        type="date"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="period_end">Period slut</Label>
                      <Input
                        id="period_end"
                        name="period_end"
                        type="date"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Anteckningar (valfritt)</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      placeholder="Beskrivning av elimineringen..."
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Avbryt
                </Button>
                <Button type="submit">Skapa eliminering</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {eliminations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground mb-4">Inga elimineringsregler ännu</p>
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">Skapa först en koncern</p>
            ) : (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Skapa första elimineringen
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {eliminations.map((elimination) => (
            <Card key={elimination.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {elimination.company_a?.name} ↔ {elimination.company_b?.name}
                    </CardTitle>
                    <CardDescription>
                      {elimination.elimination_type.replace(/_/g, " ")} • {elimination.amount.toLocaleString("sv-SE")} {elimination.currency}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteElimination(elimination.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Period:</span>{" "}
                    {new Date(elimination.period_start).toLocaleDateString("sv-SE")} -{" "}
                    {new Date(elimination.period_end).toLocaleDateString("sv-SE")}
                  </p>
                  {elimination.notes && (
                    <p className="text-muted-foreground mt-2">{elimination.notes}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
