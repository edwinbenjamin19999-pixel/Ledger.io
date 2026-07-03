/**
 * FinOS — Closed enum of action verbs available across every module.
 * Each verb has fixed icon, label, intent color and confirm policy so the same
 * primary action (e.g. "Approve") behaves identically in VAT, Cash, Tax, etc.
 */
import {
  Eye, CheckCircle2, Search, Sparkles, Wrench, CreditCard, Send,
  ArrowRight, X, Clock, type LucideIcon,
} from "lucide-react";

export type FinOSActionVerb =
  | "review"
  | "approve"
  | "investigate"
  | "simulate"
  | "fix"
  | "pay"
  | "submit"
  | "open_drilldown"
  | "ignore"
  | "snooze";

export type FinOSActionIntent = "primary" | "secondary" | "danger" | "ghost";

export interface VerbMeta {
  label: string;
  icon: LucideIcon;
  intent: FinOSActionIntent;
  /** When true, host should ask for confirmation before invoking onClick. */
  requiresConfirm: boolean;
  /** Optional keyboard shortcut for power users. */
  shortcut?: string;
}

export const VERBS: Record<FinOSActionVerb, VerbMeta> = {
  review:          { label: "Granska",        icon: Eye,           intent: "primary",   requiresConfirm: false, shortcut: "R" },
  approve:         { label: "Godkänn",        icon: CheckCircle2,  intent: "primary",   requiresConfirm: true,  shortcut: "A" },
  investigate:     { label: "Undersök",       icon: Search,        intent: "secondary", requiresConfirm: false, shortcut: "I" },
  simulate:        { label: "Simulera",       icon: Sparkles,      intent: "secondary", requiresConfirm: false, shortcut: "S" },
  fix:             { label: "Åtgärda",        icon: Wrench,        intent: "primary",   requiresConfirm: false, shortcut: "F" },
  pay:             { label: "Betala",         icon: CreditCard,    intent: "primary",   requiresConfirm: true,  shortcut: "P" },
  submit:          { label: "Lämna in",       icon: Send,          intent: "primary",   requiresConfirm: true   },
  open_drilldown:  { label: "Visa underlag",  icon: ArrowRight,    intent: "ghost",     requiresConfirm: false  },
  ignore:          { label: "Ignorera",       icon: X,             intent: "ghost",     requiresConfirm: false  },
  snooze:          { label: "Skjut upp",      icon: Clock,         intent: "ghost",     requiresConfirm: false  },
};

export interface FinOSAction {
  verb: FinOSActionVerb;
  /** Optional override of default verb label (e.g. "Godkänn momsdeklaration"). */
  label?: string;
  onClick: () => void | Promise<void>;
  /** Disabled state e.g. while a parallel action is pending. */
  disabled?: boolean;
  /** Loading spinner state. */
  pending?: boolean;
}
