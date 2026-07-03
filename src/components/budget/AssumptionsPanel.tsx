import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { BudgetDrivers } from "@/lib/budget/driverEngine";
import { formatSEK } from "@/lib/budget/budgetEngine";
import { TrendingUp, Users, DollarSign, Clock, Building2, Percent } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drivers: BudgetDrivers;
  onDriversChange: (d: BudgetDrivers) => void;
}

const SliderRow = ({ label, icon: Icon, value, min, max, step, suffix, onChange, hint }: {
  label: string; icon: React.ElementType; value: number; min: number; max: number;
  step: number; suffix: string; onChange: (v: number) => void; hint?: string;
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <Label className="text-xs font-medium">{label}</Label>
      </div>
      <span className="text-xs font-bold tabular-nums text-foreground">
        {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}{suffix}
      </span>
    </div>
    <Slider
      value={[value]}
      onValueChange={([v]) => onChange(v)}
      min={min}
      max={max}
      step={step}
      className="w-full"
    />
    {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
  </div>
);

const NumberInput = ({ label, icon: Icon, value, onChange, suffix }: {
  label: string; icon: React.ElementType; value: number; onChange: (v: number) => void; suffix: string;
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      <Label className="text-xs font-medium">{label}</Label>
    </div>
    <div className="flex items-center gap-2">
      <Input
        type="number"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="h-8 text-xs font-mono"
      />
      <span className="text-xs text-muted-foreground whitespace-nowrap">{suffix}</span>
    </div>
  </div>
);

export const AssumptionsPanel = ({ open, onOpenChange, drivers, onDriversChange }: Props) => {
  const set = (key: keyof BudgetDrivers, value: number) => {
    onDriversChange({ ...drivers, [key]: value });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[380px] sm:w-[420px] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-base flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#0F1F3D] flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            Antaganden
          </SheetTitle>
          <SheetDescription className="text-xs">
            Ändra antaganden — hela modellen uppdateras i realtid.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 pb-8">
          {/* Revenue */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Intäkter</p>
            <SliderRow
              label="Pristillväxt"
              icon={TrendingUp}
              value={drivers.priceGrowthRate}
              min={-10} max={30} step={0.5}
              suffix="%/år"
              onChange={v => set("priceGrowthRate", v)}
              hint="Årlig prisökning på befintliga kunder"
            />
            <NumberInput
              label="Nya kunder/mån"
              icon={Users}
              value={drivers.newCustomersPerMonth}
              onChange={v => set("newCustomersPerMonth", v)}
              suffix="st"
            />
            <SliderRow
              label="Churn rate"
              icon={Users}
              value={drivers.churnRate}
              min={0} max={15} step={0.5}
              suffix="%/mån"
              onChange={v => set("churnRate", v)}
            />
            <NumberInput
              label="Intäkt per kund"
              icon={DollarSign}
              value={drivers.averageRevenuePerCustomer}
              onChange={v => set("averageRevenuePerCustomer", v)}
              suffix="kr/mån"
            />
          </div>

          <Separator />

          {/* Costs */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-[#7A1A1A] dark:text-[#C73838] uppercase tracking-wide">Kostnader</p>
            <SliderRow
              label="COGS (% av intäkt)"
              icon={Percent}
              value={drivers.cogsPercent}
              min={0} max={80} step={1}
              suffix="%"
              onChange={v => set("cogsPercent", v)}
            />
            <NumberInput
              label="Lönekostnad"
              icon={Users}
              value={drivers.salaryMonthly}
              onChange={v => set("salaryMonthly", v)}
              suffix="kr/mån"
            />
            <NumberInput
              label="Marknadsföring"
              icon={TrendingUp}
              value={drivers.marketingBudget}
              onChange={v => set("marketingBudget", v)}
              suffix="kr/mån"
            />
            <NumberInput
              label="Admin & hyra"
              icon={Building2}
              value={drivers.adminCosts}
              onChange={v => set("adminCosts", v)}
              suffix="kr/mån"
            />
            <NumberInput
              label="FoU (Forskning & utveckling)"
              icon={TrendingUp}
              value={drivers.rdCosts}
              onChange={v => set("rdCosts", v)}
              suffix="kr/mån"
            />
          </div>

          <Separator />

          {/* Working capital */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-[#7A5417] dark:text-[#C28A2B] uppercase tracking-wide">Rörelsekapital</p>
            <SliderRow
              label="Betalningstid kunder (DSO)"
              icon={Clock}
              value={drivers.dso}
              min={0} max={90} step={1}
              suffix=" dagar"
              onChange={v => set("dso", v)}
              hint="Genomsnittlig tid till kundbetaling"
            />
            <SliderRow
              label="Betalningstid leverantörer (DPO)"
              icon={Clock}
              value={drivers.dpo}
              min={0} max={90} step={1}
              suffix=" dagar"
              onChange={v => set("dpo", v)}
            />
          </div>

          <Separator />

          {/* Tax & rates */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Skatt & räntor</p>
            <SliderRow
              label="Bolagsskatt"
              icon={Percent}
              value={Math.round(drivers.corporateTaxRate * 1000) / 10}
              min={0} max={30} step={0.1}
              suffix="%"
              onChange={v => set("corporateTaxRate", v / 100)}
            />
            <SliderRow
              label="Ränta på lån"
              icon={Percent}
              value={Math.round(drivers.interestRate * 1000) / 10}
              min={0} max={15} step={0.1}
              suffix="%"
              onChange={v => set("interestRate", v / 100)}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
