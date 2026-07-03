import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

function formatKr(amount: number) { return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(amount) + " kr";
}

interface WithdrawalExplainerProps { monthlyExpenses: number;
}

export function WithdrawalExplainer({ monthlyExpenses }: WithdrawalExplainerProps) { const [open, setOpen] = useState(false);
  const threeMonths = Math.round(monthlyExpenses * 3);

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm font-medium">Hur fungerar uttag i enskild firma?</span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            />
          </CardContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              I en enskild firma är allt som är kvar i kassan efter skatter och kostnader dina pengar.
              Men det är smart att alltid ha 3 månaders kostnader i reserv, plus att sätta undan
              pengar för moms och F-skatt innan du tar ut något.
            </p>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Tumregler:</h4>
              <ul className="text-sm text-muted-foreground space-y-1.5 ml-4">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  Sätt alltid undan moms och F-skatt <span className="font-medium text-foreground">innan</span> du tar ut pengar
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  Ha minst 3 månaders kostnader som buffert (ca {formatKr(threeMonths)} för dig)
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  Uttag påverkar inte din skatt — du beskattas på vinsten, oavsett uttag
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  Alla uttag bokförs automatiskt av NorthLedger
                </li>
              </ul>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
