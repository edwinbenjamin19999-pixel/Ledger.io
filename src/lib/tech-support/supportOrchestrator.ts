/**
 * Orchestrator — klassificerar incidenter och föreslår whitelistade actions.
 * Inga DB-ändringar, ingen bulk-data, inga schema-frågor.
 */
import { ALLOWED_ACTIONS } from "./actionWhitelist";
import type {
  IncidentClassification,
  RecoveryAction,
  SupportIncident,
  SupportPlan,
} from "./types";

const STRUCTURAL_KEYWORDS = [
  "schema",
  "permission denied for table",
  "rls",
  "policy",
  "edge function",
  "deploy",
  "chart of accounts",
];

export function classify(error: { message?: string; status?: number; name?: string }): IncidentClassification {
  const msg = (error.message ?? "").toLowerCase();
  const status = error.status;

  if (status === 401 || status === 403 || /permission|forbidden|unauthor/.test(msg)) {
    return "permission";
  }
  if (status === 408 || /timeout|timed out|gateway/.test(msg)) {
    return "integration_timeout";
  }
  if (status === 0 || /network|fetch failed|failed to fetch|connection/.test(msg)) {
    return "network";
  }
  if (/validation|invalid|required|must be/.test(msg)) {
    return "validation";
  }
  if (/stale|cache|outdated|version mismatch/.test(msg)) {
    return "stale_data";
  }
  if (error.name === "ChunkLoadError" || /render|hook|undefined is not/.test(msg)) {
    return "ui_state";
  }
  return "unknown";
}

export function isStructural(message: string): boolean {
  const m = message.toLowerCase();
  return STRUCTURAL_KEYWORDS.some((k) => m.includes(k));
}

function pick(ids: string[]): RecoveryAction[] {
  return ALLOWED_ACTIONS.filter((a) => ids.includes(a.id));
}

export function buildPlan(incident: SupportIncident): SupportPlan {
  if (isStructural(incident.errorMessage)) {
    return {
      incident,
      explanation:
        "Det här ser ut att kräva en strukturell ändring (rättigheter, schema eller integration).",
      why: "Supportagenten är sandboxad och får inte röra sådana områden.",
      affectedData: "Ingen data har påverkats.",
      actions: [],
      mode: "BLOCKED",
      escalate: true,
    };
  }

  switch (incident.classification) {
    case "network":
      return {
        incident,
        explanation: "Nätverksanropet gick inte fram.",
        why: "Kan vara tillfällig anslutningshicka eller en server som svarar långsamt.",
        affectedData: "Ingen data ändrad.",
        actions: pick(["retry_request", "refresh_module"]),
        mode: "AUTO",
        escalate: false,
      };
    case "integration_timeout":
      return {
        incident,
        explanation: "En extern tjänst svarade för långsamt.",
        why: "Banktjänster och myndigheter kan ha tillfälliga fördröjningar.",
        affectedData: "Ingen data ändrad.",
        actions: pick(["retry_request"]),
        mode: "ASSISTED",
        escalate: false,
      };
    case "validation":
      return {
        incident,
        explanation: "Något fält uppfyller inte valideringsreglerna.",
        affectedData: "Endast formuläret på skärmen.",
        actions: pick(["revalidate_inputs", "restore_last_valid"]),
        mode: "AUTO",
        escalate: false,
      };
    case "stale_data":
      return {
        incident,
        explanation: "Data på skärmen är inte färsk.",
        affectedData: "Endast visning — ingenting sparat ändras.",
        actions: pick(["refresh_module", "clear_ui_state"]),
        mode: "AUTO",
        escalate: false,
      };
    case "ui_state":
      return {
        incident,
        explanation: "Gränssnittet hamnade i ett trasigt tillstånd.",
        affectedData: "Endast UI — din sparade data är intakt.",
        actions: pick(["clear_ui_state", "refresh_module", "reset_form_state"]),
        mode: "AUTO",
        escalate: false,
      };
    case "permission":
      return {
        incident,
        explanation: "Du saknar behörighet för den här åtgärden.",
        why: "Det här hanteras av en administratör, inte av supportagenten.",
        affectedData: "Ingen data ändrad.",
        actions: [],
        mode: "BLOCKED",
        escalate: true,
      };
    default:
      return {
        incident,
        explanation: "Ett oväntat fel inträffade.",
        affectedData: "Ingen data ändrad.",
        actions: pick(["retry_request", "refresh_module", "clear_ui_state"]),
        mode: "ASSISTED",
        escalate: false,
      };
  }
}

export function makeIncident(
  source: SupportIncident["source"],
  errorMessage: string,
  context: Record<string, unknown> = {},
  module?: string,
): SupportIncident {
  const classification = classify({
    message: errorMessage,
    status: typeof context.status === "number" ? (context.status as number) : undefined,
    name: typeof context.name === "string" ? (context.name as string) : undefined,
  });
  return {
    id:
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `inc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
    createdAt: Date.now(),
    source,
    module,
    errorMessage,
    classification,
    context,
    signature: `${classification}:${module ?? "global"}:${errorMessage.slice(0, 80)}`,
  };
}
