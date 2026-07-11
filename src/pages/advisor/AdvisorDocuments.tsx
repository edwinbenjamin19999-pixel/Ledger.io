import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  Search,
  Folder,
  Clock,
  FileText,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Inbox,
  FileQuestion,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  useFirmDocuments,
  CATEGORY_LABEL,
  CATEGORY_COLOR,
  type FirmDocument,
  type ClientDocFolder,
  type DocCategory,
} from "@/hooks/useFirmDocuments";
import { useAdvisorActiveClient } from "@/contexts/AdvisorActiveClientContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { WLEmptyState } from "@/components/advisor/wl-ui/WLEmptyState";

type View = "folders" | "timeline";

function formatBytes(b: number | null): string {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("sv-SE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function StatusPill({ status }: { status: FirmDocument["status"] }) {
  const meta = {
    ready: { label: "Klar", icon: CheckCircle2, cls: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]" },
    analyzing: { label: "Analyserar", icon: Loader2, cls: "bg-[#EFF6FF] text-[#0052FF] border-[#C8DDF5]", spin: true },
    pending: { label: "I kö", icon: Clock, cls: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]" },
    needs_review: { label: "Granska", icon: AlertTriangle, cls: "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8]" },
  }[status];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border", meta.cls)}>
      <Icon className={cn("h-3 w-3", "spin" in meta && meta.spin && "animate-spin")} />
      {meta.label}
    </span>
  );
}

const AdvisorDocuments = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { setActiveClient } = useAdvisorActiveClient();
  const { documents, folders, totals, missingClients, isLoading } = useFirmDocuments();

  const [view, setView] = useState<View>("folders");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<DocCategory | "all">("all");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((d) => {
      if (categoryFilter !== "all" && d.category !== categoryFilter) return false;
      if (selectedClientId && d.company_id !== selectedClientId) return false;
      if (!q) return true;
      return (
        d.file_name.toLowerCase().includes(q) ||
        d.client_name.toLowerCase().includes(q) ||
        (d.ai_label ?? "").toLowerCase().includes(q)
      );
    });
  }, [documents, search, categoryFilter, selectedClientId]);

  const visibleFolders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return folders.filter((f) => {
      if (!q) return true;
      return f.client_name.toLowerCase().includes(q) || f.org_number.toLowerCase().includes(q);
    });
  }, [folders, search]);

  const handleFiles = useCallback(
    async (files: File[], targetCompanyId: string | null) => {
      if (!user) {
        toast.error("Du måste vara inloggad");
        return;
      }
      if (!targetCompanyId) {
        toast.error("Välj en klientmapp först eller dra filen direkt på en mapp");
        return;
      }
      setUploadingCount(files.length);
      let ok = 0;
      let fail = 0;
      for (const file of files) {
        try {
          const safeName = file.name.replace(/[^\w.\-]+/g, "_");
          const path = `${targetCompanyId}/${crypto.randomUUID()}-${safeName}`;
          const { error: upErr } = await supabase.storage
            .from("documents")
            .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
          if (upErr) throw upErr;
          const { error: insErr } = await supabase.from("documents").insert({
            company_id: targetCompanyId,
            uploaded_by: user.id,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            file_url: path,
            document_type: "other",
            processing_status: "pending",
          });
          if (insErr) throw insErr;
          ok++;
        } catch (err) {
          console.error("[wl-documents] upload failed", err);
          fail++;
        }
      }
      setUploadingCount(0);
      if (ok > 0) toast.success(`${ok} fil${ok > 1 ? "er" : ""} uppladdad${ok > 1 ? "a" : ""} — AI kategoriserar`);
      if (fail > 0) toast.error(`${fail} fil${fail > 1 ? "er" : ""} misslyckades`);
      qc.invalidateQueries({ queryKey: ["firm-documents"] });
    },
    [user, qc],
  );

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) handleFiles(files, selectedClientId);
    e.target.value = "";
  };

  const openClient = (folder: ClientDocFolder, route = "/dashboard") => {
    setActiveClient({ id: folder.client_id, name: folder.client_name, orgNumber: folder.org_number });
    navigate(route);
  };

  const requestFromClient = (folder: ClientDocFolder) => {
    toast.success(`Förfrågan skickad till ${folder.client_name}`, {
      description: "Klienten får ett mejl med säker uppladdningslänk",
    });
  };

  return (
    <div className="space-y-6 p-6 max-w-[1400px] mx-auto">
      {/* Hero */}
      <div
        className="rounded-3xl p-6 text-white relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, hsl(243 70% 18%) 0%, hsl(222 47% 14%) 50%, hsl(190 60% 22%) 100%)",
        }}
      >
        <div
          className="absolute -top-10 -right-10 w-72 h-72 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(190 90% 60%) 0%, transparent 70%)" }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#0052FF]/80 mb-1">
              Dokument & data · AI-koppat
            </p>
            <h1 className="text-2xl font-bold tracking-tight">Klientarkiv</h1>
            <p className="text-sm text-white/60 mt-1">
              Allt material från alla klienter — kategoriserat av AI och kopplat till uppgifter
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" multiple className="hidden" onChange={onPick} />
            <Button
              onClick={() => fileRef.current?.click()}
              disabled={!selectedClientId}
              className="bg-white text-slate-900 hover:bg-white/90 font-semibold"
            >
              <Upload className="h-4 w-4 mr-2" />
              Ladda upp
            </Button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="relative mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Totalt" value={totals.total} icon={FileText} />
          <Kpi label="Senaste 7d" value={totals.last7d} icon={Clock} accent="cyan" />
          <Kpi label="AI analyserar" value={totals.analyzing} icon={Loader2} accent="amber" spin={totals.analyzing > 0} />
          <Kpi label="Behöver granskning" value={totals.needsReview} icon={AlertTriangle} accent="rose" />
        </div>
      </div>

      {/* AI missing-doc panel */}
      {missingClients.length > 0 && (
        <Card className="p-4 border-amber-200/60 bg-gradient-to-br from-amber-50 to-white">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#FAEEDA] flex items-center justify-center shrink-0">
              <FileQuestion className="h-4 w-4 text-[#7A5417]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-3 w-3 text-[#7A5417]" />
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#7A5417]">AI upptäckt</p>
              </div>
              <p className="text-sm font-semibold text-slate-900">
                {missingClients.length} klient{missingClients.length === 1 ? "" : "er"} har inte laddat upp underlag på 30+ dagar
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Skicka en automatisk påminnelse — eller öppna klienten för att se vad som saknas.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {missingClients.slice(0, 5).map((m) => (
                  <button
                    key={m.client_id}
                    type="button"
                    onClick={() => requestFromClient(m)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-[#F0DDB7] hover:bg-[#FAEEDA] text-slate-700 hover:text-[#7A5417] transition-colors"
                  >
                    {m.client_name}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={view === "folders" ? "Sök klient..." : "Sök fil, klient eller AI-etikett..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setView("folders")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5",
              view === "folders" ? "bg-[#0052FF] text-white" : "text-slate-600 hover:text-slate-900",
            )}
          >
            <Folder className="h-3.5 w-3.5" />
            Mappar
          </button>
          <button
            type="button"
            onClick={() => setView("timeline")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5",
              view === "timeline" ? "bg-[#0052FF] text-white" : "text-slate-600 hover:text-slate-900",
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            Tidslinje
          </button>
        </div>
        {view === "timeline" && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as DocCategory | "all")}
            className="h-9 px-3 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700"
          >
            <option value="all">Alla kategorier</option>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        )}
        {selectedClientId && (
          <Button variant="ghost" size="sm" onClick={() => setSelectedClientId(null)} className="h-9">
            Rensa filter
          </Button>
        )}
      </div>

      {/* Body */}
      {isLoading ? (
        <Card className="p-12 flex items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Hämtar dokument...
        </Card>
      ) : view === "folders" ? (
        visibleFolders.length === 0 ? (
          <WLEmptyState
            icon={Inbox}
            title="Inga klienter ännu"
            description="Lägg till klienter för att börja samla in deras underlag."
            primaryAction={{ label: "Lägg till klient", onClick: () => navigate("/wl/app/clients") }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleFolders.map((f) => (
              <FolderCard
                key={f.client_id}
                folder={f}
                isActive={selectedClientId === f.client_id}
                onSelect={() => setSelectedClientId(f.client_id)}
                onOpenClient={() => openClient(f, "/dokument")}
                onRequest={() => requestFromClient(f)}
                onDropFiles={(files) => handleFiles(files, f.client_id)}
              />
            ))}
          </div>
        )
      ) : filteredDocs.length === 0 ? (
        <WLEmptyState
          icon={FileText}
          title="Inga dokument matchar"
          description="Justera filter eller ladda upp första filen för en klient."
          aiSuggestion={
            missingClients.length > 0
              ? `${missingClients.length} klient${missingClients.length === 1 ? "" : "er"} saknar underlag — skicka en påminnelse?`
              : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredDocs.map((d) => (
              <TimelineRow
                key={d.id}
                doc={d}
                onOpenClient={() => {
                  const f = folders.find((x) => x.client_id === d.company_id);
                  if (f) openClient(f, "/dokument");
                }}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Floating drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const files = Array.from(e.dataTransfer.files ?? []);
          if (files.length) handleFiles(files, selectedClientId);
        }}
        className={cn(
          "fixed bottom-6 right-6 z-30 rounded-2xl border-2 border-dashed p-4 transition-all backdrop-blur-md max-w-[280px] shadow-xl",
          dragOver
            ? "border-[#0052FF] bg-blue-50/95 scale-105"
            : "border-slate-300 bg-white/90 hover:border-[#0052FF]/50",
          uploadingCount > 0 && "border-[#0052FF] bg-white",
        )}
      >
        <div className="flex items-center gap-2.5">
          {uploadingCount > 0 ? (
            <Loader2 className="h-5 w-5 text-[#0052FF] animate-spin shrink-0" />
          ) : (
            <Upload className="h-5 w-5 text-[#0052FF] shrink-0" />
          )}
          <div className="text-xs">
            <p className="font-semibold text-slate-900">
              {uploadingCount > 0
                ? `Laddar upp ${uploadingCount}...`
                : selectedClientId
                ? "Släpp filer här"
                : "Välj klient först"}
            </p>
            <p className="text-[11px] text-slate-500">
              {selectedClientId ? "AI kategoriserar automatiskt" : "Klicka en mapp i listan"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvisorDocuments;

/* ---------------- subcomponents ---------------- */

interface KpiProps {
  label: string;
  value: number;
  icon: typeof FileText;
  accent?: "cyan" | "amber" | "rose";
  spin?: boolean;
}
function Kpi({ label, value, icon: Icon, accent, spin }: KpiProps) {
  const colorMap = {
    cyan: "text-[#0052FF]",
    amber: "text-amber-300",
    rose: "text-rose-300",
    default: "text-white/80",
  };
  const color = accent ? colorMap[accent] : colorMap.default;
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-white/50">
        <Icon className={cn("h-3 w-3", color, spin && "animate-spin")} />
        {label}
      </div>
      <div className="text-2xl font-bold tabular-nums mt-1">{value}</div>
    </div>
  );
}

interface FolderCardProps {
  folder: ClientDocFolder;
  isActive: boolean;
  onSelect: () => void;
  onOpenClient: () => void;
  onRequest: () => void;
  onDropFiles: (files: File[]) => void;
}
function FolderCard({ folder, isActive, onSelect, onOpenClient, onRequest, onDropFiles }: FolderCardProps) {
  const [dragOver, setDragOver] = useState(false);
  return (
    <Card
      onClick={onSelect}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e.dataTransfer.files ?? []);
        if (files.length) onDropFiles(files);
      }}
      className={cn(
        "p-4 cursor-pointer transition-all hover:shadow-md hover:border-[#C8DDF5]",
        isActive && "ring-2 ring-[#0052FF] border-[#0052FF]",
        dragOver && "ring-2 ring-[#0052FF] bg-[#EFF6FF]",
        folder.isMissingRecent && "border-amber-300/60",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
              folder.isMissingRecent ? "bg-[#FAEEDA]" : "bg-slate-100",
            )}
          >
            <Folder className={cn("h-4 w-4", folder.isMissingRecent ? "text-[#7A5417]" : "text-slate-600")} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{folder.client_name}</p>
            <p className="text-[11px] text-slate-500 tabular-nums">{folder.org_number}</p>
          </div>
        </div>
        <span className="text-xs font-bold tabular-nums text-slate-500 shrink-0">{folder.total}</span>
      </div>

      <div className="flex flex-wrap gap-1 mb-3 min-h-[20px]">
        {(Object.entries(folder.byCategory) as [DocCategory, number][])
          .filter(([, n]) => n > 0)
          .slice(0, 4)
          .map(([cat, n]) => (
            <span
              key={cat}
              className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold border", CATEGORY_COLOR[cat])}
            >
              {CATEGORY_LABEL[cat]} · {n}
            </span>
          ))}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {folder.lastUploadAt
            ? `${folder.daysSinceUpload}d sedan`
            : "Inga uppladdningar"}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenClient();
          }}
          className="font-semibold text-[#0052FF] hover:text-[#0052FF] inline-flex items-center gap-0.5"
        >
          Öppna
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {folder.isMissingRecent && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRequest();
          }}
          className="mt-3 w-full text-[11px] font-semibold text-[#7A5417] bg-[#FAEEDA] hover:bg-[#FAEEDA] border border-[#F0DDB7] rounded-md py-1.5 transition-colors"
        >
          Begär underlag från klient
        </button>
      )}
    </Card>
  );
}

interface TimelineRowProps {
  doc: FirmDocument;
  onOpenClient: () => void;
}
function TimelineRow({ doc, onOpenClient }: TimelineRowProps) {
  return (
    <div className="flex items-center gap-3 p-3 hover:bg-slate-50/60 transition-colors">
      <div
        className={cn(
          "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border",
          CATEGORY_COLOR[doc.category],
        )}
      >
        <FileText className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-slate-900 truncate">{doc.file_name}</p>
          <StatusPill status={doc.status} />
          {doc.linked_task_id && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#F1F5F9] text-violet-700 border border-[#E2E8F0]">
              <Sparkles className="h-2.5 w-2.5" />
              Kopplad uppgift
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
          <button type="button" onClick={onOpenClient} className="font-medium text-slate-700 hover:text-[#0052FF]">
            {doc.client_name}
          </button>
          <span>·</span>
          <span>{CATEGORY_LABEL[doc.category]}</span>
          {doc.ai_label && doc.ai_confidence > 0 && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-0.5">
                <Sparkles className="h-2.5 w-2.5 text-[#0052FF]" />
                AI {Math.round(doc.ai_confidence * 100)}%
              </span>
            </>
          )}
          <span>·</span>
          <span className="tabular-nums">{formatBytes(doc.file_size)}</span>
          <span>·</span>
          <span className="tabular-nums">{formatDate(doc.uploaded_at)}</span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
    </div>
  );
}
