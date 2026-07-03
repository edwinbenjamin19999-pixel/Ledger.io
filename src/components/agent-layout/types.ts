import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type AgentRunState = "working" | "idle" | "paused" | "error";

export interface AgentStatusNow {
  state: AgentRunState;
  /** Working: current task description, e.g. "Matchar 14 transaktioner..." */
  currentTask?: string;
  /** Working: estimated time remaining, e.g. "ca 2 min kvar" */
  etaLabel?: string;
  /** Working: 0–100 progress (optional, falls back to indeterminate bar) */
  progress?: number;
  /** Idle: when agent last completed a run */
  lastRunAt?: string | Date;
  /** Idle: next scheduled run */
  nextRunAt?: string | Date;
  /** Error: short message */
  errorMessage?: string;
  /** Error: link/route or handler for "Visa detaljer" */
  errorDetailsHref?: string;
  onErrorDetails?: () => void;
}

export interface AgentKpiTile {
  label: string;
  value: string | number;
  /** "+12 mer än förra månaden" */
  comparisonLabel?: string;
  trend?: "up" | "down" | "flat";
  trendIsPositive?: boolean;
  onClick?: () => void;
  href?: string;
}

export type AgentActivityStatus = "done" | "corrected" | "in_progress";

export interface AgentReviewAccountLine {
  /** BAS-konto eller ledger-konto, t.ex. "5410" */
  account: string;
  /** Visningsetikett, t.ex. "Förbrukningsinventarier" */
  label?: string;
  /** Positivt = debet, negativt = kredit */
  amount: number;
}

export interface AgentReviewDetails {
  /** Kort etikett för åtgärden, t.ex. "Bokför kvitto" eller "Skicka inkassovarsel" */
  proposedAction: string;
  /** Berörda konton + belopp (visas som tabell) */
  accountLines?: AgentReviewAccountLine[];
  /** Totalt belopp (om inga kontolinjer eller för sammanfattning), SEK */
  amount?: number;
  /** AI:ns motivering / receipt */
  reasoning: string;
  /** Källreferens, t.ex. "Kvitto #4521", "Verifikat V-2026-0118" */
  reference?: string;
  /** Vad som händer vid "Godkänn", t.ex. "Posterar 2 rader i journal" */
  approveLabel?: string;
}

export interface AgentActivityRow {
  id: string;
  timestamp: string | Date;
  description: ReactNode;
  /** 0–100 */
  confidence?: number;
  status: AgentActivityStatus;
  /** Rendered when row is expanded (fallback om review saknas) */
  details?: ReactNode;
  /** Strukturerad review-data för rader som väntar på beslut */
  review?: AgentReviewDetails;
}

export type AgentAutonomyLevel = "full" | "suggest" | "inform";

export interface AgentSettingsValue {
  autonomy: AgentAutonomyLevel;
  /** 50–100 */
  confidenceThreshold: number;
}

export interface AgentManualActionsHandlers {
  onRunNow?: () => void | Promise<void>;
  onOpenFullLog?: () => void;
  onTrainAgent?: () => void;
}

export interface AgentLayoutProps {
  // Header
  icon: LucideIcon;
  name: string;
  description: string;

  // Active state + pause toggle (controlled)
  isActive: boolean;
  isPaused?: boolean;
  onToggleActive: (next: boolean) => void;

  // Sections
  statusNow: AgentStatusNow;
  kpis: AgentKpiTile[];
  activity: AgentActivityRow[];
  /** Default 10 */
  initialActivityCount?: number;

  /** Agent-specific settings rendered below the universal two */
  settings: AgentSettingsValue;
  onSettingsChange: (next: AgentSettingsValue) => void;
  agentSpecificSettings?: ReactNode;

  manualActions?: AgentManualActionsHandlers;

  /** Optional extra content rendered between activity feed and settings */
  extraSection?: ReactNode;
}
