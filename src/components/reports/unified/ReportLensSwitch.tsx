/**
 * ReportLensSwitch — page-level tab navigation between RR / BR.
 * Visual: locked to Cogniq design system (DSTabBar / DSTab).
 */
import { cn } from "@/lib/utils";
import { DSTabBar, DSTab } from "@/components/ds";

export type ReportLens = "RR" | "BR";

interface ReportLensSwitchProps {
  value: ReportLens;
  onChange: (lens: ReportLens) => void;
  className?: string;
}

const LENSES: Array<{ key: ReportLens; label: string }> = [
  { key: "RR", label: "Resultaträkning" },
  { key: "BR", label: "Balansräkning" },
];

export function ReportLensSwitch({ value, onChange, className }: ReportLensSwitchProps) {
  return (
    <DSTabBar aria-label="Rapportperspektiv" className={cn(className)}>
      {LENSES.map((lens) => (
        <DSTab
          key={lens.key}
          active={value === lens.key}
          onClick={() => onChange(lens.key)}
        >
          {lens.label}
        </DSTab>
      ))}
    </DSTabBar>
  );
}
