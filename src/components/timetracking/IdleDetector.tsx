import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pause } from "lucide-react";
import { formatHours } from "@/hooks/useTimeTracking";

const IDLE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

interface Props { isRunning: boolean;
  seconds: number;
  onStop: (adjustedMinutes?: number) => void;
  onContinue: () => void;
}

export function IdleDetector({ isRunning, seconds, onStop, onContinue }: Props) { const [showDialog, setShowDialog] = useState(false);
  const [idleMinutes, setIdleMinutes] = useState(0);
  const [manualMinutes, setManualMinutes] = useState("");
  const lastActivityRef = useRef(Date.now());
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleActivity = useCallback(() => { lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => { if (!isRunning) { setShowDialog(false);
      return;
    }

    const events = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"];
    events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));

    checkIntervalRef.current = setInterval(() => { const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs >= IDLE_THRESHOLD_MS && !showDialog) { setIdleMinutes(Math.round(idleMs / 60000));
        setShowDialog(true);
      }
    }, 30000); // check every 30s

    return () => { events.forEach((e) => window.removeEventListener(e, handleActivity));
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [isRunning, handleActivity, showDialog]);

  const activeMinutes = Math.max(1, Math.round((seconds / 60) - idleMinutes));

  const handleStop = () => { setShowDialog(false);
    onStop(activeMinutes);
  };

  const handleContinue = () => { setShowDialog(false);
    lastActivityRef.current = Date.now();
    onContinue();
  };

  const handleManual = () => { const mins = parseInt(manualMinutes);
    if (mins > 0) { setShowDialog(false);
      onStop(mins);
    }
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pause className="h-5 w-5 text-orange-500" />
            Du verkar ha pausat
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ingen aktivitet de senaste {idleMinutes} minuterna. Vad vill du göra?
          </p>

          <div className="space-y-2">
            <Button
              onClick={handleStop}
              className="w-full justify-start bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white"
            >
              Stoppa timern — logga {activeMinutes} min
            </Button>
            <Button onClick={handleContinue} variant="outline" className="w-full justify-start">
              Fortsätt — räkna från pausen
            </Button>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Minuter"
                value={manualMinutes}
                onChange={(e) => setManualMinutes(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleManual} variant="outline" disabled={!manualMinutes}>
                Justera manuellt
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
