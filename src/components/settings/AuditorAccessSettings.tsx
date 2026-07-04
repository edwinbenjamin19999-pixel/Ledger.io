import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, Shield, Trash2, UserPlus, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface AuditorAccess {
  id: string;
  email: string;
  token: string;
  scope_type: string;
  scope_year: number | null;
  scope_from: string | null;
  scope_to: string | null;
  valid_from: string;
  valid_until: string;
  revoked_at: string | null;
  last_accessed_at: string | null;
  created_at: string;
}

interface Props {
  companyId: string;
}

export function AuditorAccessSettings({ companyId }: Props) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<AuditorAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  // form
  const [email, setEmail] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const max = new Date(); max.setMonth(max.getMonth() + 12);
  const [validFrom, setValidFrom] = useState(today);
  const [validUntil, setValidUntil] = useState(max.toISOString().slice(0, 10));
  const [scopeType, setScopeType] = useState<"all" | "fiscal_year" | "custom">("all");
  const [scopeYear, setScopeYear] = useState<string>(String(new Date().getFullYear() - 1));
  const [scopeFrom, setScopeFrom] = useState("");
  const [scopeTo, setScopeTo] = useState("");

  useEffect(() => { if (companyId) load(); }, [companyId]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("auditor_access")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setSessions((data ?? []) as AuditorAccess[]);
    setLoading(false);
  };

  const submit = async () => {
    if (!email || !validUntil || !user) return;
    // Enforce 12-month max
    const from = new Date(validFrom);
    const until = new Date(validUntil);
    const months = (until.getFullYear() - from.getFullYear()) * 12 + (until.getMonth() - from.getMonth());
    if (months > 12) {
      toast.error("Åtkomstperioden får vara max 12 månader");
      return;
    }
    setSaving(true);
    const payload: any = {
      company_id: companyId,
      email: email.trim().toLowerCase(),
      granted_by: user.id,
      valid_from: validFrom,
      valid_until: validUntil,
      scope_type: scopeType,
      scope_year: scopeType === "fiscal_year" ? Number(scopeYear) : null,
      scope_from: scopeType === "custom" ? scopeFrom : null,
      scope_to: scopeType === "custom" ? scopeTo : null,
    };
    const { data, error } = await (supabase as any)
      .from("auditor_access")
      .insert(payload)
      .select()
      .single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    const link = `${window.location.origin}/revisor/${data.token}`;
    setShareLink(link);
    setOpen(false);
    setEmail("");
    toast.success("Revisorsåtkomst skapad");
    load();
  };

  const revoke = async (id: string) => {
    const { error } = await (supabase as any)
      .from("auditor_access")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Åtkomst återkallad");
    load();
  };

  const copy = async (token: string) => {
    const link = `${window.location.origin}/revisor/${token}`;
    await navigator.clipboard.writeText(link);
    toast.success("Länk kopierad");
  };

  const statusBadge = (s: AuditorAccess) => {
    if (s.revoked_at) return <Badge variant="destructive">Återkallad</Badge>;
    if (new Date(s.valid_until) < new Date()) return <Badge variant="secondary">Utgången</Badge>;
    return <Badge className="bg-emerald-600">Aktiv</Badge>;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Revisorsåtkomst</CardTitle>
            <CardDescription>Bjud in en extern revisor med skrivskyddad åtkomst i upp till 12 månader.</CardDescription>
          </div>
          <Button onClick={() => setOpen(true)} className="gap-2"><UserPlus className="h-4 w-4" /> Bjud in revisor</Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Laddar…</div>
          ) : sessions.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Inga revisorer inbjudna ännu.</div>
          ) : (
            <div className="space-y-2">
              {sessions.map(s => (
                <div key={s.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.email}</span>
                      {statusBadge(s)}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3">
                      <span>{format(new Date(s.valid_from), "yyyy-MM-dd")} → {format(new Date(s.valid_until), "yyyy-MM-dd")}</span>
                      <span>Omfattning: {s.scope_type === "all" ? "Alla perioder" : s.scope_type === "fiscal_year" ? `Räkenskapsår ${s.scope_year}` : `${s.scope_from} → ${s.scope_to}`}</span>
                      {s.last_accessed_at && (
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Senast: {format(new Date(s.last_accessed_at), "yyyy-MM-dd HH:mm")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!s.revoked_at && (
                      <Button variant="outline" size="sm" onClick={() => copy(s.token)} className="gap-1"><Copy className="h-3 w-3" />Kopiera länk</Button>
                    )}
                    {!s.revoked_at && (
                      <Button variant="ghost" size="sm" onClick={() => revoke(s.id)} className="gap-1 text-destructive"><Trash2 className="h-3 w-3" />Återkalla</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bjud in revisor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>E-post</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="revisor@firma.se" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Från</Label>
                <Input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} />
              </div>
              <div>
                <Label>Till (max 12 mån)</Label>
                <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Datumomfattning</Label>
              <Select value={scopeType} onValueChange={(v: any) => setScopeType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla perioder</SelectItem>
                  <SelectItem value="fiscal_year">Specifikt räkenskapsår</SelectItem>
                  <SelectItem value="custom">Anpassat datumintervall</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {scopeType === "fiscal_year" && (
              <div>
                <Label>År</Label>
                <Input type="number" value={scopeYear} onChange={e => setScopeYear(e.target.value)} />
              </div>
            )}
            {scopeType === "custom" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Från</Label>
                  <Input type="date" value={scopeFrom} onChange={e => setScopeFrom(e.target.value)} />
                </div>
                <div>
                  <Label>Till</Label>
                  <Input type="date" value={scopeTo} onChange={e => setScopeTo(e.target.value)} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Avbryt</Button>
            <Button onClick={submit} disabled={saving || !email}>Skapa åtkomst</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!shareLink} onOpenChange={(o) => !o && setShareLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Säker inloggningslänk</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Skicka denna länk till revisorn. Länken är giltig till och med slutdatumet.</p>
          <div className="flex gap-2">
            <Input readOnly value={shareLink ?? ""} />
            <Button onClick={() => { if (shareLink) { navigator.clipboard.writeText(shareLink); toast.success("Kopierad"); } }}><Copy className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
