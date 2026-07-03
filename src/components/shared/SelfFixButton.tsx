import { useState } from "react";
import { Wand2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface SelfFixButtonProps {
  module: string;
  companyId?: string | null;
  errorMessage?: string;
  context?: Record<string, unknown>;
  size?: "sm" | "default";
  variant?: "outline" | "default" | "ghost";
  label?: string;
}

interface FixStep {
  label: string;
  status: "ok" | "skipped" | "failed";
  detail?: string;
}

interface FixResult {
  success: boolean;
  diagnosis: string;
  steps: FixStep[];
  summary: string;
}

/**
 * Generisk självfix-knapp. Anropar `self-fix`-edge function som diagnostiserar
 * och försöker åtgärda vanliga fel i den aktuella modulen. Visar resultat i
 * en dialog och invaliderar React Query-cachen så att UI uppdateras.
 */
export function SelfFixButton({
  module,
  companyId,
  errorMessage,
  context,
  size = "sm",
  variant = "outline",
  label = "Självfix",
}: SelfFixButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FixResult | null>(null);
  const qc = useQueryClient();

  const runFix = async () => {
    setLoading(true);
    setResult(null);
    setOpen(true);
    try {
      const { data, error } = await supabase.functions.invoke("self-fix", {
        body: {
          module,
          company_id: companyId || undefined,
          error_message: errorMessage,
          context,
        },
      });
      if (error) throw error;
      setResult(data as FixResult);
      // Invalidera all cache så att UI laddar om data efter fix
      qc.invalidateQueries();
      if ((data as FixResult)?.success) {
        toast.success("Självfix klar — data laddas om");
      } else {
        toast.warning("Självfix delvis genomförd — se detaljer");
      }
    } catch (e: any) {
      setResult({
        success: false,
        diagnosis: "Kunde inte köra självfix. Försök igen om en stund.",
        steps: [{ label: "Anropar self-fix", status: "failed", detail: e?.message || String(e) }],
        summary: "Misslyckades",
      });
      toast.error("Självfix misslyckades");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        size={size}
        variant={variant}
        onClick={runFix}
        disabled={loading}
        className="gap-1.5"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Wand2 className="w-3.5 h-3.5" />
        )}
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-[#3b82f6]" />
              Självfix — {module}
            </DialogTitle>
            <DialogDescription>
              AI:n diagnostiserar och åtgärdar vanliga fel automatiskt.
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              Kör diagnos och åtgärder…
            </div>
          )}

          {result && !loading && (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/50 p-3 text-sm leading-relaxed">
                <div className="font-medium mb-1 text-foreground">Diagnos</div>
                <p className="text-muted-foreground">{result.diagnosis}</p>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Åtgärder
                </div>
                {result.steps.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm py-1.5 border-b border-border/50 last:border-0"
                  >
                    {s.status === "ok" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : s.status === "failed" ? (
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-muted shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-foreground">{s.label}</div>
                      {s.detail && (
                        <div className="text-xs text-muted-foreground truncate">{s.detail}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  result.success
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                }`}
              >
                {result.summary}
              </div>

              <Button onClick={() => setOpen(false)} className="w-full">
                Stäng
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
