import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { useFirmClients } from "@/hooks/useFirmDashboard";

/**
 * Firm-wide document feed.
 *
 * Reads from the existing `documents` table (used by the rest of NorthLedger for
 * AI document intelligence) and joins it to the firm's clients so the WL
 * portal can:
 *   - browse files per client (folder view)
 *   - scan a single chronological feed (timeline view)
 *   - surface clients with no recent uploads (missing-doc detection)
 *   - jump from a file to its linked task / journal entry
 *
 * No new tables — keeps everything connected to the existing storage bucket
 * (`documents` with `[company_id]/...` prefix) and the existing AI pipeline.
 */

export type DocCategory =
  | "invoice_incoming"
  | "invoice_outgoing"
  | "receipt"
  | "bank_statement"
  | "contract"
  | "annual_report"
  | "payroll"
  | "tax"
  | "other";

export interface FirmDocument {
  id: string;
  company_id: string;
  client_name: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  category: DocCategory;
  ai_label: string | null;
  ai_confidence: number;
  status: "pending" | "analyzing" | "ready" | "needs_review";
  linked_task_id: string | null;
  linked_entity_type: string | null;
  uploaded_at: string;
  uploaded_by: string;
}

export interface ClientDocFolder {
  client_id: string;
  client_name: string;
  org_number: string;
  total: number;
  byCategory: Record<DocCategory, number>;
  lastUploadAt: string | null;
  daysSinceUpload: number | null;
  /** AI: this client has not uploaded anything in 30+ days → likely missing */
  isMissingRecent: boolean;
  documents: FirmDocument[];
}

const CATEGORY_FROM_TYPE: Record<string, DocCategory> = {
  invoice_incoming: "invoice_incoming",
  invoice_outgoing: "invoice_outgoing",
  receipt: "receipt",
  bank_statement: "bank_statement",
  contract: "contract",
  annual_report: "annual_report",
  payroll: "payroll",
  tax: "tax",
  peppol: "invoice_incoming",
  other: "other",
};

function deriveCategory(row: {
  document_type: string | null;
  ai_document_type: string | null;
  document_category: string | null;
}): DocCategory {
  const candidate =
    (row.ai_document_type ?? "").toLowerCase() ||
    (row.document_type ?? "").toLowerCase() ||
    (row.document_category ?? "").toLowerCase();
  return CATEGORY_FROM_TYPE[candidate] ?? "other";
}

function deriveStatus(row: {
  processing_status: string | null;
  ai_confidence: number | null;
}): FirmDocument["status"] {
  const ps = (row.processing_status ?? "").toLowerCase();
  if (ps === "pending" || ps === "queued") return "pending";
  if (ps === "processing" || ps === "analyzing") return "analyzing";
  if ((row.ai_confidence ?? 1) < 0.6) return "needs_review";
  return "ready";
}

interface UseFirmDocumentsResult {
  documents: FirmDocument[];
  folders: ClientDocFolder[];
  totals: {
    total: number;
    needsReview: number;
    analyzing: number;
    last7d: number;
  };
  /** Clients in the firm with zero documents uploaded in the last 30 days */
  missingClients: ClientDocFolder[];
  isLoading: boolean;
}

export function useFirmDocuments(): UseFirmDocumentsResult {
  const { firmId, isLoading: ctxLoading } = useAdvisorContext();
  const { data: clients = [], isLoading: clientsLoading } = useFirmClients(firmId ?? "");

  const { data, isLoading: docsLoading } = useQuery({
    queryKey: ["firm-documents", firmId, clients.map((c) => c.id).join(",")],
    enabled: !!firmId && clients.length > 0,
    queryFn: async (): Promise<FirmDocument[]> => {
      const ids = clients.map((c) => c.id);
      const { data, error } = await supabase
        .from("documents")
        .select(
          "id,company_id,file_name,file_size,mime_type,document_type,ai_document_type,document_category,ai_confidence,processing_status,linked_entity_id,linked_entity_type,created_at,uploaded_by",
        )
        .in("company_id", ids)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const nameById = new Map(clients.map((c) => [c.id, c.name]));
      return (data ?? []).map((r) => ({
        id: r.id,
        company_id: r.company_id,
        client_name: nameById.get(r.company_id) ?? "Okänd klient",
        file_name: r.file_name ?? "Okänd fil",
        file_size: r.file_size,
        mime_type: r.mime_type,
        category: deriveCategory(r),
        ai_label: r.ai_document_type ?? r.document_category ?? null,
        ai_confidence: Number(r.ai_confidence ?? 0),
        status: deriveStatus(r),
        linked_task_id:
          r.linked_entity_type === "task" ? (r.linked_entity_id as string | null) : null,
        linked_entity_type: r.linked_entity_type,
        uploaded_at: r.created_at,
        uploaded_by: r.uploaded_by,
      }));
    },
    staleTime: 30_000,
  });

  const documents = data ?? [];

  // Group into folders per client and detect missing-doc clients
  const folders: ClientDocFolder[] = clients.map((c) => {
    const list = documents.filter((d) => d.company_id === c.id);
    const byCategory: Record<DocCategory, number> = {
      invoice_incoming: 0,
      invoice_outgoing: 0,
      receipt: 0,
      bank_statement: 0,
      contract: 0,
      annual_report: 0,
      payroll: 0,
      tax: 0,
      other: 0,
    };
    list.forEach((d) => (byCategory[d.category] += 1));
    const lastUploadAt = list[0]?.uploaded_at ?? null;
    const daysSinceUpload = lastUploadAt
      ? Math.round((Date.now() - new Date(lastUploadAt).getTime()) / 86400000)
      : null;
    return {
      client_id: c.id,
      client_name: c.name,
      org_number: c.org_number,
      total: list.length,
      byCategory,
      lastUploadAt,
      daysSinceUpload,
      isMissingRecent: daysSinceUpload === null || daysSinceUpload > 30,
      documents: list,
    };
  });

  const sevenDaysAgo = Date.now() - 7 * 86400000;
  const totals = {
    total: documents.length,
    needsReview: documents.filter((d) => d.status === "needs_review").length,
    analyzing: documents.filter((d) => d.status === "analyzing" || d.status === "pending").length,
    last7d: documents.filter((d) => new Date(d.uploaded_at).getTime() >= sevenDaysAgo).length,
  };

  const missingClients = folders.filter((f) => f.isMissingRecent);

  return {
    documents,
    folders,
    totals,
    missingClients,
    isLoading: ctxLoading || clientsLoading || docsLoading,
  };
}

export const CATEGORY_LABEL: Record<DocCategory, string> = {
  invoice_incoming: "Leverantörsfaktura",
  invoice_outgoing: "Kundfaktura",
  receipt: "Kvitto",
  bank_statement: "Bankutdrag",
  contract: "Avtal",
  annual_report: "Årsredovisning",
  payroll: "Lön",
  tax: "Skatt",
  other: "Övrigt",
};

export const CATEGORY_COLOR: Record<DocCategory, string> = {
  invoice_incoming: "bg-[#FAEEDA] text-amber-700 border-[#F0DDB7]",
  invoice_outgoing: "bg-[#EFF6FF] text-[#3b82f6] border-[#C8DDF5]",
  receipt: "bg-[#F1F5F9] text-violet-700 border-[#E2E8F0]",
  bank_statement: "bg-[#EFF6FF] text-indigo-700 border-indigo-500/20",
  contract: "bg-slate-500/10 text-slate-700 border-slate-500/20",
  annual_report: "bg-[#E1F5EE] text-emerald-700 border-[#BFE6D6]",
  payroll: "bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-500/20",
  tax: "bg-[#FCE8E8] text-rose-700 border-[#F4C8C8]",
  other: "bg-slate-200 text-slate-600 border-slate-300",
};
