import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Crown, Briefcase, Eye, Plus, Copy, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Member {
  id: string;
  user_id: string;
  role: "admin" | "consultant" | "viewer";
  is_active: boolean;
  email: string;
  name: string;
  assignedClients: number;
  lastActiveLabel: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  created_at: string;
}

const ROLE_META: Record<Member["role"], { label: string; icon: typeof Crown; tone: string }> = {
  admin:      { label: "Byråadmin",  icon: Crown,     tone: "text-amber-700 bg-amber-50" },
  consultant: { label: "Redovisare", icon: Briefcase, tone: "text-[#3b82f6] bg-blue-50" },
  viewer:     { label: "Läsare",     icon: Eye,       tone: "text-slate-700 bg-slate-100" },
};

export function StaffPanel() {
  const { firmId } = useAdvisorContext();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  const load = async () => {
    if (!firmId) return;
    setLoading(true);
    const { data: rows } = await supabase
      .from("firm_members")
      .select("id, user_id, role, is_active, updated_at")
      .eq("firm_id", firmId)
      .order("created_at");
    const userIds = (rows ?? []).map((r) => r.user_id);
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("id, email, first_name, last_name").in("id", userIds)
      : { data: [] };
    const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const { data: assignments } = await supabase
      .from("firm_clients")
      .select("assigned_consultant_id")
      .eq("firm_id", firmId)
      .eq("is_active", true);
    const clientCountByUser = new Map<string, number>();
    for (const a of assignments ?? []) {
      const u = a.assigned_consultant_id;
      if (u) clientCountByUser.set(u, (clientCountByUser.get(u) ?? 0) + 1);
    }

    setMembers(
      (rows ?? []).map((r) => {
        const p = pmap.get(r.user_id);
        const updated = r.updated_at ? new Date(r.updated_at) : null;
        return {
          id: r.id,
          user_id: r.user_id,
          role: r.role as Member["role"],
          is_active: r.is_active,
          email: p?.email ?? "—",
          name: [p?.first_name, p?.last_name].filter(Boolean).join(" ") || (p?.email ?? "Okänd"),
          assignedClients: clientCountByUser.get(r.user_id) ?? 0,
          lastActiveLabel: updated ? relTime(updated) : "—",
        };
      }),
    );

    const { data: inv } = await supabase
      .from("firm_invitations")
      .select("id, email, role, status, token, created_at")
      .eq("firm_id", firmId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setInvites((inv ?? []) as Invitation[]);

    setLoading(false);
  };

  useEffect(() => { void load(); }, [firmId]);

  const updateRole = async (id: string, newRole: string) => {
    const { error } = await supabase
      .from("firm_members")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error("Kunde inte uppdatera roll");
    else {
      setMembers((m) => m.map((x) => (x.id === id ? { ...x, role: newRole as Member["role"] } : x)));
      toast.success("Roll uppdaterad");
    }
  };

  const revokeInvite = async (id: string) => {
    await supabase.from("firm_invitations").update({ status: "revoked" }).eq("id", id);
    setInvites((i) => i.filter((x) => x.id !== id));
    toast.success("Inbjudan återkallad");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#0F172A]">Medarbetare</h3>
          <p className="text-xs text-[#64748B] mt-0.5">
            Bjud in kollegor och hantera roller och klienttilldelning.
          </p>
        </div>
        <Button onClick={() => setShowInvite(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Bjud in medarbetare
        </Button>
      </div>

      {/* Members table */}
      <div className="rounded-3xl bg-white border border-[#E2E8F0] overflow-hidden">
        <div className="px-5 py-3 bg-[#F8FAFC] grid grid-cols-[1.5fr_1.5fr_160px_90px_120px_110px] gap-4 text-[10px] uppercase tracking-wide font-bold text-[#94A3B8]">
          <span>Namn</span><span>E-post</span><span>Roll</span><span>Klienter</span><span>Senast aktiv</span><span>Status</span>
        </div>
        {loading ? (
          <div className="py-12 text-center text-sm text-[#94A3B8]"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Laddar…</div>
        ) : members.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#94A3B8]">Inga medarbetare ännu.</div>
        ) : (
          <div className="divide-y divide-[#F1F5F9]">
            {members.map((m) => {
              const meta = ROLE_META[m.role];
              const Icon = meta.icon;
              return (
                <div key={m.id} className="px-5 py-3 grid grid-cols-[1.5fr_1.5fr_160px_90px_120px_110px] items-center gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${meta.tone}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm font-medium text-[#0F172A] truncate">{m.name}</span>
                  </div>
                  <span className="text-sm text-[#64748B] truncate">{m.email}</span>
                  <Select value={m.role} onValueChange={(v) => updateRole(m.id, v)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(ROLE_META) as Array<[Member["role"], typeof ROLE_META.admin]>).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm tabular-nums text-[#0F172A]">{m.assignedClients}</span>
                  <span className="text-xs text-[#64748B]">{m.lastActiveLabel}</span>
                  <Badge variant={m.is_active ? "default" : "secondary"}>{m.is_active ? "Aktiv" : "Inaktiv"}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending invitations */}
      {invites.length > 0 && (
        <div className="rounded-3xl bg-white border border-[#E2E8F0] overflow-hidden">
          <div className="px-5 py-3 bg-amber-50 text-[10px] uppercase tracking-wide font-bold text-amber-700">
            Väntande inbjudningar ({invites.length})
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {invites.map((inv) => (
              <div key={inv.id} className="px-5 py-3 flex items-center gap-3">
                <Mail className="h-4 w-4 text-[#94A3B8]" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#0F172A] truncate">{inv.email}</div>
                  <div className="text-xs text-[#64748B]">{ROLE_META[inv.role as Member["role"]]?.label ?? inv.role} · skickad {relTime(new Date(inv.created_at))}</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const link = `${window.location.origin}/firm/accept-invite?token=${inv.token}`;
                    void navigator.clipboard.writeText(link);
                    toast.success("Inbjudningslänk kopierad");
                  }}
                >
                  <Copy className="h-3 w-3 mr-1" /> Kopiera länk
                </Button>
                <Button variant="ghost" size="sm" className="text-[#DC2626]" onClick={() => revokeInvite(inv.id)}>
                  Återkalla
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <InviteModal open={showInvite} onClose={() => setShowInvite(false)} firmId={firmId} onCreated={() => void load()} />
    </div>
  );
}

function InviteModal({
  open, onClose, firmId, onCreated,
}: { open: boolean; onClose: () => void; firmId: string | null; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "consultant" | "viewer">("consultant");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!firmId) return;
    if (!email.includes("@")) { toast.error("Ogiltig e-post"); return; }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("firm_invitations")
      .insert({ firm_id: firmId, email: email.trim().toLowerCase(), role, invited_by: user?.id })
      .select("token")
      .single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    const link = `${window.location.origin}/firm/accept-invite?token=${data.token}`;
    void navigator.clipboard.writeText(link);
    toast.success(`Inbjudan skapad. Länk kopierad till urklipp.`);
    setName(""); setEmail(""); setRole("consultant");
    onCreated();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Bjud in medarbetare</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Namn</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Anna Andersson" />
          </div>
          <div className="space-y-2">
            <Label>E-post</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="anna@byrå.se" />
          </div>
          <div className="space-y-2">
            <Label>Roll</Label>
            <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Byråadmin – full åtkomst alla klienter + inställningar</SelectItem>
                <SelectItem value="consultant">Redovisare – endast tilldelade klienter</SelectItem>
                <SelectItem value="viewer">Läsare – läsbehörighet på tilldelade klienter</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Avbryt</Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
            Skicka inbjudan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function relTime(d: Date): string {
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "nyss";
  if (diff < 3600) return `${Math.floor(diff / 60)} min sedan`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h sedan`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} d sedan`;
  return d.toLocaleDateString("sv-SE");
}
