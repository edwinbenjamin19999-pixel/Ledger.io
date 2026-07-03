import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, UserCog } from "lucide-react";

interface Props { companyId: string }
interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  employment_type: string;
  monthly_salary: number | null;
  is_active: boolean;
  employment_start: string;
}

const EMPTY = {
  first_name: "",
  last_name: "",
  personal_number: "",
  email: "",
  phone: "",
  employment_type: "full_time",
  monthly_salary: "",
  employment_start: new Date().toISOString().split("T")[0],
};

export const EmployeesSettings = ({ companyId }: Props) => {
  const { user } = useAuth();
  const [list, setList] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("employees")
      .select("id, first_name, last_name, email, employment_type, monthly_salary, is_active, employment_start")
      .eq("company_id", companyId)
      .order("is_active", { ascending: false })
      .order("first_name");
    if (error) toast.error("Kunde inte ladda anställda", { description: error.message });
    setList((data ?? []) as Employee[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [companyId]);

  const save = async () => {
    if (!user || !companyId) return;
    if (!form.first_name || !form.last_name || !form.personal_number) {
      toast.error("Fyll i förnamn, efternamn och personnummer");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("employees").insert({
      company_id: companyId,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      personal_number: form.personal_number.trim(),
      email: form.email || null,
      phone: form.phone || null,
      employment_type: form.employment_type,
      monthly_salary: form.monthly_salary ? parseFloat(form.monthly_salary) : null,
      employment_start: form.employment_start,
      created_by: user.id,
    });
    setSaving(false);
    if (error) {
      toast.error("Kunde inte lägga till anställd", { description: error.message });
      return;
    }
    toast.success(`${form.first_name} ${form.last_name} tillagd`);
    setForm(EMPTY);
    setOpen(false);
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCog className="h-5 w-5" />
            Anställda
          </CardTitle>
          <CardDescription>Hantera anställda kopplade till företaget</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Ny anställd</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Lägg till anställd</DialogTitle>
              <DialogDescription>Grunduppgifter — fler fält kan redigeras i HR-modulen.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Förnamn *</Label>
                  <Input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Efternamn *</Label>
                  <Input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Personnummer *</Label>
                <Input
                  placeholder="YYYYMMDD-XXXX"
                  maxLength={13}
                  value={form.personal_number}
                  onChange={e => {
                    let v = e.target.value.replace(/\D/g, "");
                    if (v.length > 8) v = v.slice(0, 8) + "-" + v.slice(8, 12);
                    setForm({ ...form, personal_number: v });
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>E-post</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefon</Label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Anställningsform</Label>
                  <Select value={form.employment_type} onValueChange={v => setForm({ ...form, employment_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Heltid</SelectItem>
                      <SelectItem value="part_time">Deltid</SelectItem>
                      <SelectItem value="hourly">Timanställd</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Månadslön (kr)</Label>
                  <Input type="number" value={form.monthly_salary} onChange={e => setForm({ ...form, monthly_salary: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Anställningsdatum</Label>
                <Input type="date" value={form.employment_start} onChange={e => setForm({ ...form, employment_start: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Avbryt</Button>
              <Button onClick={save} disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sparar...</> : "Lägg till"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Inga anställda registrerade ännu</p>
        ) : (
          <div className="space-y-2">
            {list.map(e => (
              <div key={e.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{e.first_name} {e.last_name}</span>
                    <Badge variant={e.is_active ? "default" : "outline"}>{e.is_active ? "Aktiv" : "Inaktiv"}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {e.email || "—"} · {e.employment_type === "full_time" ? "Heltid" : e.employment_type === "part_time" ? "Deltid" : "Timanställd"}
                    {e.monthly_salary ? ` · ${new Intl.NumberFormat("sv-SE").format(Number(e.monthly_salary))} kr/mån` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
