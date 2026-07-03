import {
  LayoutDashboard, BookOpen, Receipt, BarChart3, FileCheck, Users, Wallet,
  Calculator, FileText, TrendingUp, PiggyBank, Building, Eye, Landmark, Target,
  ArrowLeftRight, Building2, UserCog, Settings, Shield, Bot, Sparkles, Zap,
  CreditCard, Bell, ClipboardList, FilePlus, Upload, List,
  Search, DollarSign, PieChart, LineChart, ScanLine, Brain, ShieldAlert, Banknote, Leaf, Gavel,
  FolderKanban, Home, Clock, Store, Smartphone, Boxes, Package, MessagesSquare, Blocks,
  CalendarCheck, ShoppingBag, FileSpreadsheet, Truck, ListChecks,
  type LucideIcon,
} from "lucide-react";

export interface NavSubItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export interface NavItem {
  path?: string;
  label: string;
  icon: LucideIcon;
  subItems?: NavSubItem[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Single source of truth for the sidebar navigation structure.
 * Used by both AppSidebar.tsx (rendering) and CustomizeModulesModal.tsx (toggling).
 */
export const buildNavGroups = (aiName: string): NavGroup[] => [
  // TOP — Direct shortcut to Daglig briefing (AI Ekonom)
  {
    label: "HEM",
    items: [
      { path: "/dashboard", label: "HEM", icon: Home },
    ],
  },

  // GROUP — AI & AUTOMATION (restored)
  {
    label: "AI & automatisering",
    items: [
      { path: "/ai-ekonom", label: aiName, icon: Sparkles },
      { path: "/bookkeep", label: "AI Bokförare", icon: BookOpen },
      { path: "/board", label: "Styrelseläge", icon: Building2 },
      { path: "/agent", label: "AI-aktivitetslogg", icon: Bot },
      { path: "/agents/bokforing", label: "Bokföringsagent", icon: Brain },
      { path: "/agents/kvitto", label: "Kvittoagent", icon: ScanLine },
      { path: "/agents/lon", label: "Löneagent", icon: UserCog },
      { path: "/agents/ar", label: "AR-agent", icon: Banknote },
      { path: "/agents/skatt", label: "Skatteagent", icon: Landmark },
      { path: "/agents/autofix", label: "Autofix", icon: Zap },
      { path: "/agents/automations", label: "Automatiseringar", icon: Bot },
      { path: "/agents/beslutsmotor", label: "Beslutsmotor", icon: Brain },
      { path: "/ai-settings", label: "AI-inställningar", icon: Settings },
    ],
  },

  // GROUP — REVIEW (supplier-related + oversight)
  {
    label: "Granska",
    items: [
      { path: "/supplier-invoices", label: "Leverantörsfakturor", icon: CreditCard },
      { path: "/supplier-ledger", label: "Leverantörsreskontra", icon: ClipboardList },
      { path: "/registry?tab=suppliers", label: "Leverantörsregister", icon: Truck },
      { path: "/payment-providers", label: "Betalningsleverantörer", icon: Blocks },
      { path: "/credit-card", label: "Kreditkort", icon: CreditCard },
      { path: "/swish", label: "Swish Business", icon: Smartphone },
      { path: "/agents/review", label: "Att granska (AI)", icon: ListChecks },
      { path: "/verifications", label: "Att godkänna", icon: FileCheck },
      { path: "/bankavstamning", label: "Bankavstämning", icon: ArrowLeftRight },
      { path: "/anomaly-detection", label: "Avvikelser & risk", icon: ShieldAlert },
      { path: "/agent", label: "AI-aktivitetslogg", icon: Bot },
      { path: "/period-close", label: "Periodstängning", icon: CalendarCheck },
    ],
  },

  // GROUP — DO (primary actions)
  {
    label: "Gör",
    items: [
      { path: "/invoices", label: "Kundfakturor", icon: FileText },
      { path: "/customer-ledger", label: "Kundreskontra", icon: Users },
      { path: "/registry?tab=customers", label: "Kundregister", icon: Users },
      { path: "/contracts", label: "Avtal & prenumerationer", icon: ClipboardList },
      { path: "/invoice-reminders", label: "Påminnelser & krav", icon: Bell },
      { path: "/finance", label: "Inkasso & finansiering", icon: Gavel },
      { path: "/kassaregister", label: "Kassaregister", icon: Store },
      { path: "/unified-commerce", label: "Unified commerce", icon: ShoppingBag },
      { path: "/direct-payment", label: "Betalningar", icon: Banknote },
      { path: "/expenses", label: "Utlägg", icon: Wallet },
      { path: "/tidrapportering", label: "Tidrapportering", icon: Clock },
    ],
  },

  // GROUP — ACCOUNTING CORE
  {
    label: "Bokföring",
    items: [
      { path: "/accounting", label: "Registrera verifikation", icon: FilePlus },
      { path: "/bookkeep", label: "Ladda upp underlag", icon: Upload },
      { path: "/verifications", label: "Verifikationslista", icon: FileCheck },
      { path: "/chart-of-accounts", label: "Kontoplan", icon: List },
      { path: "/account-analysis", label: "Kontoanalys", icon: Search },
      { path: "/closing", label: "Periodstängning", icon: CalendarCheck },
      { path: "/depreciation", label: "Tillgångar", icon: Package },
      { path: "/bankintegration", label: "Bankintegration", icon: Landmark },
    ],
  },

  // GROUP — UNDERSTAND (reports + analysis)
  {
    label: "Förstå",
    items: [
      { path: "/reports", label: "Resultat & balans", icon: BarChart3 },
      {
        label: "Kassaflöde", icon: TrendingUp, subItems: [
          { path: "/cash-flow-report", label: "Kassaflödesanalys", icon: FileSpreadsheet },
          { path: "/cashflow", label: "Likviditet — live", icon: LineChart },
          { path: "/cashflow-90d", label: "Prognos 90 dagar", icon: LineChart },
          { path: "/cash-command", label: "Cash Command", icon: Zap },
        ],
      },
      { path: "/cfo", label: "KPI:er & nyckeltal", icon: Brain },
      { path: "/financial-analysis", label: "Variansanalys", icon: PieChart },
      { path: "/lagerredovisning", label: "Lageranalys", icon: Boxes },
      {
        label: "Budget & prognos", icon: PiggyBank, subItems: [
          { path: "/budget", label: "Budget", icon: PiggyBank },
          { path: "/forecast", label: "Prognos", icon: LineChart },
          { path: "/scenarios", label: "Scenarier", icon: Sparkles },
          { path: "/follow-up", label: "Uppföljning", icon: TrendingUp },
        ],
      },
      { path: "/benchmarking", label: "Branschjämförelse", icon: Target },
      { path: "/annual-report", label: "Årsredovisning", icon: FileText },
      { path: "/esg", label: "ESG & hållbarhet", icon: Leaf },
    ],
  },

  {
    label: "Verksamhet",
    items: [
      { path: "/project-accounting", label: "Projekt", icon: FolderKanban },
      { path: "/agaruttag", label: "Ägaruttag & kapital", icon: Wallet },
      { path: "/corporate-actions", label: "Företagshändelser", icon: Gavel },
      { path: "/collaboration", label: "Samarbete", icon: MessagesSquare },
      { path: "/consolidation", label: "Koncern", icon: Building },
      { path: "/ma-intelligence", label: "M&A & värdering", icon: DollarSign },
      { path: "/spend-analytics", label: "Kostnadsanalys", icon: PieChart },
    ],
  },
  {
    label: "Skatt & deklaration",
    items: [
      { path: "/moms", label: "Momssammanställning", icon: Receipt },
      { path: "/vat-reports", label: "Momsdeklaration", icon: Receipt },
      { path: "/tax-calculation", label: "Skatteberäkning", icon: Calculator },
      { path: "/tax-agent", label: "Skattedeklarationsagent", icon: Calculator },
      { path: "/skatteagent", label: "Skatteagent", icon: Landmark },
      { path: "/rut-rot", label: "RUT/ROT-avdrag", icon: Home },
    ],
  },
  {
    label: "Lön & personal",
    items: [
      { path: "/hr", label: "HR & lön", icon: UserCog },
      { path: "/hr-engine", label: "HR Engine (AI)", icon: Brain },
      { path: "/agi-submission", label: "Arbetsgivardeklaration", icon: Users },
    ],
  },
  {
    label: "E-handel",
    items: [
      { path: "/ehandel/oversikt", label: "Översikt", icon: ShoppingBag },
      { path: "/ehandel/plattformar", label: "Plattformar", icon: Blocks },
      { path: "/ehandel/ordrar", label: "Ordrar", icon: ShoppingBag },
      { path: "/ehandel/utbetalningar", label: "Utbetalningar", icon: CreditCard },
      { path: "/ehandel/returer", label: "Returer", icon: ArrowLeftRight },
      { path: "/ehandel/lager", label: "Lager", icon: Package },
      { path: "/ehandel/moms", label: "OSS & moms", icon: Receipt },
      { path: "/ehandel/marginaler", label: "Marginaler", icon: TrendingUp },
    ],
  },
];

/**
 * Flatten a nav group into all toggleable {path,label} items, expanding subItems.
 * Items without a path (pure parents) are skipped — only leaves are toggleable.
 */
export interface FlatNavItem {
  path: string;
  label: string;
  isSubItem?: boolean;
}

export function flattenGroupItems(group: NavGroup): FlatNavItem[] {
  const out: FlatNavItem[] = [];
  for (const item of group.items) {
    if (item.subItems && item.subItems.length > 0) {
      for (const sub of item.subItems) {
        out.push({ path: sub.path, label: `${item.label} → ${sub.label}`, isSubItem: true });
      }
    } else if (item.path) {
      out.push({ path: item.path, label: item.label });
    }
  }
  return out;
}
