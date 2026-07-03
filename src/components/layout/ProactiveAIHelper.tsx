import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { getModuleContext } from "@/config/moduleContexts";
import { Sparkles, X, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Page-specific proactive nudges ─── */
const PAGE_NUDGES: Record<string, { message: string; delay: number }> = { "/dashboard": { message: "Vill du att jag sammanfattar veckans ekonomi?",
    delay: 8000,
  },
  "/verifications": { message: "Behöver du hjälp att bokföra? Ladda upp ett kvitto eller en faktura så konterar jag den.",
    delay: 6000,
  },
  "/bokföring": { message: "Jag kan hjälpa dig kontera — beskriv transaktionen eller ladda upp underlaget.",
    delay: 8000,
  },
  "/fakturering": { message: "Vill du skapa en ny faktura? Berätta vad den ska innehålla.",
    delay: 8000,
  },
  "/rapporter": { message: "Jag kan förklara siffrorna i dina rapporter — fråga gärna.",
    delay: 10000,
  },
  "/bank": { message: "Behöver du hjälp att matcha banktransaktioner mot bokföringen?",
    delay: 8000,
  },
  "/loner": { message: "Behöver du hjälp med lönekörning eller arbetsgivaravgifter?",
    delay: 8000,
  },
  "/moms": { message: "Jag kan hjälpa dig förbereda momsdeklarationen.",
    delay: 8000,
  },
};

/* ─── Idle nudge config ─── */
const IDLE_TIMEOUT_MS = 45_000; // 45 seconds of inactivity
const IDLE_MESSAGE = "Det ser ut som att du funderar — behöver du hjälp med något? Skriv vad som helst så försöker jag hjälpa.";

const SEEN_KEY_PREFIX = "northledger_nudge_seen_";

export const ProactiveAIHelper = () => { const location = useLocation();
  const [nudge, setNudge] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPathRef = useRef(location.pathname);

  // Reset on route change
  useEffect(() => { currentPathRef.current = location.pathname;
    setNudge(null);
    setVisible(false);
    setDismissed(false);
  }, [location.pathname]);

  // Page-specific welcome nudge (shown once per session per page)
  useEffect(() => { if (dismissed) return;
    const path = location.pathname;
    const seenKey = SEEN_KEY_PREFIX + path;

    // Find matching nudge
    const matchedKey = Object.keys(PAGE_NUDGES).find((k) => path.startsWith(k));
    if (!matchedKey) return;

    // Only show once per session per page
    if (sessionStorage.getItem(seenKey)) return;

    const config = PAGE_NUDGES[matchedKey];
    nudgeTimerRef.current = setTimeout(() => { if (currentPathRef.current !== path) return;
      sessionStorage.setItem(seenKey, "1");
      setNudge(config.message);
      setVisible(true);

      // Auto-hide after 12s
      setTimeout(() => { setVisible(false);
      }, 12000);
    }, config.delay);

    return () => { if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    };
  }, [location.pathname, dismissed]);

  // Idle detection
  const resetIdleTimer = useCallback(() => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (dismissed) return;

    idleTimerRef.current = setTimeout(() => { // Only show if no nudge is already showing
      if (!visible) { const seenKey = SEEN_KEY_PREFIX + "idle_" + currentPathRef.current;
        if (sessionStorage.getItem(seenKey)) return;
        sessionStorage.setItem(seenKey, "1");

        setNudge(IDLE_MESSAGE);
        setVisible(true);
        setTimeout(() => setVisible(false), 15000);
      }
    }, IDLE_TIMEOUT_MS);
  }, [dismissed, visible]);

  useEffect(() => { const events = ["mousemove", "keydown", "scroll", "click", "touchstart"];
    const handler = () => resetIdleTimer();

    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetIdleTimer();

    return () => { events.forEach((e) => window.removeEventListener(e, handler));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  const handleDismiss = () => { setVisible(false);
    setDismissed(true);
  };

  const handleOpenAssistant = () => { setVisible(false);
    setDismissed(true);
    // Dispatch a custom event to open the AI assistant
    window.dispatchEvent(new CustomEvent("open-ai-assistant", { detail: { message: nudge } }));
  };

  if (!visible || !nudge) return null;

  return (
    <div
      className={cn(
        "fixed bottom-[84px] right-6 z-50 max-w-[320px]",
        "animate-in fade-in slide-in-from-bottom-3 duration-400"
      )}
    >
      <div className="relative bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
        {/* Accent top bar */}
        <div className="h-0.5 bg-gradient-to-r from-[#3b82f6] to-[#3b82f6]/40" />

        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#3b82f6]/10 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-[#3b82f6]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#3b82f6] mb-1">AI-assistent</p>
              <p className="text-sm text-foreground leading-relaxed">{nudge}</p>
            </div>
            <button
              onClick={handleDismiss}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleOpenAssistant}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-[#3b82f6]/10 text-[#3b82f6] hover:bg-[#3b82f6]/20 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Öppna chatten
          </button>
        </div>
      </div>
    </div>
  );
};
