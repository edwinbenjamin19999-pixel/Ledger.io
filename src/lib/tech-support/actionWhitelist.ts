/**
 * Whitelist över tillåtna recovery-actions.
 * Detta är ENDA vägen till handling. Allt utanför kastar fel.
 */
import type { ActionResult, RecoveryAction, RecoveryActionId } from "./types";

type Handler = (payload?: Record<string, unknown>) => Promise<ActionResult>;

const SNAPSHOT_PREFIX = "tech-support:snapshot:";

export function saveSnapshot(key: string, state: unknown) {
  try {
    sessionStorage.setItem(
      SNAPSHOT_PREFIX + key,
      JSON.stringify({ ts: Date.now(), state }),
    );
    pruneSnapshots();
  } catch {
    // sessionStorage full / disabled — ignore
  }
}

export function readSnapshot<T = unknown>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(SNAPSHOT_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; state: T };
    if (Date.now() - parsed.ts > 60 * 60 * 1000) {
      sessionStorage.removeItem(SNAPSHOT_PREFIX + key);
      return null;
    }
    return parsed.state;
  } catch {
    return null;
  }
}

function pruneSnapshots() {
  try {
    const keys: { k: string; ts: number }[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (!k || !k.startsWith(SNAPSHOT_PREFIX)) continue;
      const raw = sessionStorage.getItem(k);
      if (!raw) continue;
      try {
        const ts = (JSON.parse(raw) as { ts: number }).ts ?? 0;
        keys.push({ k, ts });
      } catch {
        sessionStorage.removeItem(k);
      }
    }
    keys.sort((a, b) => b.ts - a.ts);
    keys.slice(10).forEach(({ k }) => sessionStorage.removeItem(k));
  } catch {
    /* noop */
  }
}

const handlers: Record<RecoveryActionId, Handler> = {
  retry_request: async (payload) => {
    const fn = payload?.retry as (() => Promise<unknown>) | undefined;
    if (typeof fn !== "function") {
      return { ok: false, message: "Ingen omförsöksfunktion registrerad." };
    }
    try {
      await fn();
      return { ok: true, message: "Anropet lyckades vid omförsök." };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Omförsök misslyckades." };
    }
  },
  refresh_module: async () => {
    window.dispatchEvent(new CustomEvent("tech-support:refresh-module"));
    return { ok: true, message: "Modul-data laddas om." };
  },
  reset_form_state: async (payload) => {
    const formId = payload?.formId as string | undefined;
    window.dispatchEvent(
      new CustomEvent("tech-support:reset-form", { detail: { formId } }),
    );
    return { ok: true, message: "Formulärtillstånd nollställt." };
  },
  restore_last_valid: async (payload) => {
    const key = payload?.snapshotKey as string | undefined;
    if (!key) return { ok: false, message: "Saknar snapshot-nyckel." };
    const snap = readSnapshot(key);
    if (!snap) return { ok: false, message: "Ingen sparad version hittades." };
    window.dispatchEvent(
      new CustomEvent("tech-support:restore-snapshot", { detail: { key, state: snap } }),
    );
    return { ok: true, message: "Senaste giltiga version återställd." };
  },
  reopen_draft: async (payload) => {
    const draftId = payload?.draftId as string | undefined;
    window.dispatchEvent(
      new CustomEvent("tech-support:reopen-draft", { detail: { draftId } }),
    );
    return { ok: true, message: "Utkast återöppnat." };
  },
  clear_ui_state: async () => {
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith("ui-state:")) toRemove.push(k);
      }
      toRemove.forEach((k) => sessionStorage.removeItem(k));
    } catch {
      /* noop */
    }
    window.dispatchEvent(new CustomEvent("tech-support:clear-ui-state"));
    return { ok: true, message: "Tillfälligt UI-tillstånd rensat." };
  },
  revalidate_inputs: async (payload) => {
    const formId = payload?.formId as string | undefined;
    window.dispatchEvent(
      new CustomEvent("tech-support:revalidate", { detail: { formId } }),
    );
    return { ok: true, message: "Indata omvaliderade." };
  },
};

export const ALLOWED_ACTIONS: RecoveryAction[] = [
  {
    id: "retry_request",
    label: "Försök igen",
    description: "Skickar samma anrop på nytt — ingen data ändras.",
    mode: "AUTO",
    reversible: true,
  },
  {
    id: "refresh_module",
    label: "Ladda om modulen",
    description: "Hämtar färsk data från servern.",
    mode: "AUTO",
    reversible: true,
  },
  {
    id: "reset_form_state",
    label: "Nollställ formulär",
    description: "Återställer formuläret till tomt läge — påverkar bara din skärm.",
    mode: "ASSISTED",
    reversible: true,
  },
  {
    id: "restore_last_valid",
    label: "Återställ senaste giltiga version",
    description: "Lägger tillbaka det senaste sparade utkastet från din session.",
    mode: "ASSISTED",
    reversible: true,
  },
  {
    id: "reopen_draft",
    label: "Återöppna utkast",
    description: "Öppnar ett pågående arbetsflöde där du var tidigare.",
    mode: "ASSISTED",
    reversible: true,
  },
  {
    id: "clear_ui_state",
    label: "Rensa UI-cache",
    description: "Rensar tillfälligt gränssnittstillstånd. Påverkar inte din data.",
    mode: "AUTO",
    reversible: false,
  },
  {
    id: "revalidate_inputs",
    label: "Omvalidera fält",
    description: "Kör valideringen på nytt utan att skicka data.",
    mode: "AUTO",
    reversible: true,
  },
];

const ALLOWED_IDS = new Set<RecoveryActionId>(ALLOWED_ACTIONS.map((a) => a.id));

export function isAllowed(id: string): id is RecoveryActionId {
  return ALLOWED_IDS.has(id as RecoveryActionId);
}

export async function runAction(
  action: RecoveryAction,
  payload?: Record<string, unknown>,
): Promise<ActionResult> {
  if (!isAllowed(action.id)) {
    return {
      ok: false,
      message:
        "Den åtgärden ligger utanför supportagentens befogenheter. Eskalerar till support.",
    };
  }
  if (action.mode === "BLOCKED") {
    return {
      ok: false,
      message: "Åtgärden är blockerad och kräver mänsklig support.",
    };
  }
  const handler = handlers[action.id];
  return handler({ ...(action.payload ?? {}), ...(payload ?? {}) });
}
