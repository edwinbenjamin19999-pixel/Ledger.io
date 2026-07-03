import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, ArrowLeft, CheckCircle2, Building2, Mail, Landmark, UserCog, PartyPopper, Loader2 } from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  { key: "basics",    label: "Grunduppgifter", icon: Building2 },
  { key: "invite",    label: "Bjud in klient", icon: Mail },
  { key: "bank",      label: "Koppla bank",    icon: Landmark },
  { key: "assign",    label: "Tilldela ansvarig", icon: UserCog },
  { key: "done",      label: "Klar",           icon: PartyPopper },
] as const;

const SNI_CODES = [
  "47.11 - Detaljhandel livsmedel",
  "56.10 - Restauranger",
  "62.01 - IT/Programmering",
  "68.20 - Uthyrning fastighet",
  "70.22 - Konsultverksamhet",
  "82.99 - Övriga företagstjänster",
];

export default function ClientOnboardingWizard() {
  const navigate = useNavigate();
  const { firmId } = useAdvisorContext();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(null);
  const [createdFirmClientId, setCreatedFirmClientId] = useState<string | null>(null);
  const [staff, setStaff] = useState<Array<{ user_id: string; name: string }>>([]);

  const [data, setData] = useState({
    name: "",
    org_number: "",
    industry: "62.01 - IT/Programmering",
    contact_name: "",
    contact_email: "",
    monthly_fee: 1500,
    invite_to_northledger: true,
    bank_method: "send_instructions" as "send_instructions" | "do_for_client",
    assigned_consultant_id: "",
    billing_day: 25,
  });

  const set = <K extends keyof typeof data>(k: K, v: (typeof data)[K]) => setData({ ...data, [k]: v });

  const loadStaff = async () => {
    if (!firmId) return;
    const { data: rows } = await supabase
      .from("firm_members").select("user_id").eq("firm_id", firmId).eq("is_active", true);
    const ids = (rows ?? []).map((r) => r.user_id);
    if (!ids.length) return;
    const { data: profiles } = await supabase.from("profiles").select("id, email, first_name, last_name").in("id", ids);
    setStaff((profiles ?? []).map((p) => ({
      user_id: p.id,
      name: [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Okänd",
    })));
  };

  const createClient = async () => {
    if (!firmId || !user) return;
    if (!data.name || !data.org_number) { toast.error("Namn och org.nr krävs"); return; }
    setBusy(true);
    try {
      const { data: company, error: cErr } = await supabase
        .from("companies")
        .insert({ name: data.name, org_number: data.org_number, created_by: user.id })
        .select("id").single();
      if (cErr) throw cErr;
      setCreatedCompanyId(company.id);

      const { data: fc, error: fcErr } = await supabase
        .from("firm_clients")
        .insert({ firm_id: firmId, company_id: company.id, status: "onboarding" })
        .select("id").single();
      if (fcErr) throw fcErr;
      setCreatedFirmClientId(fc.id);

      toast.success("Klient skapad");
      setStep(1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte skapa klient");
    } finally {
      setBusy(false);
    }
  };

  const sendInvite = async () => {
    if (!data.invite_to_northledger) { setStep(2); return; }
    if (!data.contact_email.includes("@")) { toast.error("Ogiltig e-post"); return; }
    // best-effort: insert into user_invitations if company exists
    if (createdCompanyId && user) {
      await supabase.from("user_invitations").insert({
        company_id: createdCompanyId,
        email: data.contact_email.trim().toLowerCase(),
        role: "owner",
        invited_by: user.id,
      });
      toast.success(`Inbjudan skickad till ${data.contact_email}`);
    }
    setStep(2);
  };

  const finalizeAssign = async () => {
    if (!createdFirmClientId) { setStep(4); return; }
    setBusy(true);
    const patch: Record<string, unknown> = {};
    if (data.assigned_consultant_id) patch.assigned_consultant_id = data.assigned_consultant_id;
    if (Object.keys(patch).length) {
      const { error } = await supabase.from("firm_clients").update(patch).eq("id", createdFirmClientId);
      if (error) toast.error(error.message);
    }
    setBusy(false);
    setStep(4);
  };

  const goNext = async () => {
    if (step === 0) return createClient();
    if (step === 1) return sendInvite();
    if (step === 2) return setStep(3);
    if (step === 3) return finalizeAssign();
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#94A3B8]">Onboarding</p>
        <h1 className="text-3xl font-bold text-[#0F172A] mt-1">Lägg till ny klient</h1>
        <p className="text-[#64748B] mt-1.5">Guidat 5-stegsflöde för att lägga upp en ny klient i byrån.</p>
      </div>

      {/* Stepper */}
      <ol className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const active = i === step, done = i < step;
          const Icon = s.icon;
          return (
            <li key={s.key} className="flex-1 flex items-center gap-2 min-w-0">
              <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                done ? "bg-emerald-100 text-emerald-700" : active ? "bg-[hsl(var(--brand-primary))] text-white" : "bg-slate-100 text-slate-400"
              }`}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={`text-xs font-semibold truncate ${active ? "text-[#0F172A]" : "text-[#94A3B8]"}`}>{s.label}</span>
              {i < STEPS.length - 1 && <div className="flex-1 h-[1px] bg-slate-200" />}
            </li>
          );
        })}
      </ol>

      {/* Step content */}
      <div className="rounded-3xl bg-white border border-[#E2E8F0] p-8 space-y-5">
        {step === 0 && (
          <>
            <h2 className="text-lg font-bold text-[#0F172A]">Grunduppgifter</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Företagsnamn"><Input value={data.name} onChange={(e) => set("name", e.target.value)} /></Field>
              <Field label="Organisationsnummer"><Input value={data.org_number} onChange={(e) => set("org_number", e.target.value)} placeholder="556677-8899" /></Field>
              <Field label="Bransch (SNI)">
                <Select value={data.industry} onValueChange={(v) => set("industry", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SNI_CODES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Månadsavgift (intern, ej synlig för klient)">
                <Input type="number" value={data.monthly_fee} onChange={(e) => set("monthly_fee", Number(e.target.value))} />
              </Field>
              <Field label="Kontaktperson"><Input value={data.contact_name} onChange={(e) => set("contact_name", e.target.value)} /></Field>
              <Field label="Kontakt e-post"><Input type="email" value={data.contact_email} onChange={(e) => set("contact_email", e.target.value)} /></Field>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="text-lg font-bold text-[#0F172A]">Bjud in klient till Bokfy</h2>
            <div className="rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-[#0F172A]">Klienten ska ha tillgång till Bokfy</div>
                <div className="text-xs text-[#64748B]">Klienten får en egen arbetsyta med byråns varumärke.</div>
              </div>
              <Switch checked={data.invite_to_northledger} onCheckedChange={(v) => set("invite_to_northledger", v)} />
            </div>
            {data.invite_to_northledger && (
              <div className="rounded-2xl border border-[#E2E8F0] p-4 text-sm text-[#475569]">
                En byrå-brandad inbjudan skickas till <span className="font-semibold text-[#0F172A]">{data.contact_email || "—"}</span> som förklarar vad Bokfy är.
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-lg font-bold text-[#0F172A]">Koppla bank</h2>
            <p className="text-sm text-[#64748B]">Hjälp klienten koppla sin bank via PSD2 (Open Banking).</p>
            <div className="grid grid-cols-2 gap-4">
              <BankCard
                active={data.bank_method === "send_instructions"}
                onClick={() => set("bank_method", "send_instructions")}
                title="Skicka instruktioner"
                desc="Klienten får ett mejl med steg-för-steg-guide för att koppla sin bank själv."
              />
              <BankCard
                active={data.bank_method === "do_for_client"}
                onClick={() => set("bank_method", "do_for_client")}
                title="Gör det åt klienten"
                desc="Du loggar in tillsammans med klienten och kopplar banken på plats."
              />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-lg font-bold text-[#0F172A]">Tilldela ansvarig</h2>
            <p className="text-sm text-[#64748B]">Välj vilken medarbetare som är primär kontakt för klienten.</p>
            {staff.length === 0 && <Button variant="outline" onClick={loadStaff}>Ladda medarbetare</Button>}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Ansvarig medarbetare">
                <Select value={data.assigned_consultant_id} onValueChange={(v) => set("assigned_consultant_id", v)} onOpenChange={(o) => o && staff.length === 0 && void loadStaff()}>
                  <SelectTrigger><SelectValue placeholder="Välj…" /></SelectTrigger>
                  <SelectContent>{staff.map((s) => <SelectItem key={s.user_id} value={s.user_id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Faktureringsdag (månad)">
                <Input type="number" min={1} max={28} value={data.billing_day} onChange={(e) => set("billing_day", Number(e.target.value))} />
              </Field>
            </div>
          </>
        )}

        {step === 4 && (
          <div className="text-center py-8 space-y-4">
            <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <PartyPopper className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-[#0F172A]">Klart!</h2>
            <p className="text-sm text-[#64748B] max-w-md mx-auto">
              <span className="font-semibold text-[#0F172A]">{data.name}</span> har lagts till i din portfölj med status <span className="font-semibold">Onboarding</span>. Återstående uppställningssteg syns i klientens checklista.
            </p>
            <div className="flex gap-2 justify-center pt-4">
              <Button variant="outline" onClick={() => navigate("/wl/app/clients")}>Till klientlistan</Button>
              {createdFirmClientId && (
                <Button onClick={() => navigate(`/wl/app/clients/${createdCompanyId}`)}>Öppna klientvy</Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      {step < 4 && (
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0 || busy}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Tillbaka
          </Button>
          <Button onClick={goNext} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {step === 3 ? "Slutför" : "Nästa"} <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-[#475569]">{label}</Label>
      {children}
    </div>
  );
}

function BankCard({ active, onClick, title, desc }: { active: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-2xl border-2 p-4 transition ${
        active ? "border-[hsl(var(--brand-primary))] bg-[hsl(var(--brand-primary))]/5" : "border-[#E2E8F0] hover:border-[#CBD5E1]"
      }`}
    >
      <div className="text-sm font-bold text-[#0F172A]">{title}</div>
      <div className="text-xs text-[#64748B] mt-1">{desc}</div>
    </button>
  );
}
