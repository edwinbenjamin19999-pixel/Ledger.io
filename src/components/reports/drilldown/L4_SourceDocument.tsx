/**
 * L4 — Source document view (invoice, receipt, PDF, bank tx, manual).
 */
import { useEffect, useState } from "react";
import { ExternalLink, FileText, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DrilldownEntryFocus } from "./types";
import { getSignedSourceUrl } from "./useDrilldownData";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  entry: DrilldownEntryFocus;
}

export function L4_SourceDocument({ entry }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data } = await supabase
          .from("journal_entries")
          .select("attachment_path, source_type, description")
          .eq("id", entry.journalEntryId)
          .maybeSingle();
        if (cancelled) return;
        const signed = await getSignedSourceUrl((data as any)?.attachment_path ?? null);
        if (!cancelled) setUrl(signed);
      } catch (e) {
        if (!cancelled) setUrl(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entry.journalEntryId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Hämtar underlag…
      </div>
    );
  }

  if (!url) {
    return (
      <div className="space-y-3 rounded-xl border border-dashed border-border p-8 text-center">
        <FileText className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <div>
          <p className="text-sm font-medium text-foreground">Inget underlag bifogat</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ver. {entry.verificationNumber || "—"} · {entry.date}
          </p>
        </div>
        <Button size="sm" variant="outline">
          <Upload className="mr-1.5 h-3.5 w-3.5" /> Lägg till underlag
        </Button>
      </div>
    );
  }

  const isPdf = url.toLowerCase().includes(".pdf");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            Ver. {entry.verificationNumber || "—"} · {entry.date}
          </p>
          <p className="text-xs text-muted-foreground">{entry.description || "—"}</p>
        </div>
        <Button asChild size="sm" variant="outline">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Öppna
          </a>
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-muted">
        {isPdf ? (
          <iframe src={url} className="h-[480px] w-full" title="Underlag" />
        ) : (
          <img src={url} alt="Underlag" className="max-h-[480px] w-full object-contain" />
        )}
      </div>
    </div>
  );
}
