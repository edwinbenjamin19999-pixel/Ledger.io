// DEPRECATED: Use src/components/tax-agent/forms/AGIForm.tsx instead
// Kept for reference — do not import this component
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, Calendar, Lock } from "lucide-react";
import { IndividualRecord, EmployerFields } from "./types";
import { useState } from "react";
import { cn } from "@/lib/utils";

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

interface Step3Props {
  individuals: IndividualRecord[];
  employer: EmployerFields;
  reviewed: boolean;
  onReviewChange: (v: boolean) => void;
  period: string;
  companyName: string;
  orgNumber: string;
}

export const Step3Review = ({ individuals, employer, reviewed, onReviewChange, period, companyName, orgNumber }: Step3Props) => {
  const [showCalc487, setShowCalc487] = useState(false);
  const [showCalc497, setShowCalc497] = useState(false);

  const totalGross = individuals.reduce((s, i) => s + i.field_011 + i.field_012 + i.field_013 + i.field_014 + i.field_015 + i.field_016, 0);
  const totalTax = individuals.reduce((s, i) => s + i.field_001, 0);
  const totalDeductions = employer.field_476 + employer.field_475 + employer.field_477;
  const socialFees = Math.round((totalGross - totalDeductions) * 0.3142);
  const slf = employer.field_486;
  const sum487 = socialFees + slf;
  const sum497 = totalTax + employer.field_496 + employer.field_495;
  const totalToPay = sum487 + sum497;

  // Next payment deadline (12th of next month)
  const now = new Date();
  const deadlineDate = new Date(now.getFullYear(), now.getMonth() + 1, 12);
  const deadlineStr = deadlineDate.toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Granska och skicka in</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Kontrollera uppgifterna nedan. Gå tillbaka till steg 1 eller 2 om något behöver ändras.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Left: Betalningsmottagare summary */}
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Betalningsmottagare</h3>
              <Badge variant="outline" className="text-xs">{individuals.length} st</Badge>
            </div>
          </div>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="text-xs py-2">Namn</TableHead>
                  <TableHead className="text-xs py-2 text-right">Bruttolön</TableHead>
                  <TableHead className="text-xs py-2 text-right">Skatt</TableHead>
                  <TableHead className="text-xs py-2 text-right">AGI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {individuals.map(ind => {
                  const indGross = ind.field_011 + ind.field_012 + ind.field_013 + ind.field_014 + ind.field_015 + ind.field_016;
                  const indAgi = Math.round(indGross * 0.3142);
                  return (
                    <TableRow key={ind.id} className="text-sm">
                      <TableCell className="py-2 font-medium">{ind.name || "—"}</TableCell>
                      <TableCell className="py-2 text-right font-mono text-xs">{fmt(indGross)} kr</TableCell>
                      <TableCell className="py-2 text-right font-mono text-xs">{fmt(ind.field_001)} kr</TableCell>
                      <TableCell className="py-2 text-right font-mono text-xs">{fmt(indAgi)} kr</TableCell>
                    </TableRow>
                  );
                })}
                {/* Total row */}
                <TableRow className="bg-[#0052FF]/5 font-bold">
                  <TableCell className="py-2.5 text-sm">Totalt</TableCell>
                  <TableCell className="py-2.5 text-right font-mono text-xs text-[#0052FF]">{fmt(totalGross)} kr</TableCell>
                  <TableCell className="py-2.5 text-right font-mono text-xs text-[#0052FF]">{fmt(totalTax)} kr</TableCell>
                  <TableCell className="py-2.5 text-right font-mono text-xs text-[#0052FF]">{fmt(socialFees)} kr</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Right: Arbetsgivarnivå summary */}
        <Card>
          <div className="px-5 py-4 border-b border-border bg-muted/20">
            <h3 className="text-sm font-semibold text-foreground">Arbetsgivarnivå</h3>
          </div>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Redovisningsperiod</span>
              <span className="font-medium text-foreground">{period}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Arbetsgivare</span>
              <span className="font-medium text-foreground">{companyName}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Org.nr</span>
              <span className="font-medium font-mono text-foreground">{orgNumber}</span>
            </div>

            <div className="border-t border-border pt-3 mt-3" />

            {/* 487 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Summa AGI + SLF</span>
                  <span className="text-xs text-muted-foreground font-mono">487</span>
                </div>
                <span className="font-mono font-bold text-[#0052FF]">{fmt(sum487)} kr</span>
              </div>
              <Collapsible open={showCalc487} onOpenChange={setShowCalc487}>
                <CollapsibleTrigger className="text-xs text-[#0052FF] hover:underline flex items-center gap-1">
                  <ChevronDown className={cn("w-3 h-3 transition-transform", !showCalc487 && "-rotate-90")} />
                  Visa beräkning
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 text-xs bg-muted/50 rounded-lg p-3 space-y-1 font-mono">
                  <div className="flex justify-between"><span>Underlag</span><span>{fmt(totalGross)} kr</span></div>
                  <div className="flex justify-between"><span>- Avdrag</span><span>-{fmt(totalDeductions)} kr</span></div>
                  <div className="flex justify-between"><span>= Netto</span><span>{fmt(totalGross - totalDeductions)} kr</span></div>
                  <div className="flex justify-between"><span>× 31,42%</span><span>{fmt(socialFees)} kr</span></div>
                  <div className="flex justify-between"><span>+ SLF</span><span>{fmt(slf)} kr</span></div>
                  <div className="flex justify-between font-bold border-t border-border pt-1"><span>= Summa 487</span><span>{fmt(sum487)} kr</span></div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* 497 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Summa skatteavdrag</span>
                  <span className="text-xs text-muted-foreground font-mono">497</span>
                </div>
                <span className="font-mono font-bold text-[#0052FF]">{fmt(sum497)} kr</span>
              </div>
              <Collapsible open={showCalc497} onOpenChange={setShowCalc497}>
                <CollapsibleTrigger className="text-xs text-[#0052FF] hover:underline flex items-center gap-1">
                  <ChevronDown className={cn("w-3 h-3 transition-transform", !showCalc497 && "-rotate-90")} />
                  Visa beräkning
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 text-xs bg-muted/50 rounded-lg p-3 space-y-1 font-mono">
                  <div className="flex justify-between"><span>Kod 001 (individer)</span><span>{fmt(totalTax)} kr</span></div>
                  <div className="flex justify-between"><span>+ Ränta/utdelning (496)</span><span>{fmt(employer.field_496)} kr</span></div>
                  <div className="flex justify-between"><span>+ Pension (495)</span><span>{fmt(employer.field_495)} kr</span></div>
                  <div className="flex justify-between font-bold border-t border-border pt-1"><span>= Summa 497</span><span>{fmt(sum497)} kr</span></div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Total to pay card */}
      <Card className="border-2 border-[#0052FF]/20 bg-gradient-to-r from-[#0052FF]/5 to-transparent">
        <CardContent className="py-6 px-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1">Totalt att betala till Skatteverket</p>
              <p className="text-3xl font-bold text-[#0052FF] font-mono">{fmt(totalToPay)} kr</p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Badge variant="outline" className="bg-[#FAEEDA] dark:bg-amber-900/20 text-[#7A5417] dark:text-[#C28A2B] border-[#F0DDB7] dark:border-amber-800 gap-1.5 px-3 py-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Betala senast: {deadlineStr}
              </Badge>
              <Badge variant="outline" className="font-mono px-3 py-1.5 text-xs">
                Bankgiro: 8004-4368
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation */}
      <div className="flex items-start gap-3 p-4 bg-card border border-border rounded-xl">
        <Checkbox
          checked={reviewed}
          onCheckedChange={v => onReviewChange(!!v)}
          id="review-check"
          className="mt-0.5"
        />
        <label htmlFor="review-check" className="text-sm cursor-pointer text-foreground leading-relaxed">
          Jag har granskat att uppgifterna stämmer och vill gå vidare till signering.
        </label>
      </div>
    </div>
  );
};
