import { X } from "lucide-react";
import { INDUSTRY_TEMPLATES } from "./useChartOfAccounts";

interface Props {
  open: boolean;
  saving: boolean;
  onApply: (key: string) => void;
  onClose: () => void;
}

export function IndustryTemplatesModal({ open, saving, onApply, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-2xl p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Branschmallar</h2>
            <p className="text-sm text-slate-400 mt-1">Aktivera konton anpassade för din verksamhetstyp.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {INDUSTRY_TEMPLATES.map(tmpl => (
            <div
              key={tmpl.key}
              className="p-4 rounded-xl border border-slate-200 hover:border-slate-400 hover:shadow-sm transition-all cursor-pointer group"
            >
              <span className="text-2xl mb-3 block">{tmpl.icon}</span>
              <p className="font-semibold text-slate-900 text-sm">{tmpl.name}</p>
              <p className="text-xs text-slate-400 mt-1 mb-3 leading-relaxed">{tmpl.desc}</p>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">{tmpl.count} konton</span>
                <button
                  onClick={() => onApply(tmpl.key)}
                  disabled={saving}
                  className="text-xs text-slate-500 font-medium group-hover:text-slate-900 transition-colors disabled:opacity-50"
                >
                  Tillämpa →
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 text-center mt-5">
          Mallar aktiverar rekommenderade konton utan att ta bort befintliga.
        </p>
      </div>
    </div>
  );
}
