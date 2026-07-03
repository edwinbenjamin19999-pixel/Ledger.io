import { FinancialTableHeader } from "./FinancialTableHeader";
import { FinancialRow } from "./FinancialRow";
import type { FinancialColumn, FinancialRowData } from "./types";

export type TableDensity = "comfortable" | "compact";

export interface FinancialReportTableProps {
  columns: FinancialColumn[];
  rows: FinancialRowData[];
  /** Empty-state message when rows is []. */
  emptyMessage?: string;
  /** Visual density. "compact" = statement/document style. */
  density?: TableDensity;
}

/**
 * Single reusable table used for RR and BR (and any future report).
 * Render-only — all data shaping happens upstream.
 */
export const FinancialReportTable = ({
  columns,
  rows,
  emptyMessage = "Inga poster för perioden",
  density = "comfortable",
}: FinancialReportTableProps) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <FinancialTableHeader columns={columns} />
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="h-24 bg-slate-50/60 dark:bg-slate-900/40 text-center text-slate-500 dark:text-slate-400 text-sm"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <FinancialRow key={row.id} row={row} columns={columns} density={density} />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export type { FinancialColumn, FinancialRowData } from "./types";
