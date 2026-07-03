import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Landmark, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useSkatteagentLiveData } from "@/hooks/useSkatteagentLiveData";

import {
  analyzeTaxPosition,
  type InsightActionKind,
  type TaxInsight,
} from "@/lib/skatteagent/aiTaxAdvisor";

import { ActivationHero } from "@/components/shared/ActivationHero";
import { HeroStatusRow } from "@/components/skatteagent/HeroStatusRow";
import { AITaxInsights } from "@/components/skatteagent/AITaxInsights";
import { ExecutionBar } from "@/components/skatteagent/ExecutionBar";
import { PayFTaxDialog } from "@/components/skatteagent/PayFTaxDialog";
import { AdjustFTaxDialog } from "@/components/skatteagent/AdjustFTaxDialog";
import { TaxCalendarTimeline } from "@/components/skatteagent/TaxCalendarTimeline";
import { TaxForecastScenarios } from "@/components/skatteagent/TaxForecastScenarios";
import { AccountingAuditTrail } from "@/components/skatteagent/AccountingAuditTrail";
import { SKVUpcomingPayments } from "@/components/skatteagent/SKVUpcomingPayments";

export default function SkatteagentPage() {
  const companyId = useCompanyId();
  const navigate = useNavigate();
  const year = new Date().getFullYear();

  const [payOpen, setPayOpen] = useState(false);
  const [payManual, setPayManual] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const live = useSkatteagentLiveData(companyId);
  const insights = useMemo(() => analyzeTaxPosition(live.state), [live.state]);

  const bankAccountOptions = useMemo(
    () =>
      live.bankAccounts.map((a) => ({
        id: a.id,
        bank_name: a.bank_name,
        account_name: a.account_name,
        iban: a.iban,
        hasPisSession: !!a.bank_connection_id,
      })),
    [live.bankAccounts],
  );

  function handleInsightAction(kind: InsightActionKind, _ins: TaxInsight) {
    switch (kind) {
      case "pay_now":
      case "schedule_payment":
        setPayManual(false);
        setPayOpen(true);
        break;
      case "prepare_adjustment":
        setAdjustOpen(true);
        break;
      case "review_calculation":
        navigate("/tax-calculation");
        break;
      case "simulate_impact":
        document.getElementById("skatteagent-forecast")?.scrollIntoView({ behavior: "smooth" });
        break;
    }
  }

  // ───────────────────────────── Empty / activation state ─────────────────────────────
  // No company picked → activation prompt for selecting one.
  // Company picked but completely empty (no GL, no bank, no SKV) → activation hero.
  const showActivation = !companyId || (!live.isLoading && !live.hasAnyData);

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <PageHeader
        icon={Landmark}
        title="Skatteagent"
        subtitle="Tax operations control tower — preliminärskatt, betalning, jämkning & bokföring"
        badge={{ label: "AI", variant: "ai" }}
      />

      <div className="px-8 space-y-6">
        {showActivation ? (
          <ActivationHero
            icon={Sparkles}
            title={
              !companyId
                ? "Välj bolag för att aktivera Skatteagenten"
                : "Aktivera live tax operations"
            }
            valueProp={
              !companyId
                ? "Skatteagenten kräver ett valt bolag för att hämta SKV-data, beräkna preliminärskatt och initiera betalningar — sparar ~6h/månad i administration."
                : "Anslut Skatteverket och din bank för att se live preliminärskatt, betala direkt med BankID och bokföra automatiskt (D 2518 / K 1930)."
            }
            steps={[
              { label: "Välj bolag", done: !!companyId },
              { label: "Anslut Skatteverket (skattekonto + kontohändelser)", done: live.skvConnected },
              { label: "Anslut bank (Open Banking, valfritt PIS för direktbetalning)", done: live.bankAccounts.length > 0 },
            ]}
            primaryCtaLabel={!companyId ? "Välj bolag" : "Anslut Skatteverket"}
            onPrimaryCta={() =>
              navigate(!companyId ? "/companies" : "/settings/skatteverket")
            }
            secondaryCtaLabel={companyId ? "Anslut bank" : undefined}
            onSecondaryCta={companyId ? () => navigate("/bankintegration") : undefined}
          />
        ) : (
          <>
            {/* 1. Hero status */}
            <HeroStatusRow
              state={live.state}
              skvConnected={live.skvConnected}
              skvLastSync={live.skvLastSync}
              bankBalanceTotal={live.bankBalanceTotal}
              onPayNow={() => {
                setPayManual(false);
                setPayOpen(true);
              }}
              onAdjust={() => setAdjustOpen(true)}
              onConnectSKV={() => navigate("/settings/skatteverket")}
            />

            {/* 2. AI insights */}
            <AITaxInsights insights={insights} onAction={handleInsightAction} />

            {/* 2b. Upcoming SKV payments with reminders */}
            <SKVUpcomingPayments companyId={companyId} />

            {/* 3. Execution row */}
            <ExecutionBar
              onPayNow={() => {
                setPayManual(false);
                setPayOpen(true);
              }}
              onSchedule={() => {
                setPayManual(false);
                setPayOpen(true);
              }}
              onAdjust={() => setAdjustOpen(true)}
              onMarkPaid={() => {
                setPayManual(true);
                setPayOpen(true);
              }}
              disabled={live.state.nextDueAmount <= 0}
            />

            {/* 4. Calendar timeline */}
            <TaxCalendarTimeline
              year={year}
              ftaxLines={live.ftaxJournal}
              expectedMonthly={live.state.currentMonthlyFtax}
            />

            {/* 5. Forecast scenarios */}
            <div id="skatteagent-forecast">
              <TaxForecastScenarios state={live.state} />
            </div>

            {/* 6. Audit trail */}
            <AccountingAuditTrail
              ftaxJournal={live.ftaxJournal}
              insights={insights}
              skvLastSync={live.skvLastSync}
              skvConnected={live.skvConnected}
            />
          </>
        )}
      </div>

      {/* Dialogs — only mountable with a real company */}
      {companyId && (
        <>
          <PayFTaxDialog
            open={payOpen}
            onOpenChange={setPayOpen}
            companyId={companyId}
            defaultAmount={live.state.nextDueAmount || 0}
            defaultDate={live.state.nextDueDate || new Date().toISOString().slice(0, 10)}
            bankBalance={live.bankBalanceTotal}
            bankAccounts={bankAccountOptions}
            defaultReference={live.skvUpcoming?.paymentReference ?? live.skvUpcoming?.ocr ?? undefined}
            manualOnly={payManual}
            onBooked={() => live.refetch()}
          />
          <AdjustFTaxDialog
            open={adjustOpen}
            onOpenChange={setAdjustOpen}
            companyId={companyId}
            state={live.state}
          />
        </>
      )}
    </div>
  );
}
