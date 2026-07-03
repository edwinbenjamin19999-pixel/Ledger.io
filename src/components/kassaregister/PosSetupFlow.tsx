import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePosConnection, usePosVatCategories } from "@/hooks/useKassaregister";
import { ACTIVE_COMPANY_STORAGE_KEY } from "@/lib/company-selection";
import { CreditCard, FileText, Wifi, Monitor, Server, ShoppingBag, Sparkles, Zap, Landmark, ShieldCheck, Brain, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PosVatMappingStep } from "./setup/PosVatMappingStep";
import { PosBankReconciliationStep } from "./setup/PosBankReconciliationStep";
import { PosConfidenceSettingsStep } from "./setup/PosConfidenceSettingsStep";
import { PosOnboardingAssistant } from "./setup/PosOnboardingAssistant";

const PROVIDERS = [
  { id: "zettle", name: "Zettle by PayPal", icon: CreditCard, desc: "OAuth-anslutning via PayPal", api: "API" as const, confidence: "98% noggrannhet via API", badge: "Rekommenderad" },
  { id: "sitoo", name: "Sitoo", icon: ShoppingBag, desc: "Omnikanalplattform för detaljhandel", api: "API" as const, confidence: "97% noggrannhet via API", badge: "Mest använd i Sverige" },
  { id: "caspeco", name: "Caspeco", icon: Wifi, desc: "Restaurang & hotell POS", api: "API" as const, confidence: "96% noggrannhet via API" },
  { id: "quorion", name: "QUORiON", icon: Monitor, desc: "Professionella kassaregister", api: "CSV" as const, confidence: "Manuell verifiering rekommenderas" },
  { id: "sam4s", name: "Sam4s", icon: Server, desc: "Industriella kassasystem", api: "CSV" as const, confidence: "Manuell verifiering rekommenderas" },
  { id: "sharp", name: "Sharp / Olivetti", icon: Monitor, desc: "Via kontrollenhet eller export", api: "CSV" as const, confidence: "Manuell verifiering rekommenderas" },
  { id: "manual", name: "Annat / Manuellt", icon: FileText, desc: "Manuell inmatning", api: "Manuellt" as const, confidence: "Du anger värden själv" },
];

const DEFAULT_VAT_CATEGORIES = [
  { pos_category: "Varor 25%", vat_rate: 25, account_number: "3010", account_name: "Försäljning varor 25%" },
  { pos_category: "Mat (12%)", vat_rate: 12, account_number: "3011", account_name: "Försäljning varor 12%" },
  { pos_category: "Böcker/kultur (6%)", vat_rate: 6, account_number: "3012", account_name: "Försäljning varor 6%" },
  { pos_category: "Momsfritt", vat_rate: 0, account_number: "3013", account_name: "Försäljning varor momsfri" },
];

type Step = "provider" | "mapping" | "bank" | "confidence";

const STEP_LABELS: { id: Step; label: string }[] = [
  { id: "provider", label: "Anslut kassasystem" },
  { id: "mapping", label: "AI mappar moms" },
  { id: "bank", label: "Bankavstämning" },
  { id: "confidence", label: "Aktivering" },
];

export function PosSetupFlow() {
  const { createConnection } = usePosConnection();
  const { addCategory } = usePosVatCategories();
  const companyId = localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);

  const [step, setStep] = useState<Step>("provider");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [reconcileEnabled, setReconcileEnabled] = useState(true);
  const [threshold, setThreshold] = useState(90);
  const [alwaysApprove, setAlwaysApprove] = useState(false);
  const [autoBookHigh, setAutoBookHigh] = useState(true);
  const [autoDetectDismissed, setAutoDetectDismissed] = useState(false);

  const provider = PROVIDERS.find((p) => p.id === selectedProvider);
  const stepIdx = STEP_LABELS.findIndex((s) => s.id === step);

  const handleFinish = async () => {
    if (!companyId) return;
    createConnection.mutate(
      {
        provider: selectedProvider,
        provider_name: provider?.name || selectedProvider,
        config: {
          auto_book_threshold: threshold,
          always_require_approval: alwaysApprove,
          auto_book_high_confidence: autoBookHigh,
          bank_reconciliation_enabled: reconcileEnabled,
        },
      },
      {
        onSuccess: () => {
          DEFAULT_VAT_CATEGORIES.forEach((cat) =>
            addCategory.mutate({
              company_id: companyId,
              pos_category: cat.pos_category,
              vat_rate: cat.vat_rate,
              account_number: cat.account_number,
              account_name: cat.account_name,
              description: null,
            })
          );
        },
      }
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      {/* HERO */}
      <div className="rounded-2xl border border-[#C8DDF5] bg-gradient-to-br from-[#3b82f6]/10 via-card to-blue-500/10 dark:from-[#3b82f6]/15 dark:via-card dark:to-blue-500/15 p-6 md:p-8 shadow-sm animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1 space-y-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-[#EFF6FF] text-[#3b82f6] dark:text-[#3b82f6] border border-[#C8DDF5]">
              <Sparkles className="h-3 w-3" /> AI-driven automation
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              Automatisera din kassabokföring på sekunder
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
              Dina POS-data omvandlas automatiskt till korrekta bokföringsposter — inklusive moms, dagliga bokföringar och bankavstämning.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { icon: FileText, label: "Z-rapporter" },
                { icon: Sparkles, label: "Moms" },
                { icon: Zap, label: "Daglig bokföring" },
                { icon: Landmark, label: "Bankavstämning" },
                { icon: ShieldCheck, label: "Felupptäckt" },
              ].map((c) => (
                <span key={c.label} className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-card border border-[#C8DDF5] text-[#3b82f6] dark:text-[#3b82f6]">
                  <c.icon className="h-3 w-3" /> {c.label}
                </span>
              ))}
            </div>
          </div>
          <div className="md:w-72 shrink-0 rounded-2xl bg-card border border-[#C8DDF5] p-5 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">AI automation</p>
            <p className="text-4xl font-bold text-[#3b82f6] dark:text-[#1E3A5F] tabular-nums mt-1">95%</p>
            <p className="text-xs text-muted-foreground mt-1">av din kassabokföring sköts automatiskt</p>
            <Button
              onClick={() => { document.getElementById("setup-flow")?.scrollIntoView({ behavior: "smooth" }); }}
              className="w-full mt-4 bg-[#3b82f6] hover:bg-[#3b82f6] text-white"
            >
              Kom igång på 30 sekunder
            </Button>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div id="setup-flow" className="flex items-center gap-2 text-xs overflow-x-auto pb-2">
        {STEP_LABELS.map((s, i) => {
          const isActive = step === s.id;
          const isPast = i < stepIdx;
          return (
            <div key={s.id} className="flex items-center gap-2 shrink-0">
              {i > 0 && <div className={cn("h-px w-6 md:w-10", isPast || isActive ? "bg-[#3b82f6]" : "bg-border")} />}
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors border",
                isActive ? "bg-[#3b82f6] text-white border-blue-600" : isPast ? "bg-[#EFF6FF] text-[#3b82f6] dark:text-[#3b82f6] border-[#C8DDF5]" : "bg-card text-muted-foreground border-border"
              )}>
                <span className="font-semibold tabular-nums">{i + 1}</span>
                <span className="font-medium">{s.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-5">
          {step === "provider" && (
            <>
              {/* Auto-detection banner */}
              {!autoDetectDismissed && (
                <Card className="border-l-[3px] border-l-[#3b82f6] bg-[#EFF6FF] animate-fade-in">
                  <CardContent className="pt-5 pb-5 flex items-center gap-3 flex-wrap">
                    <Brain className="h-5 w-5 text-[#3b82f6] dark:text-[#1E3A5F] shrink-0" />
                    <p className="text-sm text-foreground flex-1 min-w-[200px]">
                      Vi tror att du använder <strong>Zettle</strong> baserat på dina tidigare data.
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => { setSelectedProvider("zettle"); setStep("mapping"); }} className="bg-[#3b82f6] hover:bg-[#3b82f6] text-white">Bekräfta</Button>
                      <Button size="sm" variant="outline" onClick={() => setAutoDetectDismissed(true)}>Välj annat</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Välj kassasystem</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Premium-cards med AI-konfidens per integration</p>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {PROVIDERS.map((p) => {
                    const typeColor = p.api === "API"
                      ? "bg-[#E1F5EE] text-[#085041] dark:text-emerald-300 border-[#BFE6D6]"
                      : p.api === "CSV"
                        ? "bg-[#FAEEDA] text-[#7A5417] dark:text-amber-300 border-[#F0DDB7]"
                        : "bg-muted text-muted-foreground border-border";
                    return (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedProvider(p.id); setStep("mapping"); }}
                        className={cn(
                          "group p-4 rounded-2xl border text-left transition-all relative bg-card",
                          "hover:border-[#C8DDF5] hover:shadow-md hover:-translate-y-px",
                          selectedProvider === p.id ? "border-[#3b82f6] bg-[#EFF6FF] border-l-[3px] border-l-[#3b82f6]" : "border-border"
                        )}
                      >
                        {p.badge && (
                          <span className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#3b82f6] text-white">
                            {p.badge}
                          </span>
                        )}
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-lg bg-muted/60 border border-border flex items-center justify-center group-hover:bg-[#EFF6FF] group-hover:border-[#C8DDF5] transition-colors">
                            <p.icon className="h-5 w-5 text-foreground/80" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground">{p.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-semibold", typeColor)}>
                                {p.api}
                              </span>
                              <span className="text-[10px] text-muted-foreground">{p.confidence}</span>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-[#3b82f6] dark:group-hover:text-[#1E3A5F] transition-colors mt-1" />
                        </div>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            </>
          )}

          {step === "mapping" && (
            <PosVatMappingStep onBack={() => setStep("provider")} onNext={() => setStep("bank")} />
          )}

          {step === "bank" && (
            <PosBankReconciliationStep
              onBack={() => setStep("mapping")}
              onNext={() => setStep("confidence")}
              enabled={reconcileEnabled}
              setEnabled={setReconcileEnabled}
            />
          )}

          {step === "confidence" && (
            <PosConfidenceSettingsStep
              onBack={() => setStep("bank")}
              onFinish={handleFinish}
              isPending={createConnection.isPending}
              threshold={threshold}
              setThreshold={setThreshold}
              alwaysApprove={alwaysApprove}
              setAlwaysApprove={setAlwaysApprove}
              autoBookHigh={autoBookHigh}
              setAutoBookHigh={setAutoBookHigh}
            />
          )}
        </div>

        <PosOnboardingAssistant step={step} />
      </div>
    </div>
  );
}
