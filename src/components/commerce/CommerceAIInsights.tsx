import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, AlertTriangle, TrendingUp, TrendingDown, CreditCard,
  Gift, ArrowLeftRight, ShieldAlert, Package, BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Insight { icon: typeof AlertTriangle;
  title: string;
  description: string;
  severity: "info" | "warning" | "critical" | "positive";
}

const insights: Insight[] = [
  { icon: CreditCard,
    title: "Klarna-utbetalning avviker från förväntat",
    description: "Utbetalning 12 april: förväntat 34 200 kr, mottaget 32 960 kr. Differens 1 240 kr kan bero på ändrade avgifter. Kontrollera Klarna-kontot.",
    severity: "warning",
  },
  { icon: ArrowLeftRight,
    title: "Hög returandel på Shopify",
    description: "Returgraden denna månad är 6.5% — över er gräns på 5%. Mest returnerade: 'Premium T-shirt XL' (12 returer). Undersök storleksguide.",
    severity: "critical",
  },
  { icon: Gift,
    title: "Presentkort närmar sig utgångsdatum",
    description: "3 presentkort (totalt 2 400 kr) går ut inom 30 dagar. Vid utgång intäktsförs beloppet automatiskt på konto 3990.",
    severity: "info",
  },
  { icon: TrendingUp,
    title: "POS-försäljning över förväntan",
    description: "Kassaförsäljningen har ökat 18% jämfört med budget. Lördagar är starkaste dagen med snitt 42 300 kr.",
    severity: "positive",
  },
  { icon: BarChart3,
    title: "Multi-VAT-fördelning kontrollerad",
    description: "Alla transaktioner senaste 7 dagarna har korrekt momsuppdelning (25/12/6%). Inga avvikelser upptäckta.",
    severity: "positive",
  },
  { icon: Package,
    title: "Lagervärde sjunkit 8% utan motsvarande COGS",
    description: "Lageravvikelse detekterad: 4 artiklar visar lägre saldo än förväntat baserat på bokförda försäljningar. Kontrollera svinn.",
    severity: "warning",
  },
  { icon: ShieldAlert,
    title: "Dubblettransaktioner förhindrade",
    description: "Systemet blockerade 2 potentiella dubbletter från Stripe webhook (samma belopp, <5 min mellanrum). Inga felaktiga bokningar skapades.",
    severity: "info",
  },
  { icon: TrendingDown,
    title: "Amazon-marginal under gränsvärde",
    description: "Snittmarginal på Amazon-ordrar: 12.3% (under ert mål på 20%). Avgifter och frakt äter marginalen. Överväg prisökning.",
    severity: "critical",
  },
];

const severityConfig = { critical: { border: "border-l-red-500", bg: "bg-[#FCE8E8] dark:bg-red-950/10", iconColor: "text-[#7A1A1A]" },
  warning: { border: "border-l-amber-500", bg: "bg-[#FAEEDA] dark:bg-amber-950/10", iconColor: "text-[#7A5417]" },
  positive: { border: "border-l-emerald-500", bg: "bg-[#E1F5EE] dark:bg-emerald-950/10", iconColor: "text-[#085041]" },
  info: { border: "border-l-primary", bg: "bg-primary/5", iconColor: "text-primary" },
};

export function CommerceAIInsights() { return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-base font-semibold">AI-analys — Unified Commerce</h3>
        <span className="text-xs text-muted-foreground ml-auto">{insights.length} insikter</span>
      </div>

      <div className="space-y-2">
        {insights.map((insight, i) => { const config = severityConfig[insight.severity];
          const Icon = insight.icon;
          return (
            <Card key={i} className={cn("border-l-4 transition-all hover:shadow-sm", config.border, config.bg)}>
              <CardContent className="py-3">
                <div className="flex items-start gap-3">
                  <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", config.iconColor)} />
                  <div>
                    <p className="text-sm font-medium">{insight.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
