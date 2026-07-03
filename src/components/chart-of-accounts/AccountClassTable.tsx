import { ChevronDown, Search } from "lucide-react";
import { AccountRow } from "./AccountRow";
import { ACCOUNT_CLASSES, type Account } from "./useChartOfAccounts";

interface Props {
  accounts: Account[];
  loading: boolean;
  search: string;
  expandedClasses: Record<number, boolean>;
  onToggleExpanded: (prefix: number) => void;
  onEdit: (account: Account) => void;
  onToggleActive: (account: Account) => void;
  filteredCount: number;
  totalCount: number;
}

const CLASS_LEFT_COLORS: Record<string, string> = {
  blue: "border-l-blue-400",
  violet: "border-l-violet-400",
  emerald: "border-l-emerald-400",
  amber: "border-l-amber-400",
  orange: "border-l-orange-400",
  rose: "border-l-rose-400",
  pink: "border-l-pink-400",
  slate: "border-l-slate-400",
};

export function AccountClassTable({
  accounts, loading, search, expandedClasses,
  onToggleExpanded, onEdit, onToggleActive, filteredCount, totalCount,
}: Props) {
  if (loading) {
    return (
      <div className="px-8 pb-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-24">Konto</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Benämning</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-32">Typ</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-24">Moms</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-28">Status</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-24">Åtgärder</th>
            </tr></thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="px-6 py-4"><div className="h-4 w-12 bg-slate-200 rounded animate-pulse" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-48 bg-slate-200 rounded animate-pulse" /></td>
                  <td className="px-4 py-4"><div className="h-6 w-20 bg-slate-100 rounded-full animate-pulse" /></td>
                  <td className="px-4 py-4 text-center"><div className="h-6 w-12 bg-slate-100 rounded-full animate-pulse mx-auto" /></td>
                  <td className="px-4 py-4"><div className="h-6 w-20 bg-slate-100 rounded-full animate-pulse mx-auto" /></td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="px-8 pb-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
          <div className="text-center py-16 px-8">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-slate-700 font-medium">Inga konton matchade din sökning</p>
            <p className="text-sm text-slate-400 mt-1">Prova ett annat kontonummer eller namn</p>
          </div>
        </div>
      </div>
    );
  }

  const COLOR_CLASSES: Record<string, string> = {
    blue: "text-blue-600", violet: "text-violet-600", emerald: "text-[#085041]",
    amber: "text-[#7A5417]", orange: "text-orange-600", rose: "text-[#7A1A1A]",
    pink: "text-pink-600", slate: "text-slate-600",
  };

  return (
    <div className="px-8 pb-8">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="sticky top-[52px] z-10">
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-24">Konto</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Benämning</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-32">Typ</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-24">Moms</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-28">Status</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-28">Åtgärder</th>
            </tr>
          </thead>
          {ACCOUNT_CLASSES.map(cls => {
            const classAccounts = accounts.filter(a => {
              const p = parseInt(a.account_number[0]);
              return p === cls.prefix;
            });
            if (classAccounts.length === 0) return null;
            const colorClass = COLOR_CLASSES[cls.color] || "text-slate-600";
            const leftColor = CLASS_LEFT_COLORS[cls.color] || "border-l-slate-300";

            return (
              <tbody key={`class-${cls.prefix}`}>
                  <tr
                    onClick={() => onToggleExpanded(cls.prefix)}
                    className={`cursor-pointer border-t border-slate-200 border-l-[3px] ${leftColor} hover:bg-slate-50/80 transition-colors`}
                  >
                    <td colSpan={6} className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${expandedClasses[cls.prefix] ? "" : "-rotate-90"}`} />
                        <span className={`text-xs font-bold uppercase tracking-widest ${colorClass}`}>
                          {cls.label}
                        </span>
                        <span className="text-xs text-slate-300 font-normal">
                          {classAccounts.length} konton · {classAccounts.filter(a => a.is_active).length} aktiva
                        </span>
                      </div>
                    </td>
                  </tr>
                  {expandedClasses[cls.prefix] && classAccounts.map(account => (
                    <AccountRow
                      key={account.id}
                      account={account}
                      classColor={cls.color}
                      search={search}
                      onEdit={() => onEdit(account)}
                      onToggle={() => onToggleActive(account)}
                    />
                ))}
              </tbody>
            );
          })}
        </table>
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <span className="text-xs text-slate-400">
            Visar {filteredCount} av {totalCount} konton
          </span>
          <button className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
            Exportera lista →
          </button>
        </div>
      </div>
    </div>
  );
}
