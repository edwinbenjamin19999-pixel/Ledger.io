import { Sparkles, Camera, ArrowRight, MessageSquare, Upload, TrendingUp, Zap, FileText, CheckSquare, Landmark } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const AIBookkeepHero = () => {
  const navigate = useNavigate();

  const quickActions = [
    { icon: Upload, label: "Ladda upp", desc: "AI analyserar", path: "/accounting", iconColor: "text-[hsl(var(--brand-primary))]" },
    { icon: Zap, label: "Automatisering", desc: "AGI & moms", path: "/automation", iconColor: "text-violet-600" },
    { icon: FileText, label: "Skapa faktura", desc: "Enkelt med mallar", path: "/invoices", iconColor: "text-[#085041]" },
    { icon: TrendingUp, label: "Rapporter", desc: "Real-time insikter", path: "/reports", iconColor: "text-[#7A1A1A]" },
  ];

  const featurePills = [
    { icon: MessageSquare, label: "Skriv naturligt" },
    { icon: Camera, label: "Fota kvitton" },
    { icon: CheckSquare, label: "Automatiska verifikat" },
  ];

  const actionChips = [
    { icon: Camera, label: "Fota kvitto" },
    { icon: CheckSquare, label: "Automatiska verifikat" },
    { icon: Landmark, label: "Importera bank" },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-violet-100 dark:border-violet-900/50 overflow-hidden">
      {/* ── Gradient hero band ── */}
      <div className="bg-[#0F1F3D] px-6 py-5 relative overflow-hidden">
        {/* Decorative orbs */}
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-4 left-1/3 w-24 h-24 rounded-full blur-xl pointer-events-none" style={{ background: "hsl(var(--brand-primary) / 0.18)" }} />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-200 flex-shrink-0" />
              <h2 className="text-white font-black text-2xl">AI Bokföring</h2>
            </div>
            <p className="text-violet-200 text-sm mt-1">
              Berätta vad du köpt — AI:n bokför automatiskt
            </p>
          </div>

          <button
            onClick={() => navigate("/bookkeep")}
            className="bg-white text-violet-700 font-bold rounded-2xl px-6 py-3 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center gap-2 flex-shrink-0"
          >
            <Sparkles className="w-4 h-4 text-violet-500" />
            Börja bokföra
          </button>
        </div>

        {/* Feature pills */}
        <div className="relative z-10 mt-4 flex gap-2 flex-wrap">
          {featurePills.map(pill => (
            <button
              key={pill.label}
              onClick={() => navigate("/bookkeep")}
              className="bg-white/[0.15] border border-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full px-3 py-1.5 hover:bg-white/25 transition cursor-pointer flex items-center gap-1.5"
            >
              <pill.icon className="w-3.5 h-3.5" />
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── White input section ── */}
      <div className="px-6 py-5">
        <textarea
          placeholder="Ex: Köpte kontorsmaterial för 450 kr på Staples..."
          className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-slate-800 dark:text-slate-200 text-sm placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:border-violet-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-900/30 transition-all min-h-[90px] resize-none"
          onFocus={() => navigate("/bookkeep")}
        />

        {/* Action row */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-2 flex-wrap">
            {actionChips.map(chip => (
              <button
                key={chip.label}
                onClick={() => navigate("/bookkeep")}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium hover:border-violet-300 hover:text-violet-600 dark:hover:border-violet-600 dark:hover:text-[#1E3A5F] transition cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <chip.icon className="w-3.5 h-3.5" />
                {chip.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => navigate("/bookkeep")}
            className="bg-[#0F1F3D] w-11 h-11 rounded-2xl flex items-center justify-center shadow-md shadow-violet-200 dark:shadow-violet-900/50 hover:shadow-lg hover:shadow-violet-300 dark:hover:shadow-violet-800/50 hover:scale-110 transition-all duration-200 flex-shrink-0"
          >
            <ArrowRight className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Bottom quick-links grid */}
        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100 dark:divide-slate-700 border-t border-slate-100 dark:border-slate-700 -mx-6 px-0">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => navigate(action.path)}
              className="py-4 flex flex-col items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <action.icon className={`w-5 h-5 ${action.iconColor}`} />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{action.label}</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">{action.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
