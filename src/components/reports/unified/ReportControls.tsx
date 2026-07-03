/**
 * ReportControls — top-of-page filter bar for the unified Reports module.
 * Period chips + custom date range + zero-account toggle + comparison toggle +
 * company switcher. All state is owned upstream by Reports.tsx.
 */
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type QuickPeriod = "ytd" | "lastMonth" | "lastQuarter" | "lastYear" | "";

interface Company {
  id: string;
  name: string;
}

interface ReportControlsProps {
  fromDate: Date;
  toDate: Date;
  activePeriod: QuickPeriod;
  showZeroAccounts: boolean;
  showComparison: boolean;
  companies: Company[];
  selectedCompany: string;
  onPeriodSelect: (p: Exclude<QuickPeriod, "">) => void;
  onFromChange: (d: Date) => void;
  onToChange: (d: Date) => void;
  onShowZeroChange: (v: boolean) => void;
  onShowComparisonChange: (v: boolean) => void;
  onCompanyChange: (id: string) => void;
}

const PERIOD_BUTTONS: Array<{ key: Exclude<QuickPeriod, "">; label: string }> = [
  { key: "ytd", label: "Hittills i år" },
  { key: "lastMonth", label: "Förra mån" },
  { key: "lastQuarter", label: "Förra kvartal" },
  { key: "lastYear", label: "Förra året" },
];

export function ReportControls({
  fromDate,
  toDate,
  activePeriod,
  showZeroAccounts,
  showComparison,
  companies,
  selectedCompany,
  onPeriodSelect,
  onFromChange,
  onToChange,
  onShowZeroChange,
  onShowComparisonChange,
  onCompanyChange,
}: ReportControlsProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-3">
      {/* Period chips */}
      <div className="flex flex-wrap gap-1.5">
        {PERIOD_BUTTONS.map((p) => (
          <button
            key={p.key}
            onClick={() => onPeriodSelect(p.key)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium border transition-all",
              activePeriod === p.key
                ? "bg-[#3b82f6] text-white border-cyan-600 shadow-sm"
                : "bg-card text-foreground border-border hover:border-[#3b82f6] hover:text-[#3b82f6]",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Date pickers */}
      <div className="flex gap-2 items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-xl border-border text-sm px-3 py-1.5 h-8">
              <Calendar className="w-3 h-3 mr-1" />
              {format(fromDate, "yyyy-MM-dd")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <CalendarComponent
              mode="single"
              selected={fromDate}
              onSelect={(d) => d && onFromChange(d)}
              locale={sv}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        <span className="text-muted-foreground text-xs">→</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-xl border-border text-sm px-3 py-1.5 h-8">
              <Calendar className="w-3 h-3 mr-1" />
              {format(toDate, "yyyy-MM-dd")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <CalendarComponent
              mode="single"
              selected={toDate}
              onSelect={(d) => d && onToChange(d)}
              locale={sv}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-4 lg:ml-auto">
        <div className="flex items-center gap-2">
          <Switch id="zero-accounts" checked={showZeroAccounts} onCheckedChange={onShowZeroChange} />
          <Label htmlFor="zero-accounts" className="text-xs whitespace-nowrap cursor-pointer">
            Nollkonton
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="comparison-toggle" checked={showComparison} onCheckedChange={onShowComparisonChange} />
          <Label htmlFor="comparison-toggle" className="text-xs whitespace-nowrap cursor-pointer">
            Jämförelse
          </Label>
        </div>
        {companies.length > 1 && (
          <Select value={selectedCompany} onValueChange={onCompanyChange}>
            <SelectTrigger className="w-48 h-8 text-sm">
              <SelectValue placeholder="Välj företag" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
