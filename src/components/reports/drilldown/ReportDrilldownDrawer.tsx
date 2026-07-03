/**
 * ReportDrilldownDrawer — single, shared 4-level drawer used by RR, BR,
 * Budget and Forecast. Internal state machine: level 1 → 2 → 3 → 4.
 */
import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { DrilldownBreadcrumb, type BreadcrumbStep } from "./DrilldownBreadcrumb";
import { DrilldownActions } from "./DrilldownActions";
import { L1_RowSummary } from "./L1_RowSummary";
import { L2_AccountBreakdown } from "./L2_AccountBreakdown";
import { L3_JournalEntries } from "./L3_JournalEntries";
import { L4_SourceDocument } from "./L4_SourceDocument";
import type {
  DrilldownAccountFocus,
  DrilldownContext,
  DrilldownEntryFocus,
  DrilldownLevel,
} from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  context: DrilldownContext | null;
}

export function ReportDrilldownDrawer({ open, onClose, context }: Props) {
  const [level, setLevel] = useState<DrilldownLevel>(1);
  const [account, setAccount] = useState<DrilldownAccountFocus | null>(null);
  const [entry, setEntry] = useState<DrilldownEntryFocus | null>(null);

  const reset = () => {
    setLevel(1);
    setAccount(null);
    setEntry(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!context) return null;

  const steps: BreadcrumbStep[] = [
    {
      label: `${context.reportKind} · ${context.origin.label}`,
      onClick: level > 1 ? () => { setLevel(1); setAccount(null); setEntry(null); } : undefined,
    },
    ...(level >= 2
      ? [
          {
            label: account ? `${account.accountNumber} ${account.accountName}` : "Konton",
            onClick: level > 2 && account ? () => { setLevel(2); setEntry(null); } : undefined,
          },
        ]
      : []),
    ...(level >= 3 && entry
      ? [
          {
            label: `Ver. ${entry.verificationNumber || "—"}`,
            onClick: level > 3 ? () => setLevel(3) : undefined,
          },
        ]
      : []),
    ...(level === 4 ? [{ label: "Underlag" }] : []),
  ];

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col overflow-y-auto p-6 sm:max-w-2xl"
      >
        <SheetTitle className="sr-only">Drilldown – {context.origin.label}</SheetTitle>
        <DrilldownBreadcrumb steps={steps} />

        <div className="flex-1">
          {level === 1 && (
            <L1_RowSummary
              ctx={context}
              onSeeAccounts={() => setLevel(2)}
            />
          )}
          {level === 2 && (
            <L2_AccountBreakdown
              ctx={context}
              onPickAccount={(a) => {
                setAccount(a);
                setLevel(3);
              }}
            />
          )}
          {level === 3 && account && (
            <L3_JournalEntries
              ctx={context}
              account={account}
              onPickEntry={(e) => {
                setEntry(e);
                setLevel(4);
              }}
            />
          )}
          {level === 4 && entry && <L4_SourceDocument entry={entry} />}
        </div>

        <DrilldownActions
          onAskCfo={() => {/* future: deep-link AI assistant */}}
          onExport={() => {/* future: export current drilldown */}}
          onFlag={() => {/* future: flag for review */}}
        />
      </SheetContent>
    </Sheet>
  );
}
