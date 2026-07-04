import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OnboardingDraft } from "@/hooks/useOnboardingDraft";
import { toast } from "sonner";

interface Props {
  draft: OnboardingDraft;
  onLaunch: () => void;
  loading: boolean;
  launched: boolean;
  loginUrl: string;
}

export function Step4GoLive({ draft, onLaunch, loading, launched, loginUrl }: Props) {
  const [copied, setCopied] = useState(false);
  const enabledModules = Object.entries(draft.modules).filter(([, v]) => v).length;

  const copy = async () => {
    await navigator.clipboard.writeText(loginUrl);
    setCopied(true);
    toast.success("Adress kopierad");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="max-w-xl mx-auto text-center space-y-8 py-8">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col items-center gap-5"
      >
        {draft.logo_url ? (
          <div className="h-20 w-20 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden">
            <img src={draft.logo_url} alt={draft.name} className="max-h-16 max-w-16 object-contain" />
          </div>
        ) : (
          <div
            className="h-20 w-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg"
            style={{ background: `linear-gradient(135deg, ${draft.primary_color}, ${draft.primary_color}dd)` }}
          >
            {(draft.name || "X").substring(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight tracking-tight">
            {launched ? `${draft.name} är live` : `${draft.name || "Din plattform"} är redo`}
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            {launched
              ? "Din egen ekonomiplattform finns nu på din unika adress."
              : "Din plattform är konfigurerad och redo att lanseras."}
          </p>
        </div>
      </motion.div>

      {/* URL card */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center gap-3 shadow-sm">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center"
          style={{ background: `${draft.primary_color}14`, color: draft.primary_color }}
        >
          <ExternalLink className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Din login-adress
          </div>
          <div className="text-sm font-mono text-slate-900 truncate">{loginUrl}</div>
        </div>
        <button
          onClick={copy}
          className="h-9 w-9 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-colors"
          aria-label="Kopiera"
        >
          {copied ? <Check className="h-4 w-4 text-[#085041]" /> : <Copy className="h-4 w-4 text-slate-500" />}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 text-left">
        <div className="rounded-xl bg-white border border-slate-100 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Brand</div>
          <div className="text-xs font-semibold text-slate-900 mt-1 flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: draft.primary_color }}
            />
            {draft.name || "—"}
          </div>
        </div>
        <div className="rounded-xl bg-white border border-slate-100 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Moduler</div>
          <div className="text-xs font-semibold text-slate-900 mt-1">{enabledModules} aktiva</div>
        </div>
        <div className="rounded-xl bg-white border border-slate-100 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">AI</div>
          <div className="text-xs font-semibold text-slate-900 mt-1 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-[#3b82f6]" />
            {draft.ai_name || "AI Ekonom"}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2.5">
        {!launched ? (
          <Button
            size="lg"
            onClick={onLaunch}
            disabled={loading}
            className="w-full h-12 bg-[#3b82f6] hover:bg-[#3b82f6] text-white font-semibold shadow-[0_4px_24px_rgba(0,82,255,0.3)]"
          >
            {loading ? "Skapar din plattform..." : "Lansera min plattform"}
          </Button>
        ) : (
          <>
            <Button
              size="lg"
              asChild
              className="w-full h-12 bg-[#3b82f6] hover:bg-[#3b82f6] text-white font-semibold shadow-[0_4px_24px_rgba(0,82,255,0.3)]"
            >
              <a href={loginUrl} target="_blank" rel="noopener noreferrer">
                Gå till min plattform <ExternalLink className="h-4 w-4 ml-1.5" />
              </a>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              asChild
              className="w-full h-11 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            >
              <a href={`/wl/${draft.slug}/login`}>Öppna White Label login</a>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
