import { AlertCircle, Check, Circle, Edit3 } from "lucide-react";

export interface DocPart {
  id: string;
  title: string;
  completion: number; // 0–100
  attention?: boolean;
  lastEditedBy?: string;
  lastEditedAt?: string;
  disabled?: boolean;
  disabledReason?: string;
  onEdit?: () => void;
}

export function DocumentPartsGrid({ parts }: { parts: DocPart[] }) {
  return (
    <div className="space-y-2">
      <h2 className="text-base font-semibold text-[#0F172A]">Dokumentdelar</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
        {parts.map(p => {
          const Icon = p.completion === 100 ? Check : p.attention ? AlertCircle : Circle;
          const iconColor = p.completion === 100 ? "text-[#1D9E75]" : p.attention ? "text-[#EF9F27]" : "text-[#CBD5E1]";
          return (
            <div
              key={p.id}
              className={`bg-white rounded-[12px] p-[14px] ${p.disabled ? "opacity-50" : "hover:shadow-sm transition-shadow"}`}
              style={{ border: "0.5px solid #E2E8F0" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
                  <p className="font-medium text-sm text-[#0F172A] truncate">{p.title}</p>
                </div>
                <span className="text-[11px] text-[#64748B] tabular-nums shrink-0">{p.completion}%</span>
              </div>

              <div className="mt-2 h-1 rounded-full bg-[#F1F5F9] overflow-hidden">
                <div
                  className={`h-full rounded-full ${p.completion === 100 ? "bg-[#1D9E75]" : p.attention ? "bg-[#EF9F27]" : "bg-[#0B4F6C]"}`}
                  style={{ width: `${p.completion}%` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between">
                <p className="text-[10px] text-[#94A3B8] truncate">
                  {p.disabled ? (p.disabledReason ?? "Ej tillgängligt") :
                   p.lastEditedBy ? `${p.lastEditedBy}, ${p.lastEditedAt ?? ""}` : "Ingen redigering än"}
                </p>
                {!p.disabled && (
                  <button
                    onClick={p.onEdit}
                    className="text-[11px] text-[#0B4F6C] hover:underline flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" /> Redigera
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
