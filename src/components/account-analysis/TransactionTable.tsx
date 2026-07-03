import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { FileText, Bot, Upload, Building2, Pencil, Flag, History } from 'lucide-react';
import type { JournalDetail } from './types';
import { formatSEK } from '@/lib/formatNumber';

interface TransactionTableProps {
  details: JournalDetail[];
  onOpenVoucher: (detail: JournalDetail) => void;
  onToggleReviewed: (id: string) => void;
}

const creatorIcon = (createdBy?: string) => {
  switch (createdBy) {
    case 'ai': return <span title="AI-skapad"><Bot className="w-3 h-3 text-[#1E3A5F]" /></span>;
    case 'import': return <span title="Importerad"><Upload className="w-3 h-3 text-[#1E3A5F]" /></span>;
    case 'bank_sync': return <span title="Banksynk"><Building2 className="w-3 h-3 text-teal-400" /></span>;
    default: return null;
  }
};

export const TransactionTable = ({ details, onOpenVoucher, onToggleReviewed }: TransactionTableProps) => {
  const navigate = useNavigate();

  if (details.length === 0) {
    return (
      <div className="flex-1 bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center py-16">
        <div className="text-center">
          <BarChart3Icon className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-medium">Välj ett konto för att se transaktioner</p>
          <p className="text-xs text-slate-300 dark:text-slate-500 mt-1">Klicka på ett konto i listan till vänster</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="max-h-[calc(100vh-420px)] overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-800 dark:bg-slate-900 text-white">
              <th className="w-8 px-3 py-3" />
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider w-24">Datum</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider w-16">Ver.nr</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Beskrivning</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider w-32">Motkonto</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-wider w-28">Debet</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-wider w-28">Kredit</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-wider w-32">Saldo</th>
              <th className="w-16 px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {details.map(row => {
              // Virtual row styles
              if (row.isVirtualRow) {
                const isOpening = row.virtualRowType === 'opening';
                return (
                  <tr
                    key={row.id}
                    className={`border-b-2 ${isOpening
                      ? 'bg-[#EFF6FF] dark:bg-indigo-900/20 border-b-indigo-200 dark:border-b-indigo-700'
                      : 'bg-slate-100 dark:bg-slate-700/40 border-t-2 border-t-slate-300 dark:border-t-slate-600 border-b-slate-300 dark:border-b-slate-600'
                    }`}
                  >
                    <td className="px-3 py-3" />
                    <td className="px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                      {row.entry_date ? format(new Date(row.entry_date), 'dd MMM yyyy', { locale: sv }) : ''}
                    </td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200" colSpan={2}>
                      {row.description}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold tabular-nums text-slate-500">
                      {!isOpening && row.debit > 0 ? formatSEK(row.debit) : ''}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold tabular-nums text-slate-500">
                      {!isOpening && row.credit > 0 ? formatSEK(row.credit) : ''}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatSEK(row.runningBalance)}
                    </td>
                    <td className="px-3 py-3" />
                  </tr>
                );
              }

              return (
                <tr
                  key={row.id}
                  className={`group border-b border-slate-100 dark:border-slate-700/50 transition-colors cursor-pointer
                    ${row.anomalyType ? 'bg-amber-50/50 dark:bg-amber-900/10' : row.isAccrualOutsidePeriod ? 'bg-violet-50/40 dark:bg-violet-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                  onClick={() => onOpenVoucher(row)}
                >
                  <td className="px-3 py-2.5 text-center w-8">
                    {row.anomalyType === 'size' && <span title={row.anomalyReason} className="cursor-help">🔴</span>}
                    {row.anomalyType === 'newCombo' && <span title={row.anomalyReason} className="cursor-help">🟡</span>}
                    {row.anomalyType === 'duplicate' && <span title={row.anomalyReason} className="cursor-help">🔵</span>}
                    {row.anomalyType === 'missingDoc' && <span title={row.anomalyReason} className="cursor-help">📎</span>}
                  </td>

                  <td className="px-4 py-2.5 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {row.entry_date ? format(new Date(row.entry_date), 'dd MMM', { locale: sv }) : '—'}
                  </td>

                  <td className="px-4 py-2.5">
                    <button
                      className="text-sm text-indigo-600 dark:text-indigo-400 font-mono hover:underline"
                      onClick={e => { e.stopPropagation(); navigate(`/verifications?entry=${row.journal_entry_id}`); }}
                    >
                      #{row.journal_number}
                    </button>
                  </td>

                  <td className="px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 max-w-[280px] truncate" title={row.description}>
                    <span className="flex items-center gap-1.5">
                      {creatorIcon(row.createdBy)}
                      {row.description}
                      {row.documentAttached && <span title="Underlag bifogat"><FileText className="w-3 h-3 text-[#1D9E75] flex-shrink-0" /></span>}
                      {row.isAccrualOutsidePeriod && (
                        <span
                          title={`Bokförd i perioden men verifikationsdatum ${row.entry_date} ligger utanför${row.bookedAt ? ` (registrerad ${format(new Date(row.bookedAt), 'dd MMM yyyy', { locale: sv })})` : ''}`}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-100 text-violet-700 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700 flex-shrink-0"
                        >
                          Periodisering
                        </span>
                      )}
                    </span>
                  </td>

                  <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                    {row.counterAccounts.length > 0 ? (
                      <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded font-mono">
                        {row.counterAccounts.join(', ')}
                      </span>
                    ) : '—'}
                  </td>

                  <td className="px-4 py-2.5 text-sm text-right text-[#085041] dark:text-[#1D9E75] font-semibold tabular-nums">
                    {row.debit > 0 ? formatSEK(row.debit) : ''}
                  </td>

                  <td className="px-4 py-2.5 text-sm text-right text-[#7A1A1A] dark:text-[#C73838] font-semibold tabular-nums">
                    {row.credit > 0 ? formatSEK(row.credit) : ''}
                  </td>

                  <td className="px-4 py-2.5 text-sm text-right font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                    {formatSEK(row.runningBalance)}
                  </td>

                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={e => { e.stopPropagation(); onOpenVoucher(row); }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-[#EFF6FF] text-[#3b82f6] hover:bg-[#EFF6FF] border border-[#C8DDF5] transition-colors"
                        title="Redigera verifikation"
                      >
                        <Pencil className="w-3 h-3" /> Redigera
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); onToggleReviewed(row.id); }}
                        className={`p-1 rounded-md transition-colors border ${
                          row.reviewed
                            ? 'bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                        title={row.reviewed ? 'Granskad' : 'Markera som granskad'}
                      >
                        {row.reviewed ? '✓' : '○'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Simple icon component for empty state
const BarChart3Icon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 16v-3m4 3V9m4 7v-5m4 5V5" />
  </svg>
);
