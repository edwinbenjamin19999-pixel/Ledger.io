import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, User, Crown, Eye, Briefcase } from "lucide-react";
import { toast } from "sonner";

interface Member {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  email: string;
  name: string;
}

const ROLES: Record<string, { label: string; icon: typeof Shield; tone: string; perms: string[] }> = {
  admin: {
    label: "Administratör",
    icon: Crown,
    tone: "text-[#7A5417] bg-[#FAEEDA] ring-amber-200",
    perms: ["Hantera team", "Branding", "Fakturering", "Alla klienter"],
  },
  consultant: {
    label: "Konsult",
    icon: Briefcase,
    tone: "text-[#3b82f6] bg-[#EFF6FF] ring-cyan-200",
    perms: ["Bokföring", "Granska klienter", "Skicka godkännanden"],
  },
  viewer: {
    label: "Klient/Läs",
    icon: Eye,
    tone: "text-slate-700 bg-slate-50 ring-slate-200",
    perms: ["Visa rapporter", "Signera BankID"],
  },
};

export function RolesPanel() {
  const { firmId } = useAdvisorContext();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firmId) return;
    void load();
  }, [firmId]);

  const load = async () => {
    setLoading(true);
    const { data: rows } = await supabase
      .from("firm_members")
      .select("id, user_id, role, is_active")
      .eq("firm_id", firmId!)
      .order("created_at");
    const userIds = (rows ?? []).map((r) => r.user_id);
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("id, email, first_name, last_name").in("id", userIds)
      : { data: [] };
    const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));
    setMembers(
      (rows ?? []).map((r) => {
        const p = pmap.get(r.user_id);
        return {
          id: r.id,
          user_id: r.user_id,
          role: r.role,
          is_active: r.is_active,
          email: p?.email ?? "—",
          name: [p?.first_name, p?.last_name].filter(Boolean).join(" ") || (p?.email ?? "Okänd"),
        };
      }),
    );
    setLoading(false);
  };

  const updateRole = async (id: string, newRole: string) => {
    const { error } = await supabase
      .from("firm_members")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error("Kunde inte uppdatera roll");
    else {
      setMembers((m) => m.map((x) => (x.id === id ? { ...x, role: newRole } : x)));
      toast.success("Roll uppdaterad");
    }
  };

  return (
    <div className="space-y-6">
      {/* Role legend */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {Object.entries(ROLES).map(([key, r]) => (
          <div key={key} className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
            <div className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${r.tone.split(" ").slice(1).join(" ")}`}>
                <r.icon className={`h-4 w-4 ${r.tone.split(" ")[0]}`} />
              </div>
              <div className="text-sm font-semibold text-[#0F172A]">{r.label}</div>
            </div>
            <ul className="mt-3 space-y-1">
              {r.perms.map((p) => (
                <li key={p} className="text-xs text-[#64748B] flex items-center gap-1.5">
                  <Shield className="h-2.5 w-2.5 text-[#94A3B8]" /> {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Member table */}
      <div className="rounded-3xl bg-white border border-[#E2E8F0] overflow-hidden">
        <div className="px-5 py-3 bg-[#F8FAFC] grid grid-cols-[1fr_1fr_180px_auto] gap-4 text-[10px] uppercase tracking-wide font-bold text-[#94A3B8]">
          <span>Namn</span>
          <span>E-post</span>
          <span>Roll</span>
          <span>Status</span>
        </div>
        {loading ? (
          <div className="py-12 text-center text-sm text-[#94A3B8]">Laddar…</div>
        ) : members.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#94A3B8]">Inga teammedlemmar.</div>
        ) : (
          <div className="divide-y divide-[#F1F5F9]">
            {members.map((m) => (
              <div key={m.id} className="px-5 py-3 grid grid-cols-[1fr_1fr_180px_auto] items-center gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="h-4 w-4 text-[#94A3B8] shrink-0" />
                  <span className="text-sm font-medium text-[#0F172A] truncate">{m.name}</span>
                </div>
                <span className="text-sm text-[#64748B] truncate">{m.email}</span>
                <Select value={m.role} onValueChange={(v) => updateRole(m.id, v)}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLES).map(([k, r]) => (
                      <SelectItem key={k} value={k}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant={m.is_active ? "default" : "secondary"}>{m.is_active ? "Aktiv" : "Inaktiv"}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
