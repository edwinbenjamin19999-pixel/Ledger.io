/**
 * Shared types for the unified 4-level drilldown drawer.
 * RR, BR, Budget and Forecast all push the same `DrilldownContext` into the drawer.
 */

import type { Lens } from "@/components/reports/unified/LensSelector";
import type { ReportAccountRow } from "@/components/reports/ProfessionalReportTable";

export type DrilldownLevel = 1 | 2 | 3 | 4;

export interface DrilldownContext {
  companyId: string;
  companyName: string;
  reportKind: "RR" | "BR" | "BUDGET";
  lens: Lens;
  fromDate: Date;
  toDate: Date;
  /** Origin row clicked in the report (section subtotal OR account row). */
  origin: {
    label: string;
    /** Subtotal value for the row in the active lens. */
    value: number;
    /** Comparison value when lens === 'variance'. */
    comparisonValue?: number;
    /** Section key, e.g. "RR.costs.external". */
    sectionKey?: string;
  };
  /** All accounts that contribute to the origin row. */
  accounts: ReportAccountRow[];
}

export interface DrilldownAccountFocus {
  accountNumber: string;
  accountName: string;
}

export interface DrilldownEntryFocus {
  journalEntryId: string;
  verificationNumber?: string | null;
  date: string;
  description: string | null;
  amount: number;
}
