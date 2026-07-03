import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { ensureSafeBrowserApis,
  installSafariFetchDebugging,
  safariDebugError,
  safariDebugLog,
} from "@/lib/safe-browser";
import { getPreviewDebugState,
  setFirstRenderedComponent,
  setPreviewRenderStep,
} from "@/lib/preview-debug";

// Clean up legacy `dark`/`light` classes that may have been applied by an
// earlier prompt — the project uses the `data-theme` attribute (see useTheme).
try {
  document.documentElement.classList.remove("dark");
  document.documentElement.classList.remove("light");
} catch {
  /* storage unavailable */
}

const rootElement = document.getElementById("root");

if (!rootElement) { throw new Error("Root element #root kunde inte hittas.");
}

const root = createRoot(rootElement);

const renderStartupFallback = (error: Error) => { const debugState = getPreviewDebugState();
  setFirstRenderedComponent("StartupFallback");
  setPreviewRenderStep("Startup fallback rendered");

  root.render(
    <StrictMode>
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="space-y-2">
            <h1 className="text-lg font-semibold">Safari-debug: appen kunde inte starta</h1>
            <p className="text-sm text-muted-foreground">
              Startup stoppades innan första render. Se konsolen för exakt stoppunkt.
            </p>
          </div>
          <pre className="rounded-lg bg-muted p-3 text-xs text-muted-foreground whitespace-pre-wrap break-words overflow-auto">
            {error.message}
          </pre>
          <div className="rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
            <p>iframe mode: {debugState.iframeMode ? "ON" : "OFF"}</p>
            <p>storage mode: {debugState.storageMode}</p>
            <p>auth mode: {debugState.authMode}</p>
            <p>render step: {debugState.renderStep}</p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Ladda om
          </button>
        </div>
      </div>
    </StrictMode>
  );
};

async function loadModules(attempt = 1): Promise<[{ default: React.ComponentType }, { CookieBanner: React.ComponentType }]> { try { const result = await Promise.all([
      import("./App.tsx"),
      import("./components/gdpr/CookieBanner.tsx"),
    ]);
    return result as [{ default: React.ComponentType }, { CookieBanner: React.ComponentType }];
  } catch (err) { if (attempt < 3) { safariDebugLog("1. app start", { phase: "module-retry", attempt });
      await new Promise((r) => setTimeout(r, attempt * 500));
      return loadModules(attempt + 1);
    }
    throw err;
  }
}

async function bootstrap() { safariDebugLog("1. app start");
  setPreviewRenderStep("Bootstrap started");
  ensureSafeBrowserApis();
  installSafariFetchDebugging();

  const [{ default: App }, { CookieBanner }] = await loadModules();

  safariDebugLog("1. app start", { phase: "modules-loaded" });
  setPreviewRenderStep("Root modules loaded");

  root.render(
    <StrictMode>
      <App />
      <CookieBanner />
    </StrictMode>
  );

  setPreviewRenderStep("Root render scheduled");
}

bootstrap().catch((error) => { const startupError = error instanceof Error ? error : new Error(String(error));
  safariDebugError("startup bootstrap failed", startupError);
  renderStartupFallback(startupError);
});
