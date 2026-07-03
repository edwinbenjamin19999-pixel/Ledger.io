import { useEffect, useState } from "react";
import { getPreviewDebugState,
  subscribePreviewDebugState,
  type PreviewDebugState,
} from "@/lib/preview-debug";

export const PreviewDebugPanel = () => { const [debugState, setDebugState] = useState<PreviewDebugState>(getPreviewDebugState());

  useEffect(() => { return subscribePreviewDebugState(setDebugState);
  }, []);

  if (!debugState.iframeMode) { return null;
  }

  return (
    <aside className="fixed bottom-4 left-4 z-[60] w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-border bg-card/95 p-4 shadow-lg backdrop-blur-sm">
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Preview debug
          </p>
          <p className="text-sm font-medium text-foreground">
            Safari iframe-skydd aktivt
          </p>
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">iframe mode</dt>
            <dd className="font-medium text-foreground">{debugState.iframeMode ? "ON" : "OFF"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">storage mode</dt>
            <dd className="font-medium text-foreground">{debugState.storageMode}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">auth mode</dt>
            <dd className="font-medium text-foreground">{debugState.authMode}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-muted-foreground">render step</dt>
            <dd className="font-medium text-foreground break-words">{debugState.renderStep}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-muted-foreground">first component</dt>
            <dd className="font-medium text-foreground break-words">
              {debugState.firstComponent || "waiting"}
            </dd>
          </div>
        </dl>
      </div>
    </aside>
  );
};