import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getStoredActiveCompanyId, setStoredActiveCompanyId } from "@/lib/company-selection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { BankLinking } from "@/components/bank/BankLinking";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Sparkles, Loader2,
  CheckCircle2, Upload, FileText, Landmark, SkipForward, Info,
} from "lucide-react";

type Step = 1 | 2 | 3 | 4 | 5;

interface ActivationState {
  step?: Step;
  company_setup?: CompanyForm;
  bank_skipped?: boolean;
  bank_connected?: boolean;
  sie_imported?: boolean;
  sie_skipped?: boolean;
  sie_summary?: { entries: number; period: string } | null;
  widgets?: WidgetPref[];
  completed_at?: string;
}

interface CompanyForm {
  name: string;
  org_number: string;
  fiscal_year_start: string; // MM-DD e.g. "01-01"
  vat_period: "monthly" | "quarterly" | "yearly";
  industry: string;
}

interface WidgetPref {
  id: string;
  label: string;
  visible: boolean;
}

const DEFAULT_WIDGETS: WidgetPref[] = [
  { id: "result", label: "Resultat", visible: true },
  { id: "growth", label: "Tillväxt", visible: true },
  { id: "margin", label: "Marginal", visible: true },
  { id: "liquidity", label: "Likviditet", visible: true },
  { id: "runway", label: "Runway", visible: false }, // opt-in
  { id: "overdue_invoices", label: "Förfallna fakturor", visible: false },
  { id: "deadlines", label: "Kommande deadlines", visible: false },
  { id: "cashflow", label: "Kassaflöde – 3 mån", visible: false },
];

const INDUSTRIES = [
  "Konsult & tjänster", "E-handel", "Restaurang & café", "Detaljhandel",
  "Bygg & hantverk", "Transport & logistik", "IT & mjukvara", "Kreativa yrken",
  "Hälsovård", "Utbildning", "Fastighet", "Tillverkning", "Övrigt",
];

const FY_OPTIONS = [
  { value: "01-01", label: "1 januari (kalenderår)" },
  { value: "05-01", label: "1 maj" },
  { value: "07-01", label: "1 juli" },
  { value: "09-01", label: "1 september" },
];

const WelcomePage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<CompanyForm>({
    name: "", org_number: "", fiscal_year_start: "01-01",
    vat_period: "quarterly", industry: "",
  });
  const [bankConnected, setBankConnected] = useState(false);
  const [sieSummary, setSieSummary] = useState<ActivationState["sie_summary"]>(null);
  const [widgets, setWidgets] = useState<WidgetPref[]>(DEFAULT_WIDGETS);

  // ── Bootstrap: load company + activation state ──
  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    let cancelled = false;
    (async () => {
      try {
        const stored = getStoredActiveCompanyId();
        const { data: roles } = await (supabase
          .from("user_roles")
          .select("company_id, companies!inner(id, name, org_number, metadata)")
          .eq("user_id", user.id) as unknown as Promise<{ data: any[] | null }>);
        const companies = (roles ?? [])
          .map((r: any) => Array.isArray(r.companies) ? r.companies[0] : r.companies)
          .filter(Boolean);
        const active = companies.find((c: any) => c.id === stored) ?? companies[0];
        if (!active || cancelled) { setLoading(false); return; }
        if (!stored || stored !== active.id) setStoredActiveCompanyId(active.id);
        setCompanyId(active.id);

        const meta = (active.metadata ?? {}) as Record<string, any>;
        const a: ActivationState = meta.activation ?? {};
        if (a.completed_at) {
          const { resolveDefaultLanding } = await import("@/lib/auth/resolveDefaultLanding");
          const dest = await resolveDefaultLanding(active.id);
          navigate(dest, { replace: true });
          return;
        }
        setStep((a.step ?? 1) as Step);
        setForm({
          name: a.company_setup?.name ?? active.name ?? "",
          org_number: a.company_setup?.org_number ?? active.org_number ?? "",
          fiscal_year_start: a.company_setup?.fiscal_year_start ?? "01-01",
          vat_period: a.company_setup?.vat_period ?? "quarterly",
          industry: a.company_setup?.industry ?? "",
        });
        setBankConnected(!!a.bank_connected);
        setSieSummary(a.sie_summary ?? null);
        if (a.widgets && a.widgets.length) {
          // Merge with defaults so newly added widgets appear
          const byId = new Map(a.widgets.map((w) => [w.id, w]));
          setWidgets(DEFAULT_WIDGETS.map((d) => ({ ...d, visible: byId.get(d.id)?.visible ?? d.visible })));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, user, navigate]);

  const persist = useCallback(async (patch: Partial<ActivationState>, nextStep?: Step) => {
    if (!companyId) return;
    setSaving(true);
    try {
      const { data: row } = await supabase.from("companies").select("metadata").eq("id", companyId).single();
      const meta = ((row?.metadata as Record<string, any>) ?? {});
      const prev: ActivationState = meta.activation ?? {};
      const activation: ActivationState = { ...prev, ...patch, step: nextStep ?? patch.step ?? prev.step ?? step };
      await supabase.from("companies").update({ metadata: { ...meta, activation } as never }).eq("id", companyId);
    } catch (e) {
      console.error("persist activation failed", e);
    } finally {
      setSaving(false);
    }
  }, [companyId, step]);

  const goNext = async () => {
    const next = Math.min(5, step + 1) as Step;
    await persist({ step: next });
    setStep(next);
  };
  const goBack = () => setStep((s) => Math.max(1, s - 1) as Step);
  const skip = async () => {
    if (step === 3) await persist({ bank_skipped: true });
    if (step === 4) await persist({ sie_skipped: true });
    await goNext();
  };

  const finish = async () => {
    await persist({ widgets, completed_at: new Date().toISOString(), step: 5 });
    try { window.localStorage.setItem("dashboard_activation_widgets", JSON.stringify(widgets)); } catch { /* ignore */ }
    toast.success("Allt klart. Här är din Bokfy.");
    const { resolveDefaultLanding } = await import("@/lib/auth/resolveDefaultLanding");
    const dest = await resolveDefaultLanding(companyId);
    navigate(dest, { replace: true });
  };

  // ── Step 2: company setup save ──
  const saveCompanyAndNext = async () => {
    if (!companyId) return;
    if (!form.name.trim() || !form.org_number.trim() || !form.industry) {
      toast.error("Fyll i företagsnamn, org.nr och bransch.");
      return;
    }
    setSaving(true);
    try {
      await supabase.from("companies").update({
        name: form.name.trim(),
        org_number: form.org_number.trim(),
      }).eq("id", companyId);
      await persist({ company_setup: form, step: 3 });
      setStep(3);
    } finally {
      setSaving(false);
    }
  };

  // ── Step 3: bank ──
  const onBankSuccess = async () => {
    setBankConnected(true);
    await persist({ bank_connected: true, bank_skipped: false });
    toast.success("Bank ansluten. Jag hämtar nu dina transaktioner — det tar några sekunder.");
  };

  // ── Step 4: SIE upload ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const handleSieFile = async (file: File) => {
    setParsing(true);
    try {
      // SIE files are ISO-8859-1 (cp437/iso). Best-effort decode.
      const buf = await file.arrayBuffer();
      let text = "";
      try { text = new TextDecoder("iso-8859-1").decode(buf); }
      catch { text = new TextDecoder().decode(buf); }
      const verCount = (text.match(/^#VER\b/gm) || []).length;
      const datesMatch = Array.from(text.matchAll(/^#VER\s+\S+\s+\S+\s+(\d{8})/gm));
      const dates = datesMatch.map((m) => m[1]).sort();
      const fmt = (d?: string) => d ? `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}` : "";
      const period = dates.length ? `${fmt(dates[0])} – ${fmt(dates[dates.length - 1])}` : "okänd period";
      const summary = { entries: verCount, period };
      setSieSummary(summary);
      await persist({ sie_summary: summary });
      toast.success(`Jag hittade ${verCount} verifikationer från ${period}.`);
    } catch (e) {
      console.error(e);
      toast.error("Kunde inte läsa SIE-filen. Kontrollera att det är en SIE4-fil.");
    } finally {
      setParsing(false);
    }
  };

  const importSie = async () => {
    await persist({ sie_imported: true, sie_skipped: false });
    toast.success("Verifikationer köade för import.");
    await goNext();
  };

  const [dragOver, setDragOver] = useState(false);

  // ── Step 5: widgets ──
  const moveWidget = (id: string, dir: -1 | 1) => {
    setWidgets((ws) => {
      const i = ws.findIndex((w) => w.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ws.length) return ws;
      const next = ws.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const toggleWidget = (id: string) => setWidgets((ws) => ws.map((w) => w.id === id ? { ...w, visible: !w.visible } : w));

  // ── Render ──
  if (loading || authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center gap-2 mb-8">
          <div className="h-8 w-8 rounded-lg bg-[#3b82f6] flex items-center justify-center text-white font-bold text-xs">C</div>
          <span className="text-sm font-semibold text-slate-900">Bokfy</span>
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 ml-2" />}
        </div>

        <OnboardingProgress current={step} total={5} />

        {/* STEP 1 */}
        {step === 1 && (
          <Card className="p-10 border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-[#3b82f6]">
              <Sparkles className="h-5 w-5" />
              <span className="text-xs uppercase tracking-wider font-medium">Aktivering</span>
            </div>
            <h1 className="text-3xl font-medium text-slate-900 mb-3">Välkommen till Bokfy — din AI-ekonom.</h1>
            <p className="text-slate-600 leading-relaxed mb-8">
              Ju mer du använder Bokfy, desto smartare blir den. Vi lär oss ditt företag automatiskt.
            </p>
            <Button onClick={goNext} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-6">
              Kom igång <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Card>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <Card className="p-8 border-slate-100 shadow-sm">
            <h2 className="text-xl font-medium text-slate-900 mb-1">Ditt företag</h2>
            <p className="text-sm text-slate-500 mb-6">
              <Info className="h-3.5 w-3.5 inline mr-1 text-slate-400" />
              Vi använder detta för att föreslå rätt kontoplan och momsregler automatiskt.
            </p>
            <div className="space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-slate-500">Företagsnamn</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-slate-500">Org.nr</Label>
                <Input
                  value={form.org_number}
                  onChange={(e) => setForm({ ...form, org_number: e.target.value })}
                  onBlur={async (e) => {
                    const v = e.target.value.trim();
                    if (!/^\d{6}-?\d{4}$/.test(v)) return;
                    const { lookupCompanyByOrgNr } = await import("@/lib/company-lookup");
                    const r = await lookupCompanyByOrgNr(v);
                    if (r.found && r.name) {
                      setForm((f) => ({ ...f, name: f.name || r.name! }));
                      toast.success("Företagsuppgifter hämtade från Bolagsverket");
                    } else if (!r.found) {
                      toast.message("Hittade inget företag med detta org.nr — fyll i uppgifterna manuellt.");
                    }
                  }}
                  placeholder="556677-8899"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-slate-500">Räkenskapsår start</Label>
                <Select value={form.fiscal_year_start} onValueChange={(v) => setForm({ ...form, fiscal_year_start: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{FY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-slate-500">Momsperiod</Label>
                <Select value={form.vat_period} onValueChange={(v) => setForm({ ...form, vat_period: v as CompanyForm["vat_period"] })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Månadsvis</SelectItem>
                    <SelectItem value="quarterly">Kvartalsvis</SelectItem>
                    <SelectItem value="yearly">Årlig</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-slate-500">Bransch</Label>
                <Select value={form.industry} onValueChange={(v) => setForm({ ...form, industry: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Välj bransch" /></SelectTrigger>
                  <SelectContent>{INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <Card className="p-8 border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-1"><Landmark className="h-4 w-4 text-[#3b82f6]" />
              <h2 className="text-xl font-medium text-slate-900">Anslut din bank</h2>
            </div>
            <p className="text-sm text-slate-500 mb-6">Högsta prioritet — utan bankdata kan AI inte matcha transaktioner automatiskt.</p>
            {bankConnected ? (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-emerald-900">Bank ansluten</div>
                  <div className="text-sm text-emerald-700 mt-0.5">Jag hämtar nu dina transaktioner — det tar några sekunder.</div>
                </div>
              </div>
            ) : companyId ? (
              <BankLinking companyId={companyId} onSuccess={onBankSuccess} flow="onboarding" />
            ) : null}
            <p className="text-xs text-slate-400 mt-6">
              Du kan ansluta din bank senare under Inställningar. Utan bankdata kan AI inte matcha transaktioner automatiskt.
            </p>
          </Card>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <Card className="p-8 border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-1"><FileText className="h-4 w-4 text-[#3b82f6]" />
              <h2 className="text-xl font-medium text-slate-900">Importera historisk data</h2>
            </div>
            <p className="text-sm text-slate-500 mb-6">Med historisk data kan jag direkt börja lära mig ditt bokföringsmönster.</p>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault(); setDragOver(false);
                const f = e.dataTransfer.files?.[0]; if (f) handleSieFile(f);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition ${dragOver ? "border-[#3b82f6] bg-blue-50/50" : "border-slate-200 hover:border-slate-300"}`}
            >
              {parsing ? (
                <div className="flex flex-col items-center gap-2 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Läser SIE-fil…</span></div>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                  <div className="text-sm text-slate-700 font-medium">Släpp SIE4-fil här eller klicka för att välja</div>
                  <div className="text-xs text-slate-400 mt-1">.se / .si format</div>
                </>
              )}
              <input
                ref={fileInputRef} type="file" accept=".se,.si,.sie" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSieFile(f); }}
              />
            </div>

            {sieSummary && (
              <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
                <div className="text-sm text-slate-900">
                  Jag hittade <span className="font-semibold">{sieSummary.entries}</span> verifikationer från <span className="font-semibold">{sieSummary.period}</span>. Vill du importera dessa?
                </div>
                <Button onClick={importSie} className="mt-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white">
                  Importera <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <button onClick={skip} className="rounded-lg border border-slate-200 p-4 text-left hover:border-slate-300 transition">
                <div className="font-medium text-slate-900">Anslut tidigare system</div>
                <div className="text-xs text-slate-500 mt-1">Fortnox, Visma m.fl. – konfigureras senare i Integrationer.</div>
              </button>
              <button onClick={skip} className="rounded-lg border border-slate-200 p-4 text-left hover:border-slate-300 transition">
                <div className="font-medium text-slate-900">Börja från noll</div>
                <div className="text-xs text-slate-500 mt-1">Ingen historik – AI lär sig från första verifikationen.</div>
              </button>
            </div>
          </Card>
        )}

        {/* STEP 5 */}
        {step === 5 && (
          <Card className="p-8 border-slate-100 shadow-sm">
            <h2 className="text-xl font-medium text-slate-900 mb-1">Anpassa din dashboard</h2>
            <p className="text-sm text-slate-500 mb-6">Slå på/av och ändra ordning. De fyra första är förvalda.</p>
            <div className="space-y-2">
              {widgets.map((w, idx) => (
                <div key={w.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3 bg-white">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <button onClick={() => moveWidget(w.id, -1)} disabled={idx === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
                      <button onClick={() => moveWidget(w.id, 1)} disabled={idx === widgets.length - 1} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900">{w.label}</div>
                      {w.id === "runway" && <div className="text-xs text-slate-400">Opt-in – aktivera om du vill se kassaflödesräckvidd</div>}
                    </div>
                  </div>
                  <Switch checked={w.visible} onCheckedChange={() => toggleWidget(w.id)} />
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-lg bg-[#3b82f6]/5 border border-[#3b82f6]/20 p-4">
              <div className="text-sm text-slate-900 font-medium">Allt klart. Här är din Bokfy.</div>
              <div className="text-xs text-slate-500 mt-1">Du kan ändra dashboardlayouten när som helst.</div>
            </div>
          </Card>
        )}

        {/* Footer nav */}
        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" onClick={goBack} disabled={step === 1 || saving} className="text-slate-500">
            <ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka
          </Button>
          <div className="flex items-center gap-2">
            {(step === 3 || step === 4) && (
              <Button variant="ghost" onClick={skip} disabled={saving} className="text-slate-500">
                <SkipForward className="h-4 w-4 mr-1" /> Hoppa över
              </Button>
            )}
            {step === 1 && null /* CTA inside card */}
            {step === 2 && (
              <Button onClick={saveCompanyAndNext} disabled={saving} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">
                Fortsätt <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 3 && (
              <Button onClick={goNext} disabled={saving} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">
                {bankConnected ? "Fortsätt" : "Fortsätt utan bank"} <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 4 && !sieSummary && (
              <Button onClick={goNext} disabled={saving} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">
                Fortsätt <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 5 && (
              <Button onClick={finish} disabled={saving} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">
                Öppna dashboarden <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
