import { useEffect, useState } from "react";
import { X } from "lucide-react";

const SESSION_KEY = "ai-microprompts-shown";
const ACTIVE_KEY = "ai-microprompt-active";

type PromptId = "completed_action" | "low_confidence_override" | string;

function getShown(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
function markShown(id: string) {
  const s = getShown(); s.add(id);
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify([...s]));
}

/** Imperatively trigger a micro-prompt. No-ops if already shown this session
 *  or if another prompt is currently active. */
export function triggerMicroPrompt(id: PromptId) {
  if (typeof window === "undefined") return;
  if (getShown().has(id)) return;
  if (window.sessionStorage.getItem(ACTIVE_KEY)) return;
  window.sessionStorage.setItem(ACTIVE_KEY, id);
  window.dispatchEvent(new CustomEvent("ai-microprompt", { detail: { id } }));
}

const COPY: Record<string, { title: string; body: string }> = {
  completed_action: {
    title: "Hittade du det du behövde?",
    body: "En snabb tumme hjälper mig att förbättra flödet.",
  },
  low_confidence_override: {
    title: "Jag var osäker här",
    body: "Vill du berätta lite mer så lär jag mig snabbare?",
  },
};

export function MicroPromptHost() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (id) setActive(id);
    };
    window.addEventListener("ai-microprompt", onPrompt);
    return () => window.removeEventListener("ai-microprompt", onPrompt);
  }, []);

  const dismiss = () => {
    if (active) markShown(active);
    window.sessionStorage.removeItem(ACTIVE_KEY);
    setActive(null);
  };

  if (!active) return null;
  const c = COPY[active] ?? { title: "Vi vill gärna höra från dig", body: "" };

  return (
    <div className="fixed bottom-6 right-6 z-[60] max-w-sm rounded-2xl border border-slate-200 bg-white shadow-lg p-4 animate-in slide-in-from-bottom-2 fade-in">
      <button
        onClick={dismiss}
        aria-label="Stäng"
        className="absolute top-2.5 right-2.5 h-6 w-6 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 inline-flex items-center justify-center"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <p className="text-[13px] font-semibold text-slate-900 pr-6">{c.title}</p>
      {c.body && <p className="text-[12px] text-slate-600 mt-0.5 leading-snug pr-6">{c.body}</p>}
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={dismiss}
          className="h-7 px-3 text-[11px] font-medium rounded-md bg-[#3b82f6] text-white hover:bg-[#0052FF]"
        >
          Ja, tack
        </button>
        <button
          onClick={dismiss}
          className="h-7 px-3 text-[11px] font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          Inte nu
        </button>
      </div>
    </div>
  );
}
