import { Search, X, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  classFilter: string;
  onClassFilterChange: (v: string) => void;
  typeFilter: string;
  onTypeFilterChange: (v: string) => void;
  vatFilter: string;
  onVatFilterChange: (v: string) => void;
  showInactive: boolean;
  onShowInactiveChange: (v: boolean) => void;
  filteredCount: number;
  totalCount: number;
}

const CLASS_PILLS = [
  { label: "Alla", value: "all" },
  { label: "1 Tillgångar", value: "1" },
  { label: "2 Skulder & EK", value: "2" },
  { label: "3 Intäkter", value: "3" },
  { label: "4–7 Kostnader", value: "4" },
  { label: "8 Finans", value: "8" },
];

const SMART_FILTERS = [
  { label: "Oanvända", key: "unused" },
  { label: "Hög aktivitet", key: "high" },
  { label: "Momskritiska", key: "vatcrit" },
];

export function AccountFilterToolbar({
  search, onSearchChange, classFilter, onClassFilterChange,
  typeFilter, onTypeFilterChange, vatFilter, onVatFilterChange,
  showInactive, onShowInactiveChange, filteredCount, totalCount,
}: Props) {
  return (
    <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-8 py-3 flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Sök konto, nummer eller namn…"
          className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/20 focus:border-[#3b82f6] transition-all"
        />
        {search && (
          <button onClick={() => onSearchChange("")} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Class pills */}
      <div className="flex gap-1">
        {CLASS_PILLS.map(cls => (
          <button
            key={cls.value}
            onClick={() => onClassFilterChange(cls.value)}
            className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
              classFilter === cls.value
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-200 text-slate-500 hover:border-slate-400"
            }`}
          >
            {cls.label}
          </button>
        ))}
      </div>

      {/* Smart filter chips */}
      <div className="flex gap-1 items-center">
        <Zap className="w-3.5 h-3.5 text-[#3b82f6] mr-0.5" />
        {SMART_FILTERS.map(sf => (
          <button
            key={sf.key}
            onClick={() => {
              if (sf.key === "unused") {
                onShowInactiveChange(true);
                onTypeFilterChange("all");
                onVatFilterChange("all");
              } else if (sf.key === "high") {
                onShowInactiveChange(false);
                onVatFilterChange("25");
              } else if (sf.key === "vatcrit") {
                onVatFilterChange("without");
              }
            }}
            className="text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-all bg-white border border-[#C8DDF5] text-[#3b82f6] hover:bg-[#EFF6FF] hover:border-[#3b82f6]"
          >
            {sf.label}
          </button>
        ))}
      </div>

      {/* Type filter */}
      <select
        value={typeFilter}
        onChange={e => onTypeFilterChange(e.target.value)}
        className="text-sm px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 focus:ring-2 focus:ring-[#3b82f6]/20 cursor-pointer"
      >
        <option value="all">Alla typer</option>
        <option value="asset">Tillgång</option>
        <option value="liability">Skuld</option>
        <option value="income">Intäkt</option>
        <option value="expense">Kostnad</option>
        <option value="equity">Eget kapital</option>
      </select>

      {/* VAT filter */}
      <select
        value={vatFilter}
        onChange={e => onVatFilterChange(e.target.value)}
        className="text-sm px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 focus:ring-2 focus:ring-[#3b82f6]/20 cursor-pointer"
      >
        <option value="all">Alla momsinställningar</option>
        <option value="with">Med momskod</option>
        <option value="without">Utan momskod</option>
        <option value="25">25%</option>
        <option value="12">12%</option>
        <option value="6">6%</option>
      </select>

      {/* Inactive toggle */}
      <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer ml-1">
        <Switch checked={showInactive} onCheckedChange={onShowInactiveChange} />
        <span className="whitespace-nowrap">Visa inaktiva</span>
      </label>

      {/* Result count */}
      <span className="text-xs text-slate-400 ml-auto whitespace-nowrap">
        Visar {filteredCount} av {totalCount} konton
        {search && <span className="text-[#3b82f6] ml-1">— "{search}"</span>}
      </span>
    </div>
  );
}
