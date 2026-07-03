/**
 * Technical AI Support — typer
 * Sandboxat supportlager. AI får ALDRIG röra schema, RLS, integrationer eller bulk-data.
 */

export type ExecutionMode = "AUTO" | "ASSISTED" | "BLOCKED";

export type RecoveryActionId =
  | "retry_request"
  | "refresh_module"
  | "reset_form_state"
  | "restore_last_valid"
  | "reopen_draft"
  | "clear_ui_state"
  | "revalidate_inputs";

export type IncidentClassification =
  | "ui_state"
  | "network"
  | "stale_data"
  | "validation"
  | "permission"
  | "integration_timeout"
  | "unknown";

export interface SupportIncident {
  id: string;
  createdAt: number;
  source: "render" | "api" | "predictive" | "manual";
  module?: string;
  errorMessage: string;
  classification: IncidentClassification;
  context: Record<string, unknown>;
  /** Stable key for repeat-detection */
  signature?: string;
}

export interface RecoveryAction {
  id: RecoveryActionId;
  label: string;
  description: string;
  mode: ExecutionMode;
  reversible: boolean;
  /** Optional payload (e.g. snapshot key, retry fn ref) */
  payload?: Record<string, unknown>;
}

export interface SupportPlan {
  incident: SupportIncident;
  explanation: string;
  why?: string;
  affectedData?: string;
  actions: RecoveryAction[];
  mode: ExecutionMode;
  escalate: boolean;
}

export interface ActionResult {
  ok: boolean;
  message: string;
  undo?: () => void | Promise<void>;
}
