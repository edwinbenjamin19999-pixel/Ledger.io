import { Pencil, MoreHorizontal, BarChart3 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import type { Account } from "./useChartOfAccounts";
import { ACCOUNT_TYPE_LABELS } from "./useChartOfAccounts";

interface Props {
  account: Account;
  classColor: string;
  search: string;
  onEdit: () => void;
  onToggle: () => void;
}

const TYPE_STYLES: Record<string, string> = {
  asset: "bg-[#EFF6FF] text-blue-700",
  liability: "bg-[#FCE8E8] text-[#7A1A1A]",
  income: "bg-[#E1F5EE] text-[#085041]",
  expense: "bg-[#FAEEDA] text-[#7A5417]",
  equity: "bg-[#F1F5F9] text-violet-700",
};

const LEFT_BORDER: Record<string, string> = {
  asset: "border-l-blue-400",
  liability: "border-l-rose-400",
  income: "border-l-emerald-400",
  expense: "border-l-amber-400",
  equity: "border-l-violet-400",
};

const NUM_BADGE: Record<string, string> = {
  blue: "bg-[#EFF6FF] text-blue-700",
  violet: "bg-[#F1F5F9] text-violet-700",
  emerald: "bg-[#E1F5EE] text-[#085041]",
  amber: "bg-[#FAEEDA] text-[#7A5417]",
  orange: "bg-orange-50 text-orange-700",
  rose: "bg-[#FCE8E8] text-[#7A1A1A]",
  pink: "bg-pink-50 text-pink-700",
  slate: "bg-slate-100 text-slate-700",
};

const VAT_STYLES: Record<string, string> = {
  "25": "bg-[#FAEEDA] text-[#7A5417]",
  "12": "bg-orange-50 text-orange-700",
  "6": "bg-[#FAEEDA] text-[#7A5417]",
  "0": "bg-slate-100 text-slate-500",
};

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[#EFF6FF] text-indigo-800 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function AccountRow({ account, classColor, search, onEdit, onToggle }: Props) {
  const navigate = useNavigate();
  const typeLabel = ACCOUNT_TYPE_LABELS[account.account_type] || account.account_type;
  const typeStyle = TYPE_STYLES[account.account_type] || "bg-slate-100 text-slate-500";
  const borderColor = LEFT_BORDER[account.account_type] || "border-l-slate-300";
  const badgeStyle = NUM_BADGE[classColor] || "bg-slate-100 text-slate-700";

  return (
    <tr className={`group border-b border-slate-100 border-l-[3px] ${borderColor} hover:bg-gradient-to-r hover:from-slate-50/80 hover:to-transparent transition-all duration-150`}>
      <td className="px-6 py-5 w-24">
        <span className={`font-mono font-bold text-sm px-2.5 py-1 rounded-lg inline-block ${badgeStyle}`}>
          {highlightMatch(account.account_number, search)}
        </span>
      </td>
      <td className="px-4 py-5">
        <div>
          <p className="text-sm font-medium text-slate-900 leading-tight">
            {highlightMatch(account.account_name, search)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {typeLabel}
            <span className="ml-1.5 text-slate-300">BAS 2026</span>
          </p>
        </div>
      </td>
      <td className="px-4 py-5 w-32">
        <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${typeStyle}`}>
          {typeLabel}
        </span>
      </td>
      <td className="px-4 py-5 w-24 text-center">
        {account.vat_code ? (
          <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${VAT_STYLES[account.vat_code] || "bg-slate-100 text-slate-500"}`}>
            {account.vat_code === "0" ? "Momsfri" : `${account.vat_code}%`}
          </span>
        ) : (
          <span className="text-slate-300 text-sm">—</span>
        )}
      </td>
      <td className="px-4 py-5 w-28 text-center">
        <div className="flex items-center justify-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${account.is_active ? "bg-emerald-400" : "bg-slate-300"}`} />
          <span className={`text-xs font-medium ${account.is_active ? "text-[#085041]" : "text-slate-400"}`}>
            {account.is_active ? "Aktiv" : "Inaktiv"}
          </span>
          <Switch checked={account.is_active} onCheckedChange={onToggle} className="ml-1 scale-75" />
        </div>
      </td>
      <td className="px-6 py-5 w-28 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="Redigera">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => navigate('/account-analysis')} className="p-1.5 rounded-lg text-slate-400 hover:text-[#3b82f6] hover:bg-[#EFF6FF] transition-colors" title="Analysera">
            <BarChart3 className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="Fler alternativ">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
