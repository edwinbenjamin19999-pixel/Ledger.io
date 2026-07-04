import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Shield } from "lucide-react";
import { LockIcon } from "./LockIcon";
import { AccuracyDisclaimer } from "./AccuracyDisclaimer";
import type { CategoryBAction } from "@/lib/governance";
import { CATEGORY_B_LABELS } from "@/lib/governance";

interface ReviewItem { label: string;
  value: string;
}

interface BankIDReviewScreenProps { actionType: CategoryBAction;
  /** Summary items: label-value pairs shown to user */
  summaryItems: ReviewItem[];
  /** The primary amount being signed (shown above button) */
  amount?: number;
  /** Period description, e.g. "2024-01-01 – 2024-12-31" */
  period?: string;
  /** Additional checklist items beyond the defaults */
  extraChecklist?: string[];
  /** Data source description för high-stakes actions */
  dataSource?: string;
  /** Called when BankID signing is initiated */
  onSign: () => void | Promise<void>;
  /** Called when user clicks "go back" */
  onBack: () => void;
  /** Loading state during signing */
  signing?: boolean;
  /** Custom children rendered in the summary area */
  children?: React.ReactNode;
}

const fmt = (n: number) =>
  n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

export const BankIDReviewScreen = ({ actionType,
  summaryItems,
  amount,
  period,
  extraChecklist,
  dataSource,
  onSign,
  onBack,
  signing = false,
  children,
}: BankIDReviewScreenProps) => { const config = CATEGORY_B_LABELS[actionType];
  const allChecklist = useMemo(() => { const base = [...config.reviewChecklist];
    if (period) { const idx = base.findIndex((c) => c.includes("[period]"));
      if (idx >= 0) base[idx] = base[idx].replace("[period]", period);
    }
    if (extraChecklist) base.push(...extraChecklist);
    return base;
  }, [config, period, extraChecklist]);

  const [checked, setChecked] = useState<boolean[]>(
    () => new Array(allChecklist.length).fill(false)
  );

  const allChecked = checked.every(Boolean);

  const toggle = (i: number) =>
    setChecked((prev) => prev.map((v, j) => (j === i ? !v : v)));

  return (
    <Card className="border-2 border-border max-w-lg mx-auto">
      <CardContent className="pt-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <LockIcon className="h-5 w-5" />
          <h2 className="text-lg font-bold text-foreground">
            Granskning krävs — {config.label}
          </h2>
        </div>

        <p className="text-sm text-muted-foreground">
          AI har förberett följande:
        </p>

        {/* Summary */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
          {summaryItems.map((item, i) => (
            <div key={i} className="flex justify-between">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium text-foreground">{item.value}</span>
            </div>
          ))}
          {children}
        </div>

        <AccuracyDisclaimer dataSource={dataSource} />

        <Separator />

        {/* Checklist */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">
            Kontrollpunkter:
          </p>
          {allChecklist.map((label, i) => (
            <label
              key={i}
              className="flex items-start gap-2.5 cursor-pointer group"
            >
              <Checkbox
                checked={checked[i]}
                onCheckedChange={() => toggle(i)}
                className="mt-0.5"
              />
              <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                {label}
              </span>
            </label>
          ))}
        </div>

        <Separator />

        {/* Sign button */}
        {amount !== undefined && (
          <p className="text-center text-sm font-medium text-foreground">
            {config.label}: {fmt(amount)} kr
          </p>
        )}

        <Button
          className="w-full h-12 text-sm font-semibold"
          style={{ backgroundColor: "#3b82f6", color: "#1a1a2e" }}
          disabled={!allChecked || signing}
          onClick={onSign}
        >
          <Shield className="h-4 w-4 mr-2" />
          {signing ? "Signerar med BankID..." : "Signera med BankID"}
        </Button>

        <p className="text-center text-[11px] text-muted-foreground">
          Genom att signera bekräftar du att uppgifterna är korrekta
        </p>

        <p className="text-[10px] text-center text-muted-foreground/70">
          Genererat av AI — alltid granska noga
        </p>

        <Separator />

        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Gå tillbaka och redigera
        </button>
      </CardContent>
    </Card>
  );
};
