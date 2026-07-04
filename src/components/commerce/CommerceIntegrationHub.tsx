import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingBag, CreditCard, Smartphone, Store, Wifi, WifiOff, RefreshCw,
  Settings2, ArrowLeftRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Integration { id: string;
  name: string;
  category: "pos" | "ecommerce" | "payment";
  icon: typeof ShoppingBag;
  status: "connected" | "disconnected" | "syncing" | "error";
  lastSync?: string;
  transactions?: number;
}

const INTEGRATIONS: Integration[] = [
  { id: "zettle", name: "Zettle by PayPal", category: "pos", icon: Store, status: "connected", lastSync: "2 min sedan", transactions: 312 },
  { id: "sitoo", name: "Sitoo", category: "pos", icon: Store, status: "disconnected" },
  { id: "shopify", name: "Shopify", category: "ecommerce", icon: ShoppingBag, status: "connected", lastSync: "15 min sedan", transactions: 87 },
  { id: "amazon", name: "Amazon", category: "ecommerce", icon: ShoppingBag, status: "disconnected" },
  { id: "woocommerce", name: "WooCommerce", category: "ecommerce", icon: ShoppingBag, status: "disconnected" },
  { id: "stripe", name: "Stripe", category: "payment", icon: CreditCard, status: "connected", lastSync: "5 min sedan", transactions: 43 },
  { id: "klarna", name: "Klarna", category: "payment", icon: CreditCard, status: "connected", lastSync: "1h sedan", transactions: 28 },
  { id: "swish", name: "Swish Handel", category: "payment", icon: Smartphone, status: "disconnected" },
];

const statusConfig = { connected: { label: "Ansluten", color: "border-[#BFE6D6] text-[#085041] bg-[#E1F5EE] dark:bg-emerald-950/20", icon: Wifi },
  disconnected: { label: "Ej ansluten", color: "border-border text-muted-foreground", icon: WifiOff },
  syncing: { label: "Synkar...", color: "border-blue-300 text-blue-600 bg-[#EFF6FF] dark:bg-blue-950/20", icon: RefreshCw },
  error: { label: "Fel", color: "border-red-300 text-[#7A1A1A] bg-[#FCE8E8] dark:bg-red-950/20", icon: WifiOff },
};

const categoryLabels = { pos: "Kassasystem", ecommerce: "E-handel", payment: "Betalningar" };

export function CommerceIntegrationHub() { const grouped = { pos: INTEGRATIONS.filter((i) => i.category === "pos"),
    ecommerce: INTEGRATIONS.filter((i) => i.category === "ecommerce"),
    payment: INTEGRATIONS.filter((i) => i.category === "payment"),
  };

  const connectedCount = INTEGRATIONS.filter((i) => i.status === "connected").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeftRight className="h-4 w-4" />
        {connectedCount} av {INTEGRATIONS.length} integrationer anslutna
      </div>

      {(["pos", "ecommerce", "payment"] as const).map((cat) => (
        <div key={cat}>
          <h3 className="text-sm font-semibold mb-2">{categoryLabels[cat]}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {grouped[cat].map((intg) => { const cfg = statusConfig[intg.status];
              const StatusIcon = cfg.icon;
              const Icon = intg.icon;
              return (
                <Card key={intg.id} className={cn(
                  "group transition-all hover:shadow-md",
                  intg.status === "connected" && "ring-1 ring-emerald-200/50"
                )}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "h-9 w-9 rounded-lg flex items-center justify-center",
                          intg.status === "connected" ? "bg-[#E1F5EE] dark:bg-emerald-900/30" : "bg-muted"
                        )}>
                          <Icon className={cn(
                            "h-4 w-4",
                            intg.status === "connected" ? "text-[#085041]" : "text-muted-foreground"
                          )} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{intg.name}</p>
                          {intg.lastSync && (
                            <p className="text-[10px] text-muted-foreground">Senast: {intg.lastSync}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px]", cfg.color)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {cfg.label}
                      </Badge>
                    </div>

                    {intg.transactions && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {intg.transactions} transaktioner denna månad
                      </p>
                    )}

                    <Button
                      variant={intg.status === "connected" ? "outline" : "default"}
                      size="sm"
                      className="w-full text-xs"
                    >
                      {intg.status === "connected" ? (
                        <><Settings2 className="h-3 w-3 mr-1" /> Hantera</>
                      ) : (
                        "Anslut"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
