import { Search, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ViewMode, TypeFilter } from './types';
import type { Company } from './types';

interface FilterToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  fromDate: Date;
  toDate: Date;
  onFromDateChange: (d: Date) => void;
  onToDateChange: (d: Date) => void;
  typeFilter: TypeFilter;
  onTypeFilterChange: (f: TypeFilter) => void;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  showAnomalies: boolean;
  onToggleAnomalies: () => void;
  anomalyCount: number;
  companies: Company[];
  selectedCompany: string;
  onCompanyChange: (id: string) => void;
}

export const FilterToolbar = ({
  search, onSearchChange,
  fromDate, toDate, onFromDateChange, onToDateChange,
  typeFilter, onTypeFilterChange,
  viewMode, onViewModeChange,
  showAnomalies, onToggleAnomalies,
  anomalyCount,
  companies, selectedCompany, onCompanyChange,
}: FilterToolbarProps) => {
  const typeFilters: TypeFilter[] = ['Alla', 'Fakturor', 'Betalningar', 'Manuella'];
  const viewModes: { key: ViewMode; label: string }[] = [
    { key: 'transactions', label: 'Transaktioner' },
    { key: 'grouped', label: 'Grupperat' },
    { key: 'flow', label: 'Flöde' },
    { key: 'analysis', label: 'Analys' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800/60 rounded-xl px-4 py-3
                    shadow-sm border border-slate-200 dark:border-slate-700">
      {companies.length > 1 && (
        <Select value={selectedCompany} onValueChange={onCompanyChange}>
          <SelectTrigger className="w-40 h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {companies.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <input
          placeholder='Sök transaktion...'
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600
                     text-sm focus:ring-2 focus:ring-[#3b82f6] focus:outline-none
                     bg-slate-50 dark:bg-slate-800"
        />
      </div>

      <div className="flex gap-1.5">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs h-9">
              <Calendar className="w-3.5 h-3.5 mr-1" />
              {format(fromDate, 'dd MMM yyyy', { locale: sv })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <CalendarComponent mode="single" selected={fromDate} onSelect={d => d && onFromDateChange(d)} locale={sv} />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs h-9">
              <Calendar className="w-3.5 h-3.5 mr-1" />
              {format(toDate, 'dd MMM yyyy', { locale: sv })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <CalendarComponent mode="single" selected={toDate} onSelect={d => d && onToDateChange(d)} locale={sv} />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex gap-1.5">
        {typeFilters.map(t => (
          <button
            key={t}
            onClick={() => onTypeFilterChange(t)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              typeFilter === t
                ? 'bg-[#3b82f6] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <button
        onClick={onToggleAnomalies}
        className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors ${
          showAnomalies
            ? 'bg-[#FAEEDA] text-[#7A5417] dark:bg-amber-900/40 dark:text-[#C28A2B]'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
        }`}
      >
        ⚠ Avvikelser
        {anomalyCount > 0 && (
          <span className="bg-amber-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
            {anomalyCount}
          </span>
        )}
      </button>

      <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
        {viewModes.map(m => (
          <button
            key={m.key}
            onClick={() => onViewModeChange(m.key)}
            className={`px-3 py-1.5 text-xs transition-colors ${
              viewMode === m.key
                ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                : 'bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
};
