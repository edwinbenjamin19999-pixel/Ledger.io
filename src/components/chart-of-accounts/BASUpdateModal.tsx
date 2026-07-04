import { RefreshCw, X } from "lucide-react";

interface Props {
  open: boolean;
  saving: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function BASUpdateModal({ open, saving, onConfirm, onClose }: Props) {
  if (!open) return null;

  const items = [
    { icon: "✓", text: "Egna konton bevaras", color: "text-[#085041]" },
    { icon: "✓", text: "Befintliga inställningar bevaras", color: "text-[#085041]" },
    { icon: "↻", text: "Inaktiva BAS-konton aktiveras", color: "text-[#7A5417]" },
    { icon: "＋", text: "Nya BAS 2026-konton läggs till", color: "text-blue-500" },
  ];

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6">
        <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center mb-5">
          <RefreshCw className="w-5 h-5 text-slate-600" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Uppdatera BAS 2026</h2>
        <p className="text-sm text-slate-500 leading-relaxed mb-5">
          Kontoplanen uppdateras med senaste BAS 2026-strukturen. Befintliga egna konton och kontoinställningar påverkas inte.
        </p>
        <div className="space-y-2 mb-6">
          {items.map(item => (
            <div key={item.text} className="flex items-center gap-3 text-sm">
              <span className={`${item.color} font-bold w-4`}>{item.icon}</span>
              <span className="text-slate-600">{item.text}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
            Avbryt
          </button>
          <button onClick={onConfirm} disabled={saving} className="flex-grow py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50">
            {saving ? "Uppdaterar…" : "Uppdatera BAS"}
          </button>
        </div>
      </div>
    </div>
  );
}
