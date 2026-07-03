import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, AlertTriangle, Sparkles, Lock, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { formatSEK } from "@/lib/formatNumber";
import { useAutoClose, type AutoCloseResult } from "@/hooks/useAutoClose";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  fiscalYear: number;
}

const STEPS = [
  "Aggregerar data",
  "AI-analys av räkenskapsåret",
  "Tillämpar säkra justeringar",
  "Validerar balansräkning",
  "Genererar slutpreview",
  "Låser period & förbereder årsredovisning",
];

export function AutoCloseDialog({ open, onOpenChange, companyId, fiscalYear }: Props) {
  const { preview, execute } = useAutoClose();
  const [phase, setPhase] = useState<"idle" | "running" | "preview" | "executing" | "done" | "blocked">("idle");
  const [result, setResult] = useState<AutoCloseResult | null>(null);
  const [animatedStep, setAnimatedStep] = useState(0);

  useEffect(() => {
    if (!open) { setPhase("idle"); setResult(null); setAnimatedStep(0); }
  }, [open]);

  useEffect(() => {
    if (phase !== "running" && phase !== "executing") return;
    const interval = setInterval(() => setAnimatedStep((s) => Math.min(s + 1, STEPS.length - 1)), 800);
    return () => clearInterval(interval);
  }, [phase]);

  const handleStart = async () => {
    setPhase("running"); setAnimatedStep(0);
    try {
      const res = await preview.mutateAsync({ companyId, fiscalYear });
      setResult(res);
      setPhase(res.status === "blocked" ? "blocked" : "preview");
    } catch { setPhase("idle"); }
  };

  const handleExecute = async () => {
    setPhase("executing"); setAnimatedStep(5);
    try {
      const res = await execute.mutateAsync({ companyId, fiscalYear });
      setResult(res);
      setPhase(res.status === "completed" ? "done" : "blocked");
    } catch { setPhase("preview"); }
  };

  const primaryBtn = "h-[34px] px-[14px] rounded-[8px] bg-[#0B4F6C] text-white text-[12px] font-medium hover:bg-[#093d54] inline-flex items-center justify-center gap-[6px] disabled:opacity-50";
  const ghostBtn = "h-[34px] px-[14px] rounded-[8px] text-[12px] text-[#475569] hover:bg-[#F8FAFB] inline-flex items-center justify-center";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-[8px] text-[14px] font-medium text-[#0F172A]">
            <Sparkles className="h-[14px] w-[14px] text-[#0B4F6C]" />
            AI Bokslutsstängning — {fiscalYear}
          </DialogTitle>
        </DialogHeader>

        {phase === "idle" && (
          <div className="mt-[16px] space-y-[14px]">
            <p className="text-[12px] text-[#475569]">
              AI kommer att aggregera data, identifiera och tillämpa säkra justeringar (konfidens ≥ 85%),
              validera balansräkningen och förbereda årsredovisningen.
            </p>
            <div className="rounded-[10px] bg-[#F8FAFB] border-[0.5px] border-[#E2E8F0] p-[14px] space-y-[8px]">
              {STEPS.map((step, i) => (
                <div key={step} className="flex items-center gap-[8px] text-[12px] text-[#475569]">
                  <span className="w-[20px] h-[20px] rounded-full bg-white border-[0.5px] border-[#E2E8F0] flex items-center justify-center text-[10px] font-medium text-[#0F172A]">{i + 1}</span>
                  {step}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-[8px] pt-[2px]">
              <button onClick={() => onOpenChange(false)} className={ghostBtn}>Avbryt</button>
              <button onClick={handleStart} className={primaryBtn}>
                <Sparkles className="h-[12px] w-[12px]" /> Starta AI-analys
              </button>
            </div>
          </div>
        )}

        {(phase === "running" || phase === "executing") && (
          <div className="mt-[16px] space-y-[8px]">
            {STEPS.map((step, i) => {
              const isActive = i === animatedStep;
              const isDone = i < animatedStep;
              const cls = isDone
                ? "bg-[#E1F5EE] border-[#B5E2CE] text-[#1D6E55]"
                : isActive
                  ? "bg-[#E6F4FA] border-[#C8DDF5] text-[#0F172A]"
                  : "bg-white border-[#E2E8F0] text-[#94A3B8]";
              return (
                <div key={step} className={`flex items-center gap-[10px] p-[10px] rounded-[10px] border-[0.5px] transition-colors ${cls}`}>
                  <div className="w-[24px] h-[24px] rounded-full flex items-center justify-center shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="h-[16px] w-[16px] text-[#1D9E75]" />
                    ) : isActive ? (
                      <Loader2 className="h-[16px] w-[16px] text-[#0B4F6C] animate-spin" />
                    ) : (
                      <span className="text-[10px]">{i + 1}</span>
                    )}
                  </div>
                  <span className="text-[12px] font-medium">{step}</span>
                </div>
              );
            })}
          </div>
        )}

        {phase === "preview" && result && (
          <div className="mt-[16px] space-y-[14px]">
            <div className="inline-flex items-center gap-[6px] px-[10px] h-[22px] rounded-full bg-[#E1F5EE] text-[#1D6E55] text-[11px] font-medium">
              <CheckCircle2 className="h-[12px] w-[12px]" /> Redo att skicka in
            </div>

            <div className="rounded-[10px] bg-[#F8FAFB] border-[0.5px] border-[#E2E8F0] p-[14px] space-y-[10px]">
              <div className="text-[10px] uppercase tracking-[0.07em] text-[#94A3B8]">Slutpreview</div>
              <div className="grid grid-cols-2 gap-[10px]">
                {[
                  { label: "Årets resultat", value: result.live_preview.net_result },
                  { label: "Beräknad skatt", value: result.live_preview.tax_estimate },
                  { label: "Likvida medel", value: result.live_preview.cash },
                  { label: "Eget kapital", value: result.live_preview.equity },
                ].map((kpi) => (
                  <div key={kpi.label} className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[10px] p-[12px]">
                    <div className="text-[10px] uppercase tracking-[0.07em] text-[#94A3B8]">{kpi.label}</div>
                    <div className="text-[16px] font-medium tabular-nums text-[#0F172A] mt-[4px]">
                      {formatSEK(kpi.value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {result.adjustments_applied?.length > 0 && (
              <div className="text-[11px] text-[#475569]">
                ✓ {result.adjustments_applied.length} AI-justeringar tillämpade automatiskt
              </div>
            )}

            <div className="flex justify-end gap-[8px] pt-[2px]">
              <button onClick={() => onOpenChange(false)} className={ghostBtn}>Granska först</button>
              <button onClick={handleExecute} className={primaryBtn}>
                <Lock className="h-[12px] w-[12px]" /> Stäng året
              </button>
            </div>
          </div>
        )}

        {phase === "blocked" && result && (
          <div className="mt-[16px] space-y-[14px]">
            <div className="inline-flex items-center gap-[6px] px-[10px] h-[22px] rounded-full bg-[#FCE8E8] text-[#9C2E2D] text-[11px] font-medium">
              <AlertTriangle className="h-[12px] w-[12px]" /> Stängning blockerad
            </div>
            <div className="space-y-[8px]">
              {(result.blockers ?? []).map((b) => (
                <div key={b.key} className="rounded-[10px] bg-[#FCE8E8] border-[0.5px] border-[#F4C9C9] p-[12px]">
                  <div className="text-[12px] font-medium text-[#0F172A]">{b.title}</div>
                  <div className="text-[11px] text-[#9C2E2D] mt-[2px]">→ {b.fix_cta}</div>
                </div>
              ))}
            </div>
            <button onClick={() => onOpenChange(false)} className="w-full h-[34px] rounded-[8px] border-[0.5px] border-[#E2E8F0] bg-white text-[12px] text-[#475569] hover:bg-[#F8FAFB]">
              Stäng och åtgärda
            </button>
          </div>
        )}

        {phase === "done" && (
          <div className="mt-[16px] text-center py-[20px]">
            <div className="w-[56px] h-[56px] mx-auto rounded-full bg-[#E1F5EE] border-[0.5px] border-[#B5E2CE] flex items-center justify-center mb-[14px]">
              <CheckCircle2 className="h-[28px] w-[28px] text-[#1D9E75]" />
            </div>
            <h3 className="text-[16px] font-medium text-[#0F172A] mb-[2px]">Året är stängt</h3>
            <p className="text-[12px] text-[#475569]">Räkenskapsåret {fiscalYear} är låst och årsredovisningen är förberedd.</p>
            <button onClick={() => onOpenChange(false)} className={`mt-[20px] ${primaryBtn}`}>
              Klart
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
