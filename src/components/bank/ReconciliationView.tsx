import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

interface BankAccount { id: string;
  account_name: string;
  balance: number | null;
  currency: string;
  last_synced_at: string | null;
}

interface Transaction { id: string;
  booking_date: string;
  amount: number;
  status: string;
}

interface ReconciliationViewProps { account: BankAccount;
  transactions: Transaction[];
  onSync: (accountId: string) => void;
  syncing: boolean;
}

export function ReconciliationView({ account, transactions, onSync, syncing }: ReconciliationViewProps) { // Calculate reconciliation stats
  const pendingTransactions = transactions.filter((t) => t.status === "pending");
  const matchedTransactions = transactions.filter((t) => t.status === "matched" || t.status === "approved");
  
  const pendingAmount = pendingTransactions.reduce((sum, t) => sum + t.amount, 0);
  const matchedAmount = matchedTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  const bankBalance = account.balance || 0;
  const calculatedBalance = matchedAmount;
  const difference = bankBalance - calculatedBalance;
  const reconciliationRate = transactions.length > 0 
    ? (matchedTransactions.length / transactions.length) * 100 
    : 0;

  const isReconciled = Math.abs(difference) < 0.01; // Allow för minor rounding differences

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Bankavstämning - {account.account_name}</CardTitle>
            <CardDescription>
              Stäm av bokfört saldo mot banksaldo
              {account.last_synced_at && (
                <span className="ml-2">
                  · Synkad {format(new Date(account.last_synced_at), "PPp", { locale: sv })}
                </span>
              )}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSync(account.id)}
            disabled={syncing}
            className="gap-2"
          >
            {syncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Synka
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Reconciliation Status */}
        <Alert variant={isReconciled ? "default" : "destructive"}>
          <div className="flex items-center gap-2">
            {isReconciled ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-[#085041]" />
                <AlertDescription className="text-[#085041] font-semibold">
                  Avstämningen är korrekt! Banksaldo och bokfört saldo stämmer överens.
                </AlertDescription>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5" />
                <AlertDescription className="font-semibold">
                  Avstämningsdifferens: {difference.toLocaleString("sv-SE")} {account.currency}
                </AlertDescription>
              </>
            )}
          </div>
        </Alert>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Matchningsgrad</span>
            <span className="text-sm text-muted-foreground">
              {matchedTransactions.length} av {transactions.length} transaktioner
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${reconciliationRate}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {reconciliationRate.toFixed(1)}% av transaktionerna är matchade
          </p>
        </div>

        {/* Balance Breakdown */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Banksaldo</span>
            </div>
            <p className="text-2xl font-bold">
              {bankBalance.toLocaleString("sv-SE")} {account.currency}
            </p>
            <p className="text-xs text-muted-foreground">Enligt banken</p>
          </div>

          <div className="space-y-2 p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Bokfört saldo</span>
            </div>
            <p className="text-2xl font-bold">
              {calculatedBalance.toLocaleString("sv-SE")} {account.currency}
            </p>
            <p className="text-xs text-muted-foreground">Matchade transaktioner</p>
          </div>

          <div className="space-y-2 p-4 rounded-lg border bg-muted">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Väntande transaktioner</span>
            </div>
            <p className="text-2xl font-bold">
              {pendingAmount.toLocaleString("sv-SE")} {account.currency}
            </p>
            <p className="text-xs text-muted-foreground">
              {pendingTransactions.length} transaktioner väntar på matchning
            </p>
          </div>

          <div className={`space-y-2 p-4 rounded-lg border ${isReconciled ? 'bg-[#E1F5EE] border-[#BFE6D6]' : 'bg-[#FCE8E8] border-[#F4C8C8]'}`}>
            <div className="flex items-center gap-2">
              {isReconciled ? (
                <CheckCircle2 className="h-4 w-4 text-[#085041]" />
              ) : (
                <XCircle className="h-4 w-4 text-[#7A1A1A]" />
              )}
              <span className="text-sm font-medium">Differens</span>
            </div>
            <p className={`text-2xl font-bold ${isReconciled ? 'text-[#085041]' : 'text-[#7A1A1A]'}`}>
              {difference.toLocaleString("sv-SE")} {account.currency}
            </p>
            <p className="text-xs text-muted-foreground">
              {isReconciled ? "Avstämd" : "Kräver granskning"}
            </p>
          </div>
        </div>

        {/* Action Items */}
        {!isReconciled && pendingTransactions.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Åtgärd krävs:</strong> Matcha de {pendingTransactions.length} väntande transaktionerna för att slutföra avstämningen.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
