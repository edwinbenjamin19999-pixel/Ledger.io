import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Pin, PinOff, Plus, Search, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface Note {
  id: string;
  title: string | null;
  content: string;
  tags: string[];
  is_pinned: boolean;
  author_id: string | null;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
}

const TAG_PALETTE = ["#fakturering", "#årsredovisning", "#kommunikation", "#risk", "#möte"];

interface Props {
  companyId: string;
  firmId: string;
}

export const ClientNotesTab = ({ companyId, firmId }: Props) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [editing, setEditing] = useState<Note | null>(null);
  const [draft, setDraft] = useState({ title: "", content: "", tags: [] as string[] });
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bureau_client_notes")
      .select("*")
      .eq("company_id", companyId)
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) toast.error("Kunde inte ladda anteckningar");
    setNotes((data ?? []) as Note[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [companyId]);

  const filtered = useMemo(() => {
    return notes.filter((n) => {
      if (tagFilter && !n.tags.includes(tagFilter)) return false;
      if (search && !`${n.title ?? ""} ${n.content}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [notes, search, tagFilter]);

  const pinned = filtered.filter((n) => n.is_pinned);
  const others = filtered.filter((n) => !n.is_pinned);

  const startNew = () => {
    setEditing(null);
    setDraft({ title: "", content: "", tags: [] });
  };

  const openEdit = (n: Note) => {
    setEditing(n);
    setDraft({ title: n.title ?? "", content: n.content, tags: n.tags });
  };

  const persist = async () => {
    if (!draft.content.trim() && !draft.title.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    if (editing) {
      const { error } = await supabase
        .from("bureau_client_notes")
        .update({
          title: draft.title || null,
          content: draft.content,
          tags: draft.tags,
          edited_at: new Date().toISOString(),
        })
        .eq("id", editing.id);
      if (!error) setSavedAt(new Date());
    } else {
      const { data, error } = await supabase
        .from("bureau_client_notes")
        .insert({
          firm_id: firmId,
          company_id: companyId,
          author_id: u.user?.id,
          title: draft.title || null,
          content: draft.content,
          tags: draft.tags,
        })
        .select()
        .single();
      if (!error && data) {
        setEditing(data as Note);
        setSavedAt(new Date());
      }
    }
    load();
  };

  // Autosave
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(persist, 30_000);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.content, draft.title, draft.tags]);

  const togglePin = async (n: Note) => {
    await supabase.from("bureau_client_notes").update({ is_pinned: !n.is_pinned }).eq("id", n.id);
    load();
  };

  const remove = async (n: Note) => {
    if (!confirm("Ta bort anteckning?")) return;
    await supabase.from("bureau_client_notes").delete().eq("id", n.id);
    if (editing?.id === n.id) startNew();
    load();
  };

  const toggleTag = (t: string) => {
    setDraft((d) => ({
      ...d,
      tags: d.tags.includes(t) ? d.tags.filter((x) => x !== t) : [...d.tags, t],
    }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Sök anteckningar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {TAG_PALETTE.map((t) => (
            <button
              key={t}
              onClick={() => setTagFilter((c) => (c === t ? null : t))}
              className={`px-2 py-0.5 rounded-full text-[11px] border ${
                tagFilter === t ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <Button size="sm" onClick={startNew} className="w-full">
          <Plus className="h-4 w-4 mr-1" /> Ny anteckning
        </Button>

        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400 mx-auto" />
        ) : (
          <div className="space-y-3">
            {pinned.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5 px-1">Fästa</p>
                {pinned.map((n) => (
                  <NoteCard key={n.id} note={n} onOpen={openEdit} onPin={togglePin} onDelete={remove} active={editing?.id === n.id} />
                ))}
              </div>
            )}
            <div>
              {pinned.length > 0 && others.length > 0 && (
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5 px-1">Övriga</p>
              )}
              {others.map((n) => (
                <NoteCard key={n.id} note={n} onOpen={openEdit} onPin={togglePin} onDelete={remove} active={editing?.id === n.id} />
              ))}
              {filtered.length === 0 && (
                <p className="text-[12px] text-slate-400 text-center py-4">Inga anteckningar.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-[12px] p-4">
        <Input
          placeholder="Titel (valfritt)"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          className="mb-2 text-[15px] font-medium border-0 px-0 focus-visible:ring-0"
        />
        <Textarea
          placeholder="Skriv en intern anteckning… klienten kan inte se denna."
          value={draft.content}
          onChange={(e) => setDraft({ ...draft, content: e.target.value })}
          className="min-h-[300px] border-0 px-0 focus-visible:ring-0 resize-none"
        />
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100">
          {TAG_PALETTE.map((t) => (
            <button
              key={t}
              onClick={() => toggleTag(t)}
              className={`px-2 py-0.5 rounded-full text-[11px] border ${
                draft.tags.includes(t) ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-white text-slate-500 border-slate-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between mt-3">
          <p className="text-[11px] text-slate-400">
            {savedAt ? `Senast sparad ${format(savedAt, "HH:mm:ss")}` : "Sparas automatiskt var 30:e sekund"}
          </p>
          <Button size="sm" onClick={persist}>Spara nu</Button>
        </div>
      </div>
    </div>
  );
};

const NoteCard = ({
  note,
  onOpen,
  onPin,
  onDelete,
  active,
}: {
  note: Note;
  onOpen: (n: Note) => void;
  onPin: (n: Note) => void;
  onDelete: (n: Note) => void;
  active: boolean;
}) => (
  <div
    className={`group p-2.5 rounded-md border cursor-pointer mb-1.5 ${
      active ? "border-blue-300 bg-blue-50/50" : "border-slate-200 bg-white hover:bg-slate-50"
    }`}
    onClick={() => onOpen(note)}
  >
    <div className="flex items-start justify-between gap-2">
      <p className="text-[13px] font-medium text-slate-800 line-clamp-1 flex-1">
        {note.title || note.content.slice(0, 40) || "Utan titel"}
      </p>
      <div className="opacity-0 group-hover:opacity-100 flex gap-1">
        <button onClick={(e) => { e.stopPropagation(); onPin(note); }}>
          {note.is_pinned ? <PinOff className="h-3.5 w-3.5 text-slate-400" /> : <Pin className="h-3.5 w-3.5 text-slate-400" />}
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(note); }}>
          <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
        </button>
      </div>
    </div>
    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{note.content}</p>
    <div className="flex items-center justify-between mt-1.5">
      <div className="flex gap-1">
        {note.tags.slice(0, 2).map((t) => (
          <span key={t} className="text-[10px] text-slate-400">{t}</span>
        ))}
      </div>
      <span className="text-[10px] text-slate-400">{format(new Date(note.updated_at), "yyyy-MM-dd")}</span>
    </div>
  </div>
);
