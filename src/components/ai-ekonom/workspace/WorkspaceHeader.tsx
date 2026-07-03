import { useEffect, useRef, useState } from "react";
import { Sparkles, Plus, History, Trash2, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConversationListItem {
  id: string;
  title: string;
  updated_at: string;
}

interface Props {
  conversations: ConversationListItem[];
  activeId: string | null;
  onNew: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

const relTime = (iso: string) => {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "nyss";
  if (m < 60) return `${m} min sedan`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h sedan`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} d sedan`;
  return new Date(iso).toLocaleDateString("sv-SE");
};

export function WorkspaceHeader({
  conversations, activeId, onNew, onSelect, onRename, onDelete,
}: Props) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-border bg-background">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#3b82f6]" />
          <h1 className="text-[20px] font-semibold tracking-tight text-foreground">AI Ekonom</h1>
        </div>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Din AI-ekonom — fråga, analysera, agera
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onNew}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-card text-[13px] font-medium text-foreground hover:bg-muted transition"
        >
          <Plus className="w-3.5 h-3.5" /> Ny konversation
        </button>

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((o) => !o)}
            className={cn(
              "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-[13px] font-medium transition",
              open ? "border-[#3b82f6] bg-[#3b82f6]/5 text-[#3b82f6]" : "border-border bg-card text-foreground hover:bg-muted"
            )}
          >
            <History className="w-3.5 h-3.5" /> Historik
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-[340px] max-h-[420px] overflow-y-auto rounded-xl border border-border bg-popover shadow-lg z-50">
              <div className="px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground border-b border-border">
                Tidigare konversationer
              </div>
              {conversations.length === 0 ? (
                <div className="px-3 py-6 text-[13px] text-muted-foreground text-center">
                  Inga sparade konversationer ännu.
                </div>
              ) : (
                <ul className="py-1">
                  {conversations.map((c) => {
                    const isActive = c.id === activeId;
                    const isEditing = editingId === c.id;
                    return (
                      <li key={c.id} className="group">
                        {isEditing ? (
                          <div className="flex items-center gap-1 px-2 py-1.5">
                            <input
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") { onRename(c.id, editValue.trim() || c.title); setEditingId(null); }
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              className="flex-1 h-8 px-2 rounded-md border border-border bg-background text-[13px] focus:outline-none focus:border-[#3b82f6]"
                            />
                            <button
                              onClick={() => { onRename(c.id, editValue.trim() || c.title); setEditingId(null); }}
                              className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 rounded-md text-muted-foreground hover:bg-muted"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div
                            className={cn(
                              "flex items-center gap-2 px-2 py-1.5 mx-1 rounded-lg cursor-pointer",
                              isActive ? "bg-[#3b82f6]/10" : "hover:bg-muted"
                            )}
                            onClick={() => { onSelect(c.id); setOpen(false); }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className={cn(
                                "text-[13px] truncate",
                                isActive ? "text-[#3b82f6] font-medium" : "text-foreground"
                              )}>{c.title}</div>
                              <div className="text-[11px] text-muted-foreground">{relTime(c.updated_at)}</div>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditValue(c.title); setEditingId(c.id); }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-opacity"
                              title="Byt namn"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); if (confirm("Radera konversation?")) onDelete(c.id); }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted-foreground hover:text-red-500 hover:bg-muted transition-opacity"
                              title="Radera"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
