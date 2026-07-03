import { AlertCircle, RefreshCcw, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorFallbackProps { error?: Error;
  resetError?: () => void;
  message?: string;
}

export const ErrorFallback = ({ error, 
  resetError,
  message = "Något gick fel"
}: ErrorFallbackProps) => { return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-destructive/10 rounded-full">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle className="text-destructive">{message}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-mono text-muted-foreground break-words">
                {error.message}
              </p>
              {error.stack && (
                <details className="mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer">
                    Visa teknisk detalj
                  </summary>
                  <pre className="text-[11px] font-mono text-muted-foreground mt-2 whitespace-pre-wrap break-words">
                    {error.stack.split("\n").slice(0, 4).join("\n")}
                  </pre>
                </details>
              )}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Detta kan bero på ett tillfälligt problem eller en föråldrad version i webbläsaren. Prova att ladda om sidan helt.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            {resetError && (
              <Button onClick={resetError} variant="outline" className="flex-1">
                <RefreshCcw className="w-4 h-4 mr-2" />
                Försök igen
              </Button>
            )}
            <Button onClick={() => window.location.reload()} className="flex-1">
              <RotateCw className="w-4 h-4 mr-2" />
              Ladda om sidan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
