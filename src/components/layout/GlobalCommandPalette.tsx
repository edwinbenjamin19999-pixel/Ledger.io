/**
 * Global Cmd+K / Ctrl+K command palette.
 * Mounts once in AppLayout. Lets power users jump anywhere instantly.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Receipt,
  FileText,
  Banknote,
  Calculator,
  Users,
  Briefcase,
  TrendingUp,
  Sparkles,
  Settings,
  ShieldCheck,
  Building2,
  CalendarCheck,
  PiggyBank,
  Landmark,
  ScrollText,
  Wallet,
} from "lucide-react";

interface NavCommand {
  label: string;
  hint?: string;
  path: string;
  icon: React.ElementType;
  group: string;
  keywords?: string[];
}

const COMMANDS: NavCommand[] = [
  // Daily
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, group: "Dagligt", keywords: ["start", "hem", "översikt"] },
  { label: "AI-ekonom", path: "/ai-ekonom", icon: Sparkles, group: "Dagligt", keywords: ["assistant", "chat"] },
  { label: "Verifikationer", path: "/verifikationer", icon: ScrollText, group: "Bokföring", keywords: ["journal", "huvudbok"] },
  { label: "Bankintegration", path: "/bankintegration", icon: Banknote, group: "Bokföring", keywords: ["bank", "psd2", "avstämning"] },
  { label: "Utlägg", path: "/expenses", icon: Wallet, group: "Bokföring", keywords: ["expense", "kvitto"] },
  { label: "Periodisering", path: "/periodisering", icon: CalendarCheck, group: "Bokföring" },

  // Invoicing
  { label: "Fakturor", path: "/invoices", icon: FileText, group: "Försäljning", keywords: ["invoice"] },
  { label: "Leverantörsbetalningar", path: "/direct-payment", icon: Banknote, group: "Försäljning", keywords: ["pain.001", "betala", "supplier payments"] },

  // Compliance
  { label: "Moms", path: "/moms", icon: Receipt, group: "Skatt & Compliance", keywords: ["vat", "skv 4700"] },
  { label: "AGI / Lönedeklaration", path: "/agi", icon: Users, group: "Skatt & Compliance" },
  { label: "Inkomstskatt (INK2)", path: "/income-tax", icon: Calculator, group: "Skatt & Compliance", keywords: ["bolagsskatt"] },
  { label: "Skatteberäkning", path: "/tax-calculation", icon: Calculator, group: "Skatt & Compliance" },
  { label: "Årsredovisning", path: "/annual-report", icon: FileText, group: "Skatt & Compliance", keywords: ["k2", "k3"] },
  { label: "Audit Readiness", path: "/audit-readiness", icon: ShieldCheck, group: "Skatt & Compliance", keywords: ["revision"] },

  // Insights
  { label: "AI CFO", path: "/cfo", icon: TrendingUp, group: "Insikter" },
  { label: "Budget & Prognos", path: "/budget", icon: PiggyBank, group: "Insikter" },
  { label: "Cashflow Forecast", path: "/cashflow-forecast", icon: TrendingUp, group: "Insikter", keywords: ["kassaflöde"] },
  { label: "Finansiell analys", path: "/financial-analysis", icon: TrendingUp, group: "Insikter" },

  // Operations
  { label: "Projekt", path: "/projects", icon: Briefcase, group: "Verksamhet" },
  { label: "HR & Lön", path: "/hr", icon: Users, group: "Verksamhet" },
  { label: "Lager", path: "/lager", icon: Building2, group: "Verksamhet" },
  { label: "Kassaregister", path: "/kassaregister", icon: Receipt, group: "Verksamhet" },

  // Settings
  { label: "Integrationer", path: "/integrations", icon: Settings, group: "Inställningar" },
  { label: "Säkerhet", path: "/security", icon: ShieldCheck, group: "Inställningar" },
  { label: "GDPR", path: "/gdpr-settings", icon: ShieldCheck, group: "Inställningar" },
  { label: "Bolagsuppgifter", path: "/company-settings", icon: Landmark, group: "Inställningar" },
];

export function GlobalCommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  // Group commands by their group label
  const groups = COMMANDS.reduce<Record<string, NavCommand[]>>((acc, c) => {
    (acc[c.group] ||= []).push(c);
    return acc;
  }, {});

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Sök modul, åtgärd eller rapport… (⌘K)" />
      <CommandList>
        <CommandEmpty>Inga träffar.</CommandEmpty>
        {Object.entries(groups).map(([group, items], idx) => (
          <div key={group}>
            {idx > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {items.map((c) => {
                const Icon = c.icon;
                return (
                  <CommandItem
                    key={c.path}
                    value={`${c.label} ${c.keywords?.join(" ") ?? ""}`}
                    onSelect={() => go(c.path)}
                  >
                    <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{c.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
