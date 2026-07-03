/**
 * PresentationMode — full-screen, board-ready overlay rendering KPI tiles, the
 * primary chart and an AI narrative for the active route. Triggered globally
 * via FinancialOSContext.togglePresentation (or 🎬 in CommandBar).
 *
 * ESC closes. "Exportera PDF" produces a one-page summary using jsPDF in the
 * same style as scenarioPdf.ts.
 */
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Sparkles } from "lucide-react";
import { useFinancialOSOptional } from "@/contexts/FinancialOSContext";
import jsPDF from "jspdf";

interface Props {
  /** Optional KPI tiles for the active page; falls back to placeholders. */
  kpis?: Array<{ label: string; value: string; delta?: string; tone?: "good" | "bad" | "neutral" }>;
  narrative?: string;
  title?: string;
}

export function PresentationMode({ kpis, narrative, title }: Props) {
  const fos = useFinancialOSOptional();
  const open = !!fos?.presentationMode;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") fos?.togglePresentation();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, fos]);

  if (!open || !fos) return null;

  const heading = title ?? "Financial OS · Presentation";

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(heading, 40, 50);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(110);
    doc.text(new Date().toLocaleString("sv-SE"), 40, 70);

    let y = 110;
    doc.setTextColor(20);
    if (kpis?.length) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("KPI", 40, y);
      y += 16;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      kpis.forEach((k) => {
        doc.text(
          `${k.label}: ${k.value}${k.delta ? "  (" + k.delta + ")" : ""}`,
          40,
          y,
        );
        y += 16;
      });
      y += 12;
    }

    if (narrative) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("AI-summering", 40, y);
      y += 16;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(narrative, 740);
      doc.text(lines, 40, y);
    }

    doc.save(`presentation-${Date.now()}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950 text-white flex flex-col animate-in fade-in duration-200">
      <div className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-[#1E3A5F]" />
          <h2 className="text-xl font-semibold">{heading}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={exportPdf} className="gap-1.5 border-white/20 bg-white/5 text-white hover:bg-white/10">
            <Download className="h-3.5 w-3.5" />
            Exportera PDF
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={fos.togglePresentation}
            aria-label="Stäng"
            className="text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-12 py-10 space-y-10">
        {kpis?.length ? (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {kpis.map((k) => (
              <div
                key={k.label}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
              >
                <div className="text-xs uppercase tracking-wider text-white/60">{k.label}</div>
                <div className="mt-3 text-4xl font-bold tabular-nums">{k.value}</div>
                {k.delta && (
                  <div
                    className={`mt-2 text-sm font-medium ${
                      k.tone === "good"
                        ? "text-[#1D9E75]"
                        : k.tone === "bad"
                          ? "text-[#C73838]"
                          : "text-white/70"
                    }`}
                  >
                    {k.delta}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-white/60 italic">Inga KPI:er kopplade till denna vy ännu.</div>
        )}

        {narrative && (
          <div className="max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-8 text-lg leading-relaxed text-white/90 whitespace-pre-wrap">
            {narrative}
          </div>
        )}

        <div className="text-xs text-white/40">
          Tryck <kbd className="rounded bg-white/10 px-1.5 py-0.5">Esc</kbd> för att stänga.
        </div>
      </div>
    </div>
  );
}
