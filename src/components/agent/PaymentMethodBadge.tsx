import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CreditCard, Building2, Wallet, Receipt, Banknote, HelpCircle,
  CheckCircle, ChevronDown, ChevronUp, Info,
} from "lucide-react";
import {
  type PaymentMethod,
  type PaymentMethodResult,
  getMethodLabel,
  getBalancingAccount,
  PAYMENT_METHOD_OPTIONS,
} from "@/lib/payment-method-engine";
import { cn } from "@/lib/utils";

interface PaymentMethodBadgeProps {
  result: PaymentMethodResult;
  onMethodChange?: (method: PaymentMethod, balancingAccount: string, balancingAccountName: string) => void;
  compact?: boolean;
}

const METHOD_ICONS: Record<PaymentMethod, typeof CreditCard> = {
  bank: Building2,
  credit_card: CreditCard,
  supplier_invoice: Receipt,
  employee_outlay: Wallet,
  cash: Banknote,
  unknown: HelpCircle,
};

export function PaymentMethodBadge({ result, onMethodChange, compact = false }: PaymentMethodBadgeProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [feedbackText, setFeedbackText] = useState<string | null>(null);

  const Icon = METHOD_ICONS[result.method] || HelpCircle;

  const handleSelect = (method: PaymentMethod) => {
    const acc = getBalancingAccount(method);
    onMethodChange?.(method, acc.account, acc.name);
    setShowOptions(false);
    setFeedbackText("Noterat — vi kommer ihåg detta");
  };

  // Fade out feedback after 2s
  useEffect(() => {
    if (!feedbackText) return;
    const t = setTimeout(() => setFeedbackText(null), 2000);
    return () => clearTimeout(t);
  }, [feedbackText]);

  // ─── High confidence (≥0.8) ─────────────────────
  if (result.confidence >= 0.8 && !result.needsClarification) {
    return (
      <TooltipProvider>
        <div className="space-y-1.5 animate-fade-in">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs gap-1.5 cursor-pointer transition-all",
                    "border-[#BFE6D6] text-[#085041] bg-emerald-50/60",
                    "dark:border-emerald-700 dark:text-emerald-300 dark:bg-emerald-950/20",
                    "hover:bg-[#E1F5EE] dark:hover:bg-emerald-950/40"
                  )}
                  onClick={() => setShowOptions(!showOptions)}
                >
                  <CheckCircle className="h-3 w-3 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_1]" />
                  {compact ? result.balancingAccount : `${getMethodLabel(result.method)} → ${result.balancingAccount}`}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                <p className="font-medium mb-0.5">Betalmetod identifierad</p>
                <p className="text-muted-foreground">{result.evidence}</p>
              </TooltipContent>
            </Tooltip>

            <button
              onClick={() => setShowEvidence(!showEvidence)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
            >
              <Info className="h-3 w-3" />
              {showEvidence ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>

          {showEvidence && (
            <p className="text-xs text-muted-foreground pl-3 border-l-2 border-[#BFE6D6] dark:border-emerald-800 animate-fade-in">
              {result.evidence}
            </p>
          )}

          {showOptions && (
            <MethodOptions onSelect={handleSelect} current={result.method} />
          )}

          <FeedbackMessage text={feedbackText} />
        </div>
      </TooltipProvider>
    );
  }

  // ─── Medium confidence (0.5–0.8) ────────────────
  if (result.confidence >= 0.5 && !result.needsClarification) {
    return (
      <div className="space-y-2 animate-fade-in">
        <div className="bg-amber-50/60 dark:bg-amber-950/15 border border-amber-200/60 dark:border-amber-800/30 rounded-xl p-3 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#FAEEDA] dark:bg-amber-900/40 flex items-center justify-center">
                <Icon className="h-3.5 w-3.5 text-[#7A5417] dark:text-[#C28A2B]" />
              </div>
              <div>
                <p className="text-xs font-medium text-[#7A5417] dark:text-amber-200">
                  Troligen {getMethodLabel(result.method).toLowerCase()}
                </p>
                <p className="text-[10px] text-amber-600/80 dark:text-amber-400/60">
                  {(result.confidence * 100).toFixed(0)}% säkerhet → {result.balancingAccount}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="text-xs text-[#7A5417] dark:text-amber-300 hover:underline font-medium"
            >
              Ändra
            </button>
          </div>

          <button
            onClick={() => setShowEvidence(!showEvidence)}
            className="text-[10px] text-amber-600/70 dark:text-amber-400/50 hover:text-[#7A5417] dark:hover:text-amber-300 mt-1.5 flex items-center gap-1 transition-colors"
          >
            <Info className="h-2.5 w-2.5" />
            Varför detta förslag?
          </button>

          {showEvidence && (
            <p className="text-xs text-amber-700/80 dark:text-amber-300/70 mt-1.5 pl-3 border-l-2 border-amber-300/50 dark:border-amber-700/50 animate-fade-in">
              {result.evidence}
            </p>
          )}
        </div>

        {showOptions && (
          <MethodOptions onSelect={handleSelect} current={result.method} />
        )}

        <FeedbackMessage text={feedbackText} />
      </div>
    );
  }

  // ─── Low confidence / needs clarification ───────
  return (
    <div className="animate-fade-in space-y-2">
      <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-[#F0DDB7] dark:border-amber-800/40 rounded-xl p-3 space-y-2.5">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="h-3.5 w-3.5 text-[#7A5417] shrink-0" />
          <span className="text-xs text-[#7A5417] dark:text-amber-200 font-medium">
            Hur betalades detta?
          </span>
        </div>
        <div className="flex flex-wrap md:flex-row flex-col gap-1.5">
          {PAYMENT_METHOD_OPTIONS.map(opt => {
            const OptIcon = METHOD_ICONS[opt.method];
            return (
              <Button
                key={opt.method}
                size="sm"
                variant="outline"
                className="h-8 text-xs border-amber-300/60 hover:bg-[#FAEEDA] dark:border-amber-700/50 dark:hover:bg-amber-900/30 gap-1.5 justify-start"
                onClick={() => handleSelect(opt.method)}
              >
                <OptIcon className="h-3.5 w-3.5" />
                {opt.label}
              </Button>
            );
          })}
        </div>
      </div>

      <FeedbackMessage text={feedbackText} />
    </div>
  );
}

function MethodOptions({
  onSelect,
  current,
}: {
  onSelect: (method: PaymentMethod) => void;
  current: PaymentMethod;
}) {
  return (
    <div className="flex flex-wrap gap-1 animate-fade-in">
      {PAYMENT_METHOD_OPTIONS.filter(o => o.method !== current).map(opt => {
        const OptIcon = METHOD_ICONS[opt.method];
        return (
          <Button
            key={opt.method}
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1.5 px-2.5"
            onClick={() => onSelect(opt.method)}
          >
            <OptIcon className="h-3 w-3" /> {opt.label}
          </Button>
        );
      })}
    </div>
  );
}

function FeedbackMessage({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p className="text-xs text-[#085041] dark:text-[#1D9E75] flex items-center gap-1 animate-fade-in">
      <CheckCircle className="h-3 w-3" />
      {text}
    </p>
  );
}
