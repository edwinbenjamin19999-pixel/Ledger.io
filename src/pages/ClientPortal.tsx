import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, FileSignature, CheckCircle2, MessageSquare, Send, LogOut, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface ActionItem {
  id: string;
  item_type: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: string;
}

interface Message {
  id: string;
  sender_side: "bureau" | "client" | "system";
  body: string;
  created_at: string;
}

interface Branding {
  firmName: string;
  subtitle: string | null;
  logoUrl: string | null;
  primary: string;
  showPoweredBy: boolean;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(n);

export default function ClientPortal() {
  const { user, loading: authLoading } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("");
  const [firmId, setFirmId] = useState<string | null>(null);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Find the user's company
      const { data: company } = await supabase
        .from("companies")
        .select("id, name")
        .eq("created_by", user.id)
        .limit(1)
        .maybeSingle();
      if (!company) {
        setLoading(false);
        return;
      }
      setCompanyId(company.id);
      setCompanyName(company.name);

      // Find the firm assigned
      const { data: fc } = await supabase
        .from("firm_clients")
        .select("firm_id, accounting_firms:firm_id (id, name, subtitle, logo_url, brand_primary_color, show_powered_by)")
        .eq("company_id", company.id)
        .eq("is_active", true)
        .maybeSingle();
      if (fc?.firm_id) {
        setFirmId(fc.firm_id);
        const f = fc.accounting_firms as any;
        setBranding({
          firmName: f?.name ?? "Din byrå",
          subtitle: f?.subtitle ?? null,
          logoUrl: f?.logo_url ?? null,
          primary: f?.brand_primary_color ?? "#0B1929",
          showPoweredBy: f?.show_powered_by ?? true,
        });
      }
      await Promise.all([loadActions(company.id), loadMessages(company.id)]);
      setLoading(false);
    })();
  }, [user]);

  const loadActions = async (cid: string) => {
    const { data } = await supabase
      .from("portal_action_items")
      .select("*")
      .eq("company_id", cid)
      .neq("status", "completed")
      .order("deadline", { ascending: true, nullsFirst: false });
    setActions((data ?? []) as ActionItem[]);
  };

  const loadMessages = async (cid: string) => {
    const { data } = await supabase
      .from("portal_messages")
      .select("id, sender_side, body, created_at")
      .eq("company_id", cid)
      .order("created_at", { ascending: true })
      .limit(100);
    setMessages((data ?? []) as Message[]);
  };

  const completeAction = async (id: string) => {
    await supabase.from("portal_action_items").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      completed_by: user!.id,
    }).eq("id", id);
    if (companyId) loadActions(companyId);
    toast.success("Markerad som klar");
  };

  const sendMessage = async () => {
    if (!reply.trim() || !companyId || !firmId) return;
    const { error } = await supabase.from("portal_messages").insert({
      firm_id: firmId,
      company_id: companyId,
      sender_side: "client",
      sender_id: user!.id,
      body: reply.trim(),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setReply("");
    loadMessages(companyId);
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  if (authLoading) return <Loader2 className="h-6 w-6 animate-spin mx-auto mt-20 text-slate-400" />;
  if (!user) return <Navigate to="/auth" replace />;
  if (loading) return <Loader2 className="h-6 w-6 animate-spin mx-auto mt-20 text-slate-400" />;
  if (!companyId || !firmId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <p className="text-[15px] text-slate-700 mb-2">Ingen byrå är kopplad till ditt konto.</p>
          <p className="text-[13px] text-slate-500">Kontakta din byrå för åtkomst till portalen.</p>
        </div>
      </div>
    );
  }

  // Mock 6-month chart data for now (replace with real RR query)
  const chart = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return {
      month: format(d, "MMM", { locale: sv }),
      revenue: 50000 + Math.random() * 20000,
      costs: 30000 + Math.random() * 15000,
    };
  });

  return (
    <div className="min-h-screen bg-slate-50" style={{ ["--portal-primary" as any]: branding?.primary ?? "#0B1929" }}>
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-[960px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding?.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.firmName} className="h-9 w-auto" />
            ) : (
              <div
                className="h-9 w-9 rounded-md flex items-center justify-center text-white font-medium"
                style={{ backgroundColor: branding?.primary }}
              >
                {branding?.firmName?.[0] ?? "B"}
              </div>
            )}
            <div>
              <p className="text-[14px] font-medium text-slate-900">{branding?.firmName}</p>
              {branding?.subtitle && <p className="text-[11px] text-slate-500">{branding.subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-[13px] text-slate-700 hidden sm:block">{companyName}</p>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-1" /> Logga ut
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[960px] mx-auto px-6 py-8 space-y-8">
        {/* SECTION 1 — DIN EKONOMI */}
        <section>
          <h2 className="text-[16px] font-medium text-slate-900 mb-4">Din ekonomi</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <KpiCard label="Resultat denna månad" value={fmt(45000)} positive />
            <KpiCard label="Kassa & Bank" value={fmt(285000)} />
            <KpiCard label="Obetalda kundfakturor" value={fmt(67500)} />
          </div>

          <div className="bg-white border border-slate-200 rounded-[12px] p-4">
            <h3 className="text-[12px] font-medium uppercase tracking-wide text-slate-500 mb-3">
              Senaste 6 månaderna
            </h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart}>
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="revenue" name="Intäkter" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="costs" name="Kostnader" fill="#1e293b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm">
                <Download className="h-3.5 w-3.5 mr-1.5" /> Ladda ner månadsrapport (PDF)
              </Button>
            </div>
          </div>
        </section>

        {/* SECTION 2 — ATT GÖRA */}
        <section>
          <h2 className="text-[16px] font-medium text-slate-900 mb-4">Att göra</h2>
          {actions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-[12px] p-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-[13px] text-slate-600">Allt är klart just nu.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {actions.map((a) => (
                <ActionCard key={a.id} item={a} onComplete={() => completeAction(a.id)} />
              ))}
            </div>
          )}
        </section>

        {/* SECTION 3 — MEDDELANDEN */}
        <section>
          <h2 className="text-[16px] font-medium text-slate-900 mb-4 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Meddelanden
          </h2>
          <div className="bg-white border border-slate-200 rounded-[12px] overflow-hidden">
            <div className="max-h-[420px] overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <p className="text-center text-[12px] text-slate-400 py-8">Inga meddelanden ännu.</p>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.sender_side === "client" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-[13px] ${
                      m.sender_side === "client"
                        ? "bg-blue-600 text-white"
                        : m.sender_side === "system"
                        ? "bg-slate-100 text-slate-600 italic text-[12px]"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p className={`text-[10px] mt-1 ${m.sender_side === "client" ? "text-blue-100" : "text-slate-400"}`}>
                      {format(new Date(m.created_at), "d MMM HH:mm", { locale: sv })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 p-3 flex gap-2">
              <Textarea
                placeholder="Skriv ett meddelande till din byrå…"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                className="min-h-[44px] resize-none flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendMessage();
                }}
              />
              <Button onClick={sendMessage} disabled={!reply.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-[960px] mx-auto px-6 py-4 text-center text-[11px] text-slate-500">
          Sammanställt av {branding?.firmName}
          {branding?.showPoweredBy && <span className="mx-2">·</span>}
          {branding?.showPoweredBy && <span>Powered by Cogniq</span>}
        </div>
      </footer>
    </div>
  );
}

const KpiCard = ({ label, value, positive }: { label: string; value: string; positive?: boolean }) => (
  <div className="bg-white border border-slate-200 rounded-[12px] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
    <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">{label}</p>
    <p className={`text-[20px] font-medium tabular-nums ${positive ? "text-emerald-600" : "text-slate-900"}`}>
      {value}
    </p>
  </div>
);

const ActionCard = ({ item, onComplete }: { item: ActionItem; onComplete: () => void }) => {
  const Icon =
    item.item_type === "upload_receipt" ? Upload
    : item.item_type === "sign_document" ? FileSignature
    : MessageSquare;
  return (
    <div className="bg-white border border-slate-200 rounded-[12px] p-4 flex items-start gap-3">
      <div className="h-9 w-9 rounded-md bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-slate-900">{item.title}</p>
        {item.description && <p className="text-[12px] text-slate-600 mt-0.5">{item.description}</p>}
        {item.deadline && (
          <p className="text-[11px] text-slate-500 mt-1">
            Senast: {format(new Date(item.deadline), "d MMM yyyy", { locale: sv })}
          </p>
        )}
      </div>
      <Button size="sm" variant="outline" onClick={onComplete}>
        Markera klar
      </Button>
    </div>
  );
};
