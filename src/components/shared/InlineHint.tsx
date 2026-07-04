// Inline guidance system — proactive, contextual hints
// Rules:
// - Soft blue-tinted banner adjacent to the field/action
// - One sentence, one action, dismissible
// - Only ONE hint per view at a time (HintScope)
// - Dismissals remembered per-user per-hint via localStorage
// - Hints disappear automatically when their condition resolves

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "inline-hints:dismissed";

const readDismissed = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};
const writeDismissed = (d: Record<string, number>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch {
    // ignore
  }
};

// ─── Scope: enforces "max one hint per view" ───
interface HintScopeValue {
  active: string | null;
  request: (id: string, priority: number) => boolean; // returns whether this hint can show
  release: (id: string) => void;
}
const HintScopeCtx = createContext<HintScopeValue | null>(null);

export const HintScope = ({ children }: { children: ReactNode }) => {
  const [active, setActive] = useState<string | null>(null);
  const [activePrio, setActivePrio] = useState<number>(-1);

  const value = useMemo<HintScopeValue>(
    () => ({
      active,
      request: (id, prio) => {
        if (active === id) return true;
        if (active === null || prio > activePrio) {
          setActive(id);
          setActivePrio(prio);
          return true;
        }
        return false;
      },
      release: (id) => {
        if (active === id) {
          setActive(null);
          setActivePrio(-1);
        }
      },
    }),
    [active, activePrio]
  );

  return <HintScopeCtx.Provider value={value}>{children}</HintScopeCtx.Provider>;
};

// ─── Hint component ───
export interface InlineHintProps {
  id: string;                    // stable id for dismissal memory
  when: boolean;                 // condition — auto-hides when false
  message: string;               // one sentence
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  priority?: number;             // higher wins when multiple compete (default 0)
  tone?: "info" | "warning";     // info = blue (default), warning = amber
  className?: string;
}

export const InlineHint = ({
  id,
  when,
  message,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  priority = 0,
  tone = "info",
  className,
}: InlineHintProps) => {
  const scope = useContext(HintScopeCtx);
  const [dismissed, setDismissed] = useState<boolean>(() => !!readDismissed()[id]);
  const [allowed, setAllowed] = useState(false);

  const shouldRender = when && !dismissed;

  useEffect(() => {
    if (!scope) {
      setAllowed(shouldRender);
      return;
    }
    if (shouldRender) {
      setAllowed(scope.request(id, priority));
    } else {
      scope.release(id);
      setAllowed(false);
    }
    return () => scope.release(id);
  }, [shouldRender, scope, id, priority]);

  if (!shouldRender || !allowed) return null;

  const handleDismiss = () => {
    const d = readDismissed();
    d[id] = Date.now();
    writeDismissed(d);
    setDismissed(true);
  };

  const toneCls =
    tone === "warning"
      ? "border-amber-500/30 bg-amber-500/5"
      : "border-[#3b82f6]/30 bg-[#3b82f6]/5";
  const iconCls = tone === "warning" ? "text-amber-500" : "text-[#3b82f6]";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
        toneCls,
        className
      )}
    >
      <Sparkles className={cn("w-3.5 h-3.5 shrink-0", iconCls)} />
      <span className="flex-1 text-foreground leading-snug">{message}</span>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="shrink-0 h-7 px-2.5 rounded-md bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white font-medium transition-colors"
        >
          {actionLabel}
        </button>
      )}
      {secondaryLabel && onSecondary && (
        <button
          onClick={onSecondary}
          className="shrink-0 h-7 px-2.5 rounded-md border border-border hover:bg-accent text-foreground font-medium transition-colors"
        >
          {secondaryLabel}
        </button>
      )}
      <button
        onClick={handleDismiss}
        aria-label="Dölj tips"
        className="shrink-0 h-6 w-6 rounded-md hover:bg-foreground/5 flex items-center justify-center text-muted-foreground"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

// Reset a single hint's dismissed state (rarely needed)
export const resetInlineHint = (id: string) => {
  const d = readDismissed();
  delete d[id];
  writeDismissed(d);
};
