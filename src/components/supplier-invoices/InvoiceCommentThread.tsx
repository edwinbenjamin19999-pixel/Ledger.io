import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useInvoiceComments, useAddInvoiceComment } from "@/hooks/useInvoiceComments";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";

interface Props {
  invoiceId: string;
  companyId: string;
}

export function InvoiceCommentThread({ invoiceId, companyId }: Props) {
  const { data: comments = [], isLoading } = useInvoiceComments(invoiceId);
  const add = useAddInvoiceComment(invoiceId, companyId);
  const [text, setText] = useState("");
  const debounceRef = useRef<number | null>(null);

  const submit = () => {
    const v = text.trim();
    if (!v) return;
    add.mutate(v, { onSuccess: () => setText("") });
  };

  // Autosave-on-blur: just submit if there's content. (Drafts not persisted.)
  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-[#0F172A]" />
        <span className="text-sm font-semibold text-[#0F172A]">Kommentarer</span>
        <span className="text-[10px] text-[#475569] ml-auto">
          {comments.length} st
        </span>
      </div>

      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
        {isLoading ? (
          <div className="text-xs text-[#475569]">Laddar…</div>
        ) : comments.length === 0 ? (
          <div className="text-xs text-[#475569]">Inga kommentarer ännu.</div>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="rounded-lg bg-[#F8FAFB] p-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#0F172A]">
                  {c.user_id.slice(0, 8)}…
                </span>
                <span className="text-[10px] text-[#475569]">
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: sv })}
                </span>
              </div>
              <div className="mt-1 whitespace-pre-wrap text-[#0F172A]">{c.content}</div>
            </div>
          ))
        )}
      </div>

      <div className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              submit();
            }
          }}
          onBlur={() => {
            if (text.trim()) submit();
          }}
          placeholder="Skriv en kommentar… (Ctrl+Enter för att skicka)"
          className="min-h-[60px] text-xs"
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={submit} disabled={!text.trim() || add.isPending}>
            <Send className="h-3 w-3 mr-1" />
            Skicka
          </Button>
        </div>
      </div>
    </div>
  );
}
