import { useEffect, useState } from "react";

export type DocumentMode = "edit" | "document";
export type RoleMode = "business_owner" | "accountant";
export type DocTemplate = "minimal" | "big4" | "fintech";

const STORAGE_KEY_MODE = "annual-report:doc-mode";
const STORAGE_KEY_ROLE = "annual-report:role-mode";
const STORAGE_KEY_TPL = "annual-report:template";

function read<T extends string>(key: string, fallback: T): T {
  try { return (localStorage.getItem(key) as T) || fallback; } catch { return fallback; }
}

export function useDocumentMode() {
  const [mode, setModeState] = useState<DocumentMode>(() => read<DocumentMode>(STORAGE_KEY_MODE, "edit"));
  const [role, setRoleState] = useState<RoleMode>(() => read<RoleMode>(STORAGE_KEY_ROLE, "accountant"));
  const [template, setTemplateState] = useState<DocTemplate>(() => read<DocTemplate>(STORAGE_KEY_TPL, "minimal"));

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY_MODE, mode); } catch {} }, [mode]);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY_ROLE, role); } catch {} }, [role]);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY_TPL, template); } catch {} }, [template]);

  return {
    mode, setMode: setModeState,
    role, setRole: setRoleState,
    template, setTemplate: setTemplateState,
    isUnlocked: mode === "edit",
    isDocumentMode: mode === "document",
  };
}
