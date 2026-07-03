import { ShieldCheck } from "lucide-react";
import { BrandDraft } from "@/hooks/useTenantBrandDraft";

interface Props {
  draft: BrandDraft;
  view: "sidebar" | "login";
}

export function LivePreviewPane({ draft, view }: Props) {
  const primary = draft.primary_color;

  if (view === "sidebar") {
    return (
      <div className="rounded-2xl overflow-hidden border bg-slate-900 shadow-lg">
        <div className="flex">
          {/* Mini sidebar */}
          <div className="w-[180px] bg-slate-900 p-3 space-y-2">
            <div className="flex items-center gap-2 px-2 py-2">
              {draft.logo_url ? (
                <img src={draft.logo_url} alt={draft.name} className="h-7 w-7 rounded-md object-contain bg-white/5 p-0.5" />
              ) : (
                <div className="h-7 w-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white" style={{ background: primary }}>
                  {draft.name.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">{draft.name}</div>
                <div className="text-[9px] text-white/50">Workspace</div>
              </div>
            </div>
            {["Dashboard", "Bokföring", "Fakturor", "Rapporter"].map((l, i) => (
              <div key={l} className={`px-3 py-1.5 rounded-lg text-xs ${i === 0 ? "text-white font-medium" : "text-white/60"}`} style={i === 0 ? { background: `${primary}33`, color: primary } : {}}>
                {l}
              </div>
            ))}
          </div>
          {/* Mini content */}
          <div className="flex-1 bg-slate-50 p-4 min-h-[280px]">
            <div className="text-xs font-semibold text-slate-700 mb-3">Hej från {draft.ai_name}</div>
            <div className="space-y-2">
              <div className="h-2 bg-slate-200 rounded w-3/4" />
              <div className="h-2 bg-slate-200 rounded w-1/2" />
              <div className="h-12 rounded-lg mt-3" style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}dd 100%)` }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Login preview
  return (
    <div className="rounded-2xl overflow-hidden border shadow-lg bg-[#F8FAFC]">
      <div className="p-6">
        <div className="bg-white rounded-2xl p-5 space-y-4 max-w-[300px] mx-auto" style={{ border: "1px solid rgba(15,23,42,0.06)", boxShadow: "0 20px 50px rgba(15,23,42,0.08)" }}>
          {draft.logo_url ? (
            <img src={draft.logo_url} alt={draft.name} className="h-8 mx-auto" />
          ) : (
            <div className="text-lg font-bold text-center" style={{ color: primary }}>{draft.name}</div>
          )}
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#0F172A]">{draft.headline}</h3>
            {draft.subheadline && <p className="text-xs text-[#64748B]">{draft.subheadline}</p>}
          </div>
          {draft.show_bankid && (
            <button className="w-full h-10 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-2" style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}dd 100%)` }}>
              <ShieldCheck className="h-4 w-4" /> Logga in med BankID
            </button>
          )}
          {draft.show_password_login && (
            <button className="w-full h-10 rounded-xl text-xs font-semibold border-2 border-[#0F172A] text-[#0F172A] bg-white">
              Logga in med e-post
            </button>
          )}
          {draft.footer_attribution && (
            <p className="text-[9px] text-[#94A3B8] uppercase tracking-wider text-center font-semibold pt-2 border-t border-[#F1F5F9]">
              {draft.footer_attribution}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
