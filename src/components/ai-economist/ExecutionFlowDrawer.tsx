import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Undo2, ExternalLink, X, ArrowRight } from "lucide-react";
import { ConsequencePanel, type Consequence } from "./ConsequencePanel";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { TrustPanel } from "./TrustPanel";
import { LEVEL_META, executionLevel } from "@/lib/ai-ekonom/executionLevel";
import { routeFor } from "@/lib/ai-ekonom/routeFor";
import { Link } from "react-router-dom";
import type { CFOPriority } from "@/hooks/useCFOPriorities";

type Stage = "preview" | "progress" | "result";

interface Props {
  open: boolean;
  onClose: () => void;
  insight: CFOPriority | null;
  companyId: string | null;
  selectedItems: string[];
  onPreview: (insight: CFOPriority, items: string[]) => Promise<{ consequence: Consequence; preview_items: string[]; action_id?: string } | null>;
  onConfirm: (insight: CFOPriority, items: string[]) => Promise<{ action_id: string; result: any } | null>;
  onRevert: (action_id: string) => Promise<void>;
  factors?: string[];
}

export function ExecutionFlowDrawer({ open, onClose, insight, companyId, selectedItems, onPreview, onConfirm, onRevert, factors }: Props) {
  const [stage, setStage] = useState<Stage>("preview");
  const [loading, setLoading] = useState(false);
  const [consequence, setConsequence] = useState<Consequence | null>(null);
  const [previewItems, setPreviewItems] = useState<string[]>([]);
  const [actionId, setActionId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    if (!open || !insight) return;
    setStage("preview");
    setConsequence(null);
    setActionId(null);
    setResult(null);
    setProgress({ current: 0, total: 0 });
    setLoading(true);
    onPreview(insight, selectedItems)
      .then(p => {
        if (p) {
          setConsequence(p.consequence);
          setPreviewItems(p.preview_items);
        }
      })
      .finally(() => setLoading(false));
  }, [open, insight?.id]);

  if (!insight) return null;

  const level = executionLevel(insight.action_type, insight.confidence, insight.impact_sek);
  const meta = LEVEL_META[level];
  const route = routeFor(insight);

  const handleConfirm = async () => {
    setStage("progress");
    setProgress({ current: 0, total: previewItems.length || 1 });
    // animate progress while edge function runs
    const tick = setInterval(() => setProgress(p => ({ ...p, current: Math.min(p.current + 1, p.total) })), 500);
    const out = await onConfirm(insight, selectedItems);
    clearInterval(tick);
    if (out) {
      setActionId(out.action_id);
      setResult(out.result);
      setProgress({ current: previewItems.length || 1, total: previewItems.length || 1 });
      setStage("result");
    } else {
      setStage("preview");
    }
  };

  const handleRevert = async () => {
    if (!actionId) return;
    await onRevert(actionId);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] uppercase font-semibold tracking-wide px-2 py-0.5 rounded border ${meta.tone}`}>
              {meta.label}
            </span>
            <ConfidenceMeter confidence={insight.confidence} factors={factors} size="sm" />
          </div>
          <SheetTitle className="text-left">{insight.title}</SheetTitle>
          <p className="text-sm text-muted-foreground text-left">{insight.explanation}</p>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* PREVIEW */}
          {stage === "preview" && (
            <>
              {loading && (
                <div className="py-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Beräknar förhandsvisning…
                </div>
              )}
              {!loading && (
                <>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-white/80 mb-2">
                      Detta kommer hända ({previewItems.length})
                    </h4>
                    <div className="rounded-xl border border-slate-200/60 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] divide-y divide-slate-200/60 dark:divide-white/5 max-h-48 overflow-y-auto">
                      {previewItems.length === 0 ? (
                        <div className="p-3 text-xs text-muted-foreground">Generell åtgärd — inga specifika poster valda</div>
                      ) : (
                        previewItems.map((p, i) => (
                          <div key={i} className="p-2.5 text-xs flex items-center gap-2">
                            <ArrowRight className="h-3 w-3 text-[#3b82f6] dark:text-[#1E3A5F]" />
                            <span className="text-slate-700 dark:text-white/80">{p}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {consequence && <ConsequencePanel consequence={consequence} />}
                  <TrustPanel companyId={companyId} actionType={insight.action_type} />

                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleConfirm} className="flex-1 bg-[#0F1F3D] text-white hover:shadow-lg">
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      Godkänn & utför
                    </Button>
                    <Button variant="outline" onClick={onClose}>Avbryt</Button>
                  </div>
                </>
              )}
            </>
          )}

          {/* PROGRESS */}
          {stage === "progress" && (
            <div className="py-8 space-y-4">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#3b82f6] mb-3" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Utför {progress.current}/{progress.total}…</h3>
                <p className="text-xs text-muted-foreground mt-1">{insight.title}</p>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0F1F3D] transition-all duration-500"
                  style={{ width: `${(progress.current / Math.max(1, progress.total)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* RESULT */}
          {stage === "result" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#BFE6D6] dark:border-[#BFE6D6] bg-[#E1F5EE] dark:bg-emerald-500/[0.06] p-5 text-center">
                <CheckCircle2 className="h-10 w-10 text-[#085041] mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Klart!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {previewItems.length > 0 ? `${previewItems.length} åtgärder utförda` : "Åtgärd utförd"}
                  {insight.impact_sek !== 0 && ` · ${insight.impact_sek < 0 ? "−" : "+"}${new Intl.NumberFormat("sv-SE").format(Math.abs(insight.impact_sek))} kr påverkan`}
                </p>
                {result?.note && <p className="text-xs text-muted-foreground mt-2">{result.note}</p>}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleRevert} className="flex-1">
                  <Undo2 className="h-4 w-4 mr-1.5" />
                  Ångra
                </Button>
                <Link to={route.href} className="flex-1">
                  <Button variant="outline" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-1.5" />
                    {route.label}
                  </Button>
                </Link>
              </div>
              <Button variant="ghost" onClick={onClose} className="w-full">Stäng</Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
