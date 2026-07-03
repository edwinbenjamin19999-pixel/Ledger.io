import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSwish } from "@/hooks/useSwish";
import { SwishSetupFlow } from "./SwishSetupFlow";
import { SwishOverview } from "./SwishOverview";
import { SwishReconciliation } from "./SwishReconciliation";
import { SwishPaymentRequests } from "./SwishPaymentRequests";
import { SwishAnalytics } from "./SwishAnalytics";
import { AlertCircle, RefreshCw } from "lucide-react";
import { DemoModeBanner } from "@/components/common/DemoModeBanner";

function SwishSkeleton() { return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-2 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export function SwishDashboard() { const swish = useSwish();

  if (swish.loading) { return <SwishSkeleton />;
  }

  if (swish.error) { return (
      <Card className="border-destructive/30">
        <CardContent className="py-12 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-destructive/60 mx-auto" />
          <div>
            <p className="font-medium">Kunde inte ladda Swish-modulen</p>
            <p className="text-sm text-muted-foreground mt-1">{swish.error}</p>
          </div>
          <Button variant="outline" onClick={swish.reload} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Försök igen
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!swish.connection) { return <SwishSetupFlow onSetup={swish.setupConnection} />;
  }

  return (
    <div className="space-y-4">
      <DemoModeBanner
        title="Swish Handel — Ej ansluten"
        description="Swish-integrationen kräver ett Swish Handel-avtal via din bank. Data som visas är simulerad. Lansering planeras Q3 2026."
      />
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={swish.reload} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Uppdatera
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Översikt</TabsTrigger>
          <TabsTrigger value="reconciliation">
            Avstämning
            {swish.unmatchedPayments.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs font-medium rounded-full bg-destructive text-destructive-foreground">
                {swish.unmatchedPayments.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="requests">Förfrågningar</TabsTrigger>
          <TabsTrigger value="analytics">Analys</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <SwishOverview
            summary={swish.monthlySummary}
            payments={swish.payments}
            connection={swish.connection}
          />
        </TabsContent>

        <TabsContent value="reconciliation">
          <SwishReconciliation
            unmatchedPayments={swish.unmatchedPayments}
            onMatch={swish.matchPaymentToInvoice}
            onDirectSale={swish.markAsDirectSale}
            onDismiss={swish.dismissPayment}
          />
        </TabsContent>

        <TabsContent value="requests">
          <SwishPaymentRequests
            requests={swish.paymentRequests}
            onSendRequest={swish.sendPaymentRequest}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <SwishAnalytics
            payments={swish.payments}
            summary={swish.monthlySummary}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
