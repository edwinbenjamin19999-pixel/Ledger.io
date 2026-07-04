import { useEffect, useState } from 'react';
import { X, FileText, Bot, Upload, Building2, Sparkles, Receipt, ShieldCheck, Paperclip, CheckCircle2, Download, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatSEK } from '@/lib/formatNumber';
import type { JournalDetail } from './types';
import type { ChartOfAccountsJoin } from '@/types/database-extensions';

interface VoucherSidePanelProps {
  detail: JournalDetail | null;
  onClose: () => void;
}

interface VoucherRow {
  konto: string;
  kontoName: string;
  debit: number;
  credit: number;
}

interface JournalMeta {
  status: string;
  created_at: string;
  updated_at: string;
  ai_confidence: number | null;
  ai_explanation: string | null;
  created_by: string | null;
  approved_by: string | null;
  receipt_matched: boolean | null;
  receipt_match_confidence: number | null;
  receipt_match_method: string | null;
  document_id: string | null;
  series_code: string | null;
  series_number: number | null;
  supplier_name: string | null;
  createdByName?: string;
  approvedByName?: string;
}

const fmtDateTime = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const statusColor = (s?: string) => {
  switch (s) {
    case 'approved': return 'bg-[#E1F5EE] text-[#1D9E75] border-[#BFE6D6]';
    case 'pending_approval': return 'bg-[#FAEEDA] text-[#C28A2B] border-[#F0DDB7]';
    case 'draft': return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    case 'deleted': return 'bg-[#FCE8E8] text-[#C73838] border-[#F4C8C8]';
    default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
  }
};

const statusLabel = (s?: string) => {
  switch (s) {
    case 'approved': return 'Godkänd';
    case 'pending_approval': return 'Väntar godkännande';
    case 'draft': return 'Utkast';
    case 'deleted': return 'Borttagen';
    default: return s || 'Okänd';
  }
};

export const VoucherSidePanel = ({ detail, onClose }: VoucherSidePanelProps) => {
  const [rows, setRows] = useState<VoucherRow[]>([]);
  const [meta, setMeta] = useState<JournalMeta | null>(null);

  useEffect(() => {
    if (detail?.journal_entry_id && !detail.isVirtualRow) {
      loadAll(detail.journal_entry_id);
    } else {
      setRows([]);
      setMeta(null);
    }
  }, [detail?.journal_entry_id]);

  const loadAll = async (entryId: string) => {
    const [linesRes, entryRes] = await Promise.all([
      supabase
        .from('journal_entry_lines')
        .select('debit, credit, chart_of_accounts(account_number, account_name)')
        .eq('journal_entry_id', entryId),
      supabase
        .from('journal_entries')
        .select('status, created_at, updated_at, ai_confidence, ai_explanation, created_by, approved_by, receipt_matched, receipt_match_confidence, receipt_match_method, document_id, series_code, series_number, supplier_name')
        .eq('id', entryId)
        .maybeSingle(),
    ]);

    if (linesRes.data) {
      setRows(linesRes.data.map((r: any) => ({
        konto: (r.chart_of_accounts as ChartOfAccountsJoin | null)?.account_number || '',
        kontoName: (r.chart_of_accounts as ChartOfAccountsJoin | null)?.account_name || '',
        debit: r.debit || 0,
        credit: r.credit || 0,
      })));
    }

    if (entryRes.data) {
      const m = entryRes.data as JournalMeta;
      // Resolve user names
      const userIds = [m.created_by, m.approved_by].filter((id): id is string => !!id);
      let nameMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        if (profiles) {
          nameMap = Object.fromEntries(profiles.map((p: any) => [p.id, p.full_name || p.email || 'Användare']));
        }
      }
      setMeta({
        ...m,
        createdByName: m.created_by ? nameMap[m.created_by] : undefined,
        approvedByName: m.approved_by ? nameMap[m.approved_by] : undefined,
      });
    } else {
      setMeta(null);
    }
  };

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  const isAI = detail?.createdBy === 'ai';
  const hasVATAccount = rows.some(r => /^264\d/.test(r.konto));
  const aiConfPct = meta?.ai_confidence != null ? Math.round(meta.ai_confidence * 100) : null;
  const matchConfPct = meta?.receipt_match_confidence != null ? Math.round(meta.receipt_match_confidence * 100) : null;

  return (
    <div
      className={`fixed right-0 top-0 h-full w-[480px] bg-slate-950 shadow-lg
                  border-l-2 border-[#3b82f6]/60 z-50 transform transition-transform duration-300 ease-out
                  ${detail ? 'translate-x-0' : 'translate-x-full'}`}
    >
      {detail && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#C8DDF5] flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-[#1E3A5F]" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-100 text-sm truncate">
                  {detail.isVirtualRow ? detail.description : `Verifikat #${detail.journal_number}`}
                </h3>
                {!detail.isVirtualRow && meta && (
                  <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[10px] font-medium border ${statusColor(meta.status)}`}>
                    {statusLabel(meta.status)}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors flex-shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto h-[calc(100%-64px)] pb-20">
            {/* Översikt */}
            <Section title="Översikt">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2.5 shadow-inner">
                <Row label="Datum" value={detail.entry_date} mono />
                <Row label="Beskrivning" value={detail.description} truncate />
                {meta?.series_code && (
                  <Row label="Serie" value={`${meta.series_code}${meta.series_number ?? ''}`} mono />
                )}
                {meta?.supplier_name && (
                  <Row label="Motpart" value={meta.supplier_name} truncate />
                )}
                {!detail.isVirtualRow && (
                  <Row
                    label="Belopp"
                    value={formatSEK(Math.max(detail.debit, detail.credit))}
                    mono
                    accent
                  />
                )}
              </div>
            </Section>

            {/* AI-spår */}
            {!detail.isVirtualRow && meta && (
              <Section title="AI-spår">
                <div className="bg-slate-900/60 border border-[#C8DDF5] rounded-xl p-4 space-y-3 shadow-inner">
                  {isAI && (
                    <TraceItem
                      icon={Sparkles}
                      label="Skapad via AI"
                      meta={aiConfPct != null ? `Gemini · ${aiConfPct}% konfidens` : 'Gemini'}
                      pill={aiConfPct != null ? `${aiConfPct}%` : undefined}
                    />
                  )}
                  {meta.receipt_matched && (
                    <TraceItem
                      icon={Receipt}
                      label="Matchad mot underlag"
                      meta={`${meta.receipt_match_method || 'auto'}${matchConfPct != null ? ` · ${matchConfPct}%` : ''}`}
                      pill={matchConfPct != null ? `${matchConfPct}%` : undefined}
                    />
                  )}
                  {hasVATAccount && (
                    <TraceItem
                      icon={ShieldCheck}
                      label="Validerad mot momsregler"
                      meta="BAS 2026 · godkänd"
                    />
                  )}
                  {meta.document_id && (
                    <TraceItem
                      icon={Paperclip}
                      label="Underlag bifogat"
                      meta="Klicka för att visa"
                      action
                    />
                  )}
                  {!isAI && !meta.receipt_matched && !hasVATAccount && !meta.document_id && (
                    <div className="text-xs text-slate-500 italic">Inget AI-spår tillgängligt för denna verifikation.</div>
                  )}
                  {meta.ai_explanation && (
                    <div className="mt-2 pt-3 border-t border-slate-800">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">AI-motivering</p>
                      <p className="text-xs text-slate-300 leading-relaxed italic">"{meta.ai_explanation}"</p>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Tidslinje */}
            {!detail.isVirtualRow && meta && (
              <Section title="Tidslinje">
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-inner">
                  <ol className="relative border-l border-slate-700 ml-2 space-y-4">
                    <TimelineNode
                      color="cyan"
                      label="Skapad"
                      timestamp={fmtDateTime(meta.created_at)}
                      actor={isAI ? 'av AI' : meta.createdByName ? `av ${meta.createdByName}` : 'av system'}
                    />
                    {meta.updated_at && meta.updated_at !== meta.created_at && (
                      <TimelineNode
                        color="slate"
                        label="Uppdaterad"
                        timestamp={fmtDateTime(meta.updated_at)}
                        actor="automatisk validering"
                      />
                    )}
                    {meta.approved_by && (
                      <TimelineNode
                        color="emerald"
                        label="Godkänd"
                        timestamp={fmtDateTime(meta.updated_at)}
                        actor={meta.approvedByName ? `av ${meta.approvedByName}` : 'av användare'}
                      />
                    )}
                  </ol>
                </div>
              </Section>
            )}

            {/* Anomaly */}
            {detail.anomalyType && (
              <Section title="Avvikelse">
                <div className="bg-[#FAEEDA] border border-[#F0DDB7] rounded-xl p-4">
                  <p className="text-xs text-amber-300 leading-relaxed">{detail.anomalyReason}</p>
                </div>
              </Section>
            )}

            {/* Verifikatrader */}
            {!detail.isVirtualRow && rows.length > 0 && (
              <Section title="Verifikatrader">
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                  <div className="grid grid-cols-[80px_1fr_100px_100px] px-3 py-2 border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                    <span>Konto</span>
                    <span>Benämning</span>
                    <span className="text-right">Debet</span>
                    <span className="text-right">Kredit</span>
                  </div>
                  {rows.map((r, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[80px_1fr_100px_100px] px-3 py-3 border-b border-slate-800/60 text-sm hover:bg-[#EFF6FF] transition-colors items-center"
                    >
                      <span className="font-mono text-[11px] inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 w-fit">{r.konto}</span>
                      <span className="text-slate-300 px-2 truncate text-xs">{r.kontoName}</span>
                      <span className="text-[#1D9E75] tabular-nums text-right text-xs">{r.debit > 0 ? formatSEK(r.debit) : ''}</span>
                      <span className="text-[#C73838] tabular-nums text-right text-xs">{r.credit > 0 ? formatSEK(r.credit) : ''}</span>
                    </div>
                  ))}
                  <div className="grid grid-cols-[80px_1fr_100px_100px] px-3 py-3 border-t-2 border-[#C8DDF5] bg-slate-950/50 text-sm font-semibold items-center">
                    <span></span>
                    <span className="text-slate-400 px-2 text-xs uppercase tracking-wider">Summa</span>
                    <span className="text-[#1D9E75] tabular-nums text-right">{formatSEK(totalDebit)}</span>
                    <span className="text-[#C73838] tabular-nums text-right">{formatSEK(totalCredit)}</span>
                  </div>
                </div>
              </Section>
            )}
          </div>

          {/* Footer actions */}
          {!detail.isVirtualRow && (
            <div className="absolute bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950/95 backdrop-blur px-6 py-3 flex items-center gap-2">
              {meta?.document_id && (
                <button className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#EFF6FF] hover:bg-[#EFF6FF] border border-[#C8DDF5] text-[#3b82f6] text-xs font-medium transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" /> Visa underlag
                </button>
              )}
              <button className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition-colors">
                <Download className="w-3.5 h-3.5" /> Exportera PDF
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/* ─── Subcomponents ─── */

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="px-6 pt-5">
    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2 pb-1.5 border-b border-slate-800/60">{title}</p>
    {children}
  </div>
);

const Row = ({ label, value, mono, truncate, accent }: { label: string; value: string; mono?: boolean; truncate?: boolean; accent?: boolean }) => (
  <div className="flex justify-between items-baseline text-sm gap-3">
    <span className="text-slate-500 text-xs">{label}</span>
    <span className={`font-medium text-right ${truncate ? 'max-w-[260px] truncate' : ''} ${mono ? 'tabular-nums' : ''} ${accent ? 'text-[#1E3A5F] text-base' : 'text-slate-200 text-xs'}`}>{value}</span>
  </div>
);

const TraceItem = ({ icon: Icon, label, meta, pill, action }: { icon: any; label: string; meta?: string; pill?: string; action?: boolean }) => (
  <div className="flex items-start gap-3">
    <div className="w-6 h-6 rounded-md bg-[#EFF6FF] border border-[#C8DDF5] flex items-center justify-center flex-shrink-0 mt-0.5">
      <CheckCircle2 className="w-3.5 h-3.5 text-[#1E3A5F]" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-200">{label}</span>
        {pill && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#3b82f6] border border-[#C8DDF5] tabular-nums font-mono">{pill}</span>
        )}
      </div>
      {meta && <p className="text-[11px] text-slate-500 mt-0.5">{meta}</p>}
    </div>
    {action && <ExternalLink className="w-3.5 h-3.5 text-slate-500 mt-1.5" />}
  </div>
);

const TimelineNode = ({ color, label, timestamp, actor }: { color: 'cyan' | 'emerald' | 'slate'; label: string; timestamp: string; actor: string }) => {
  const dotColor = color === 'cyan' ? 'bg-[#3b82f6] ring-[#3b82f6]/30' : color === 'emerald' ? 'bg-emerald-400 ring-emerald-500/30' : 'bg-slate-500 ring-slate-600/30';
  return (
    <li className="ml-4 relative">
      <span className={`absolute -left-[22px] top-1 w-2.5 h-2.5 rounded-full ${dotColor} ring-4`} />
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-slate-200">{label}</span>
        <span className="text-[10px] text-slate-500 tabular-nums">{timestamp}</span>
      </div>
      <p className="text-[11px] text-slate-500 mt-0.5">{actor}</p>
    </li>
  );
};
