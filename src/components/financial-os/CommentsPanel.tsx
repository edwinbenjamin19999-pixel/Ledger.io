/**
 * CommentsPanel — slide-in 420px Sheet that hosts the comment thread for the
 * entity currently set in <FinancialOSContext>. Mounts globally via
 * <PageLayout financialOS />.
 *
 * Threads are realtime via `useCollabComments`. The "Förklara avvikelsen"
 * action calls the `collab-summarize` edge function and posts the result back
 * as an AI-authored comment.
 */
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, Check, Loader2 } from "lucide-react";
import { useFinancialOSOptional } from "@/contexts/FinancialOSContext";
import {
  useCollabComments,
  useCreateComment,
  useResolveComment,
} from "@/hooks/useCollabComments";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";

export function CommentsPanel() {
  const fos = useFinancialOSOptional();
  const entity = fos?.commentsEntity ?? null;
  const open = !!fos?.commentsOpen && !!entity;

  const { data: comments = [], isLoading } = useCollabComments(entity);
  const create = useCreateComment();
  const resolve = useResolveComment();

  const [draft, setDraft] = useState("");
  const [aiPending, setAiPending] = useState(false);

  if (!fos) return null;

  const handlePost = async () => {
    const body = draft.trim();
    if (!body || !entity) return;
    const mentions: string[] = [];
    const re = /@([a-z0-9_-]{8,})/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(body)) !== null) mentions.push(m[1]);
    await create.mutateAsync({ entity, body, mentions });
    setDraft("");
  };

  const handleExplain = async () => {
    if (!entity || aiPending) return;
    setAiPending(true);
    try {
      const { data, error } = await supabase.functions.invoke("collab-summarize", {
        body: {
          entity,
          context: {
            period: fos.period,
            versions: fos.versions,
            dimension: fos.dimension,
          },
        },
      });
      if (error) throw error;
      const summary: string = data?.summary || data?.text || "AI kunde inte sammanfatta tråden.";
      await create.mutateAsync({
        entity,
        body: `🤖 **AI-förklaring**\n\n${summary}`,
      });
    } catch {
      /* silent — user can retry */
    } finally {
      setAiPending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && fos.closeComments()}>
      <SheetContent side="right" className="w-full sm:max-w-[420px] flex flex-col p-0">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex items-center justify-between gap-2">
            <span className="truncate">Kommentarer</span>
            {entity && (
              <span className="font-mono text-[10px] font-normal text-muted-foreground truncate">
                {entity}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {isLoading && (
            <div className="text-sm text-muted-foreground inline-flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Laddar kommentarer…
            </div>
          )}
          {!isLoading && comments.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Inga kommentarer ännu. Starta en tråd nedan.
            </div>
          )}

          {comments.map((c) => {
            const isAi = c.body.startsWith("🤖");
            return (
              <div
                key={c.id}
                className={cn(
                  "rounded-xl border bg-background p-3 text-sm shadow-sm",
                  isAi && "border-[#C8DDF5] bg-blue-50/40",
                  c.resolved_at && "opacity-60",
                )}
              >
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                  <span className="font-mono truncate">
                    {isAi ? "AI-Ekonom" : c.author_id.slice(0, 8)}
                  </span>
                  <span>
                    {formatDistanceToNow(new Date(c.created_at), {
                      addSuffix: true,
                      locale: sv,
                    })}
                  </span>
                </div>
                <div className="whitespace-pre-wrap text-foreground text-sm">{c.body}</div>
                {!c.resolved_at && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => resolve.mutate(c.id)}
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-[#085041]"
                    >
                      <Check className="h-3 w-3" /> Markera löst
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t bg-muted/30 px-5 py-3 space-y-2">
          <Textarea
            placeholder="Skriv en kommentar… (använd @ för att tagga)"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <div className="flex items-center justify-between gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5"
              onClick={handleExplain}
              disabled={aiPending}
            >
              {aiPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Förklara avvikelsen
            </Button>
            <Button
              size="sm"
              onClick={handlePost}
              disabled={!draft.trim() || create.isPending}
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              Skicka
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
