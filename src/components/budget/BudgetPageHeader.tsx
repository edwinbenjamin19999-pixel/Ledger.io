import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PiggyBank, Sparkles, FileDown, Save, Lock, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";

interface Company { id: string;
  name: string;
}

interface BudgetPageHeaderProps { companies: Company[];
  selectedCompany: string;
  onCompanyChange: (id: string) => void;
  selectedYear: number;
  onYearChange: (year: number) => void;
  status: string | null;
  onAIClick: () => void;
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon?: React.ReactNode }> = { draft: { label: "Utkast", className: "bg-slate-100 text-slate-600 border-slate-200" },
  ai_generated: { label: "AI-genererad", className: "bg-[#F1F5F9] text-purple-700 border-[#E2E8F0]", icon: <Sparkles className="w-3 h-3" /> },
  approved: { label: "Godkänd", className: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]", icon: <Check className="w-3 h-3" /> },
  locked: { label: "Låst", className: "bg-slate-200 text-slate-700 border-slate-300", icon: <Lock className="w-3 h-3" /> },
};

export const BudgetPageHeader = ({ companies, selectedCompany, onCompanyChange,
  selectedYear, onYearChange,
  status, onAIClick, onSave, saving, dirty,
}: BudgetPageHeaderProps) => { const statusCfg = STATUS_CONFIG[status || "draft"] || STATUS_CONFIG.draft;

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-[#0F1F3D] text-white">
          <PiggyBank className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Budget & Prognoser</h1>
          <p className="text-sm text-muted-foreground">Tre-rapportsbudget med AI-driven prognos och scenarioanalys</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedCompany} onValueChange={onCompanyChange}>
          <SelectTrigger className="w-[200px] h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {companies.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedYear.toString()} onValueChange={v => onYearChange(parseInt(v))}>
          <SelectTrigger className="w-[100px] h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026, 2027].map(y => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {status && (
          <div className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border", statusCfg.className)}>
            {statusCfg.icon}
            {statusCfg.label}
          </div>
        )}

        <div className="flex-1" />

        <Button variant="outline" size="sm" onClick={onAIClick} className="bg-[#0F1F3D] text-white border-0 hover:from-purple-700 hover:to-indigo-700 gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          AI-förslag
        </Button>
        <ComingSoonButton tooltipText="Excel-export lanseras snart">Exportera</ComingSoonButton>
        <Button size="sm" onClick={onSave} disabled={!dirty || saving} className="gap-1.5">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? "Sparar..." : "Spara"}
        </Button>
      </div>
    </div>
  );
};
