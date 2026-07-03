/**
 * Default agent catalog — mirrors the DB seed in seed_default_ai_agents().
 * Used as fallback when registry is empty (e.g. before company seed trigger fires).
 */
import {
  Brain, FileText, Calculator, Users, TrendingDown,
  ScanText, Wallet, Sparkles, type LucideIcon,
} from "lucide-react";

export interface AgentSeed {
  agent_key: string;
  name: string;
  mission: string;
  owned_modules: string[];
  triggers: string[];
  allowed_actions: string[];
  confidence_threshold: number;
  review_required: boolean;
  icon: LucideIcon;
  accent: "cyan" | "emerald" | "amber" | "rose" | "slate";
}

export const DEFAULT_AGENTS: AgentSeed[] = [
  {
    agent_key: "ai_cfo",
    name: "AI CFO",
    mission: "Strategisk finansiell analys, variansförklaring och rådgivning",
    owned_modules: ["financial-analysis", "reports", "cfo"],
    triggers: ["budget_variance", "margin_drop", "cashflow_risk"],
    allowed_actions: ["generate_insight", "suggest_action"],
    confidence_threshold: 0.8,
    review_required: false,
    icon: Brain,
    accent: "cyan",
  },
  {
    agent_key: "bookkeeping_agent",
    name: "Autonom Bokföringsagent",
    mission: "Automatisk kontering av leverantörsfakturor och banktransaktioner",
    owned_modules: ["accounting", "verifikationer", "bankintegration"],
    triggers: ["document_uploaded", "bank_transaction_imported"],
    allowed_actions: ["post_journal", "suggest_account", "flag_review"],
    confidence_threshold: 0.95,
    review_required: true,
    icon: FileText,
    accent: "emerald",
  },
  {
    agent_key: "vat_engine",
    name: "VAT Engine",
    mission: "Förbereder och validerar momsdeklarationer (SKV 4700)",
    owned_modules: ["vat", "moms"],
    triggers: ["vat_deadline_approaching", "vat_mismatch_detected"],
    allowed_actions: ["prepare_declaration", "validate_codes"],
    confidence_threshold: 0.9,
    review_required: true,
    icon: Calculator,
    accent: "amber",
  },
  {
    agent_key: "ar_controller",
    name: "AR Controller",
    mission: "Bevakar kundfordringar, DSO och kundkoncentration",
    owned_modules: ["ar-agent", "finance", "invoices"],
    triggers: ["receivable_overdue", "dso_increase", "concentration_risk"],
    allowed_actions: ["send_reminder", "suggest_collection", "flag_risk"],
    confidence_threshold: 0.85,
    review_required: false,
    icon: Users,
    accent: "rose",
  },
  {
    agent_key: "cashflow_analyst",
    name: "Cashflow Analyst",
    mission: "12-månaders likviditetsprognos och scenarioanalys",
    owned_modules: ["cashflow-forecast", "treasury"],
    triggers: ["runway_below_threshold", "negative_cashflow_forecast"],
    allowed_actions: ["generate_forecast", "warn_liquidity"],
    confidence_threshold: 0.8,
    review_required: false,
    icon: TrendingDown,
    accent: "cyan",
  },
  {
    agent_key: "document_intelligence",
    name: "Document Intelligence",
    mission: "Extraherar strukturerad data från PDF, kvitton, kontrakt",
    owned_modules: ["dokument", "expenses"],
    triggers: ["document_uploaded", "email_received"],
    allowed_actions: ["extract_fields", "classify_document"],
    confidence_threshold: 0.85,
    review_required: false,
    icon: ScanText,
    accent: "slate",
  },
  {
    agent_key: "payroll_monitor",
    name: "Payroll Monitor",
    mission: "Övervakar löneunderlag, AGI och avvikelser i lönekostnader",
    owned_modules: ["hr", "agi", "payroll"],
    triggers: ["payroll_deviation", "agi_deadline"],
    allowed_actions: ["prepare_agi", "flag_anomaly"],
    confidence_threshold: 0.9,
    review_required: true,
    icon: Wallet,
    accent: "emerald",
  },
  {
    agent_key: "whitelabel_advisor",
    name: "White Label Advisor",
    mission: "Tenant-konfigurerad rådgivare för partnerbyråer",
    owned_modules: ["white-label", "tenant"],
    triggers: ["tenant_rule_fired", "client_facing_event"],
    allowed_actions: ["surface_branded_insight"],
    confidence_threshold: 0.85,
    review_required: false,
    icon: Sparkles,
    accent: "cyan",
  },
];

export function getAgentMeta(agentKey: string): AgentSeed | undefined {
  return DEFAULT_AGENTS.find((a) => a.agent_key === agentKey);
}
