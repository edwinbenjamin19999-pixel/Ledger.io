import { ShoppingBag, Wallet, Package, RotateCcw, Globe, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type EventType = "order" | "payout" | "stock" | "return" | "oss" | "action";

interface FeedEvent { type: EventType;
  title: string;
  body: string;
  time: string;
}

const eventConfig: Record<EventType, { color: string; bgColor: string; icon: typeof ShoppingBag }> = { order: { color: "border-l-teal-500", bgColor: "bg-teal-500", icon: ShoppingBag },
  payout: { color: "border-l-blue-500", bgColor: "bg-blue-500", icon: Wallet },
  stock: { color: "border-l-orange-500", bgColor: "bg-orange-500", icon: Package },
  return: { color: "border-l-red-500", bgColor: "bg-red-500", icon: RotateCcw },
  oss: { color: "border-l-purple-500", bgColor: "bg-purple-500", icon: Globe },
  action: { color: "border-l-yellow-500", bgColor: "bg-yellow-500", icon: AlertTriangle },
};

const demoEvents: FeedEvent[] = [
  { type: "order", title: "Ordrar bokförda", body: "128 nya ordrar bokförda från Shopify (varav 3 EU-ordrar via OSS), separerat plattformsavgifter och förberett momsen.", time: "14:32" },
  { type: "payout", title: "Utbetalning matchad", body: "Utbetalningen på 34 782 kr från Stripe har matchats mot 47 ordrar och bokförts mot ditt bankkonto.", time: "13:15" },
  { type: "return", title: "Retur bokförd", body: "Returen för order #4521 (1 249 kr) är bokförd. Intäkt och moms reverserade, lager +1 enhet.", time: "12:40" },
  { type: "stock", title: "Produkt slutsåld", body: "'Blå sneakers stl 42' (SKU: BS-42) är slutsåld. Försäljning på Shopify pausad automatiskt.", time: "11:22" },
  { type: "oss", title: "OSS-gräns varning", body: "Du närmar dig EU-försäljningsgränsen på 10 000 €. Från och med nästa order kan OSS-regler gälla.", time: "10:05" },
  { type: "action", title: "Åtgärd krävs", body: "3 ordrar saknar produktkategori för momssats. Klicka för att åtgärda.", time: "09:30" },
];

export const ActivityFeed = () => { return (
    <div className="space-y-2">
      <div className="max-h-[380px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent space-y-1.5 pr-1">
        {demoEvents.map((event, i) => { const config = eventConfig[event.type];
          const Icon = config.icon;
          return (
            <div
              key={i}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border-l-[3px] hover:bg-slate-50 dark:hover:bg-muted/30 transition-colors duration-150 bg-card/50",
                config.color
              )}
            >
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", config.bgColor)}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 dark:text-foreground text-sm">{event.title}</p>
                <p className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5 leading-relaxed">{event.body}</p>
              </div>
              <span className="text-xs font-mono bg-slate-100 dark:bg-muted text-slate-500 dark:text-muted-foreground px-2 py-0.5 rounded-full shrink-0">
                {event.time}
              </span>
            </div>
          );
        })}
      </div>
      <button className="text-xs text-teal-600 hover:text-teal-700 font-medium mt-2">
        Visa alla händelser →
      </button>
    </div>
  );
};
