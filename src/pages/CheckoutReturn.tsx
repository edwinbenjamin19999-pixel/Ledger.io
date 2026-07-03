import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function CheckoutReturn() { const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-6 text-center space-y-4">
          {sessionId ? (
            <>
              <CheckCircle className="w-16 h-16 text-[#085041] mx-auto" />
              <h1 className="text-2xl font-bold">Tack för din beställning!</h1>
              <p className="text-muted-foreground">
                Din prenumeration är nu aktiv. Du kan börja använda Ledger.io direkt.
              </p>
              <Button asChild className="w-full mt-4">
                <Link to="/dashboard">Gå till Dashboard</Link>
              </Button>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold">Ingen session hittad</h1>
              <p className="text-muted-foreground">
                Det verkar som att något gick fel med betalningen.
              </p>
              <Button asChild variant="outline" className="w-full mt-4">
                <Link to="/pricing">Tillbaka till prissidan</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
