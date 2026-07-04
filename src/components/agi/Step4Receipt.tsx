// DEPRECATED: Use src/components/tax-agent/forms/AGIForm.tsx instead
// Kept for reference — do not import this component
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Download, ArrowRight, Calendar } from "lucide-react";

interface Step4Props {
  period: string;
  submittedAt: string;
  receiptNumber: string;
  companyName: string;
  orgNumber: string;
  onBack: () => void;
}

export const Step4Receipt = ({ period, submittedAt, receiptNumber, companyName, orgNumber, onBack }: Step4Props) => {
  // Next deadline
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 12);
  const nextDeadline = nextMonth.toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="flex justify-center py-8">
      <div className="max-w-lg w-full space-y-5">
        {/* Success card */}
        <Card className="overflow-hidden">
          <CardContent className="pt-10 pb-8 text-center">
            {/* Animated checkmark */}
            <div className="relative mx-auto w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-full bg-[#E1F5EE] animate-[ping_1.5s_ease-in-out_1]" />
              <div className="relative w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center animate-[scale-in_0.4s_ease-out]">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
            </div>

            <h3 className="text-2xl font-bold text-foreground mb-2">Deklaration inskickad!</h3>
            <p className="text-sm text-muted-foreground mb-8">
              Din AGI-deklaration har skickats till Skatteverket
            </p>

            {/* Receipt details */}
            <div className="bg-muted/30 border border-border rounded-xl p-5 text-left space-y-3 mb-8">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Redovisningsperiod</span>
                <span className="font-medium text-foreground">{period}</span>
              </div>
              <div className="border-t border-border" />
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Inlämningsdatum</span>
                <span className="font-medium text-foreground">{submittedAt}</span>
              </div>
              <div className="border-t border-border" />
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Referensnummer</span>
                <span className="font-mono font-semibold text-foreground">{receiptNumber}</span>
              </div>
              <div className="border-t border-border" />
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Arbetsgivare</span>
                <span className="font-medium text-foreground">{orgNumber} / {companyName}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 justify-center">
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Ladda ner kvittens (PDF)
              </Button>
              <Button onClick={onBack} className="bg-[#0052FF] hover:bg-[#0052FF]/90 text-white gap-2">
                Ny deklaration
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Next deadline card */}
        <Card className="bg-muted/20">
          <CardContent className="py-4 px-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#0052FF]/10 shrink-0">
                <Calendar className="w-4 h-4 text-[#0052FF]" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium">Nästa deklaration</p>
                <p className="text-sm font-semibold text-foreground">{nextDeadline}</p>
              </div>
              <Badge variant="outline" className="text-xs">Kommande</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
