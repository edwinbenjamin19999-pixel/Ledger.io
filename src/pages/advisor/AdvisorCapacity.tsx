import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Plus, Loader2, Users, Mail } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Label } from "@/components/ui/label";

interface StaffRow {
  id: string;
  name: string;
  role: string;
  loggedHours: number;
  capacityHours: number;
  clients: number;
}

interface ClientTimeRow {
  companyId: string;
  name: string;
  estimatedHours: number;
  loggedHours: number;
  costSek: number;
}

const DEFAULT_HOURLY_RATE = 750;
const MONTHLY_CAPACITY = 160;

export default function AdvisorCapacity() {
  const { firmId, clients } = useAdvisorContext();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [byClient, setByClient] = useState<ClientTimeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [hourlyRate, setHourlyRate] = useState<number>(DEFAULT_HOURLY_RATE);
  const [invite, setInvite] = useState({ name: "", email: "", role: "consultant" as "admin" | "consultant" | "viewer" });
  const [inviteBusy, setInviteBusy] = useState(false);
  const [draft, setDraft] = useState({ companyId: "", date: format(new Date(), "yyyy-MM-dd"), hours: "1", activity: "Bokföring", description: "" });

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  useEffect(() => {
    if (!firmId) return;
    (async () => {
      setLoading(true);
      // Load firm hourly rate
      const { data: firm } = await supabase
        .from("accounting_firms")
        .select("default_hourly_rate")
        .eq("id", firmId)
        .maybeSingle();
      const rate = Number((firm as any)?.default_hourly_rate ?? DEFAULT_HOURLY_RATE);
      setHourlyRate(rate > 0 ? rate : DEFAULT_HOURLY_RATE);

      // Staff (firm members + profiles)
      const { data: members } = await supabase
        .from("firm_members")
        .select("user_id, role, profiles:user_id (id, first_name, last_name, email)")
        .eq("firm_id", firmId)
        .eq("is_active", true);

      const staffList: StaffRow[] = [];
      for (const m of (members ?? []) as any[]) {
        const p = m.profiles as any;
        const name = [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim() || p?.email || "—";
        // logged hours this month for this user across firm clients
        const companyIds = clients.map((c) => c.id);
        let logged = 0;
        if (companyIds.length > 0) {
          const { data: te } = await supabase
            .from("time_entries")
            .select("duration_minutes")
            .eq("user_id", m.user_id)
            .gte("entry_date", format(monthStart, "yyyy-MM-dd"))
            .lte("entry_date", format(monthEnd, "yyyy-MM-dd"))
            .in("company_id", companyIds);
          logged = ((te ?? []) as any[]).reduce((s, e) => s + (e.duration_minutes ?? 0), 0) / 60;
        }
        // assigned clients
        const { count: cCount } = await supabase
          .from("firm_clients")
          .select("id", { head: true, count: "exact" })
          .eq("firm_id", firmId)
          .eq("assigned_consultant_id", m.user_id)
          .eq("is_active", true);
        staffList.push({
          id: m.user_id,
          name,
          role: m.role ?? "Medarbetare",
          loggedHours: logged,
          capacityHours: MONTHLY_CAPACITY,
          clients: cCount ?? 0,
        });
      }
      setStaff(staffList);

      // Client time distribution
      const distribution: ClientTimeRow[] = [];
      for (const c of clients) {
        const { data: te } = await supabase
          .from("time_entries")
          .select("duration_minutes")
          .eq("company_id", c.id)
          .gte("entry_date", format(monthStart, "yyyy-MM-dd"))
          .lte("entry_date", format(monthEnd, "yyyy-MM-dd"));
        const minutes = ((te ?? []) as any[]).reduce((s, e) => s + (e.duration_minutes ?? 0), 0);
        const hrs = minutes / 60;
        distribution.push({
          companyId: c.id,
          name: c.name,
          estimatedHours: 8, // default estimate; configurable per client later
          loggedHours: hrs,
          costSek: hrs * hourlyRate,
        });
      }
      distribution.sort((a, b) => (b.loggedHours - b.estimatedHours) - (a.loggedHours - a.estimatedHours));
      setByClient(distribution);
      setLoading(false);
    })();
  }, [firmId, clients.length]);

  const totals = useMemo(() => {
    const cap = staff.reduce((s, x) => s + x.capacityHours, 0);
    const used = staff.reduce((s, x) => s + x.loggedHours, 0);
    const util = cap > 0 ? (used / cap) * 100 : 0;
    return { cap, used, available: cap - used, util };
  }, [staff]);

  const submitTime = async () => {
    if (!draft.companyId || !draft.hours) return;
    const { data: u } = await supabase.auth.getUser();
    const minutes = Math.round(parseFloat(draft.hours) * 60);
    const { error } = await supabase.from("time_entries").insert({
      company_id: draft.companyId,
      user_id: u.user?.id,
      entry_date: draft.date,
      duration_minutes: minutes,
      description: `${draft.activity}${draft.description ? ` — ${draft.description}` : ""}`,
      hourly_rate: hourlyRate,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Tid loggad");
    setLogOpen(false);
    setDraft({ ...draft, hours: "1", description: "" });
  };

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[20px] font-medium tracking-[-0.02em] text-slate-900">Kapacitet</h1>
          <p className="text-[12px] text-slate-500 mt-0.5">Medarbetarnas beläggning och klientfördelning · {format(monthStart, "MMMM yyyy")}</p>
        </div>
        <Dialog open={logOpen} onOpenChange={setLogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1.5" /> Logga tid</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Logga tid</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-[12px] text-slate-600">Klient</label>
                <Select value={draft.companyId} onValueChange={(v) => setDraft({ ...draft, companyId: v })}>
                  <SelectTrigger><SelectValue placeholder="Välj klient" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[12px] text-slate-600">Datum</label>
                  <Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
                </div>
                <div>
                  <label className="text-[12px] text-slate-600">Timmar</label>
                  <Input type="number" step="0.5" min="0" value={draft.hours} onChange={(e) => setDraft({ ...draft, hours: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-[12px] text-slate-600">Aktivitet</label>
                <Select value={draft.activity} onValueChange={(v) => setDraft({ ...draft, activity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Bokföring", "Moms", "Löner", "Årsredovisning", "Rådgivning", "Möte", "Övrigt"].map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Textarea placeholder="Beskrivning (valfritt)" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              <Button onClick={submitTime} className="w-full">Spara tidpost</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* AI suggestion stub */}
      <div className="bg-[#EFF6FF] border border-[#B5D4F4] rounded-[12px] p-3 flex items-start gap-3">
        <Sparkles className="h-4 w-4 text-purple-600 mt-0.5" />
        <p className="text-[13px] text-slate-800">
          AI har upptäckt aktivitet i klientkonton idag. Logga tid för att hålla projekt på spår.
        </p>
      </div>

      {/* STAFF CARDS */}
      {loading ? (
        <div className="text-center text-slate-400 p-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
      ) : staff.length === 0 ? (
        <p className="text-[13px] text-slate-500 text-center p-8">Inga medarbetare i byrån.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {staff.map((s) => {
            const pct = (s.loggedHours / s.capacityHours) * 100;
            const accent = pct < 70 ? "bg-emerald-500" : pct < 90 ? "bg-amber-500" : "bg-red-500";
            return (
              <div key={s.id} className="bg-white border border-slate-200 rounded-[12px] overflow-hidden">
                <div className={`h-[3px] ${accent}`} />
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-[13px]">{s.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-slate-900 truncate">{s.name}</p>
                      <p className="text-[11px] text-slate-500">{s.role}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[12px]">
                      <span className="text-slate-500">{s.loggedHours.toFixed(1)}h / {s.capacityHours}h</span>
                      <span className="text-slate-700 font-medium">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${accent}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">{s.clients} klienter tilldelade</p>
                    <p className="text-[11px] text-slate-500">Tillgänglig: {Math.max(0, s.capacityHours - s.loggedHours).toFixed(1)}h</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUMMARY — godkänt dark card för byråtotalerna */}
      <div className="bg-[#111827] border border-white/[0.08] rounded-[12px] p-4 text-white">
        <h3 className="text-[12px] font-medium uppercase tracking-wide text-white/70 mb-3">Byråns totaler</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div><p className="text-[10px] uppercase text-white/50">Total kapacitet</p><p className="text-[18px] font-medium tabular-nums">{staff.length === 0 ? "—" : `${totals.cap.toFixed(0)}h`}</p></div>
          <div><p className="text-[10px] uppercase text-white/50">Använt</p><p className="text-[18px] font-medium tabular-nums">{staff.length === 0 ? "—" : `${totals.used.toFixed(0)}h`}</p></div>
          <div><p className="text-[10px] uppercase text-white/50">Tillgängligt</p><p className="text-[18px] font-medium text-emerald-300 tabular-nums">{staff.length === 0 ? "—" : `${totals.available.toFixed(0)}h`}</p></div>
          <div><p className="text-[10px] uppercase text-white/50">Beläggning</p><p className="text-[18px] font-medium tabular-nums">{staff.length === 0 ? "—" : `${totals.util.toFixed(0)}%`}</p></div>
        </div>
        <p className="mt-3 text-[12px] text-white/60 flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-purple-300" />
          {staff.length === 0
            ? "Lägg till medarbetare för att se kapacitetsprognos."
            : `Baserat på nuvarande beläggning kan byrån ta ~${Math.max(0, Math.floor(totals.available / 8))} nya klienter (snitt 8h/klient/månad).`}
        </p>
      </div>

      {/* CLIENT TIME DISTRIBUTION */}
      <div className="bg-white border border-slate-200 rounded-[12px] overflow-hidden">
        <h3 className="text-[12px] font-medium uppercase tracking-wide text-slate-500 px-4 py-3 border-b border-slate-100">
          Tid per klient — denna månad
        </h3>
        <table className="w-full text-[13px]">
          <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
            <tr>
              <th className="text-left px-4 py-2">Klient</th>
              <th className="text-right px-4 py-2">Estimat</th>
              <th className="text-right px-4 py-2">Faktisk</th>
              <th className="text-right px-4 py-2">Avvikelse</th>
              <th className="text-right px-4 py-2">Kostnad</th>
            </tr>
          </thead>
          <tbody>
            {byClient.map((r) => {
              const diff = r.loggedHours - r.estimatedHours;
              const diffPct = r.estimatedHours > 0 ? (diff / r.estimatedHours) * 100 : 0;
              const diffColor = diff > 1 ? "text-red-600" : diff < -1 ? "text-emerald-600" : "text-slate-500";
              return (
                <tr key={r.companyId} className="border-t border-slate-100">
                  <td className="px-4 py-2.5 font-medium">{r.name}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">{r.estimatedHours.toFixed(1)}h</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.loggedHours.toFixed(1)}h</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${diffColor}`}>
                    {diff >= 0 ? "+" : ""}{diff.toFixed(1)}h ({diff >= 0 ? "+" : ""}{diffPct.toFixed(0)}%)
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.costSek.toLocaleString("sv-SE", { maximumFractionDigits: 0 })} kr</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
