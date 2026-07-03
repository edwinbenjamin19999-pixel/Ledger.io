import { CASH_FLOW_ROWS } from "@/lib/annual-report-rows";

interface Props { year: number;
  values: Map<string, number>; // compute key -> value
}

const fmt = (n: number) => { if (n === 0) return "–";
  const neg = n < 0;
  const s = Math.abs(n).toLocaleString("sv-SE", { maximumFractionDigits: 0 });
  return neg ? `- ${s}` : s;
};

export const CashFlowStatement = ({ year, values }: Props) => { return (
    <div>
      <p className="text-xs italic text-muted-foreground mb-2">Belopp i kr</p>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-foreground/30">
            <th className="text-left font-normal py-1"></th>
            <th className="text-right font-normal italic py-1 w-28">
              {year}-01-01–<br />{year}-12-31
            </th>
            <th className="text-right font-normal italic py-1 w-28 text-muted-foreground">
              {year - 1}-01-01–<br />{year - 1}-12-31
            </th>
          </tr>
        </thead>
        <tbody>
          {CASH_FLOW_ROWS.map((row, i) => { const val = row.compute ? (values.get(row.compute) || 0) : 0;

            if (row.isSection) { return (
                <tr key={i}>
                  <td colSpan={3} className="font-bold pt-4 pb-1 text-xs uppercase tracking-wide">
                    {row.label}
                  </td>
                </tr>
              );
            }

            return (
              <tr
                key={i}
                className={`
                  ${row.isGrandTotal ? "border-t-2 border-b-[3px] border-foreground" : ""}
                  ${row.isSubtotal ? "border-t border-foreground/30" : ""}
                `}
              >
                <td
                  className={`py-0.5 pr-4 ${row.isSubtotal || row.isGrandTotal ? "font-bold" : ""}`}
                  style={{ paddingLeft: `${(row.indent || 0) * 16}px` }}
                >
                  {row.label}
                </td>
                <td className={`py-0.5 pl-4 text-right tabular-nums w-28 ${row.isSubtotal || row.isGrandTotal ? "font-bold" : ""}`}>
                  {fmt(val)}
                </td>
                <td className="py-0.5 pl-4 text-right tabular-nums text-muted-foreground w-28">
                  {/* Previous year placeholder */}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Validation */}
      {(() => { const cfTotal = values.get("cf_total") || 0;
        const cashUb = values.get("cash_ub") || 0;
        const cashIb = values.get("cash_ib") || 0;
        const diff = cashUb - cashIb - cfTotal;
        if (Math.abs(diff) > 1) { return (
            <div className="mt-3 p-2 rounded bg-destructive/10 text-destructive text-xs">
              Varning: UB likvida medel ({fmt(cashUb)}) - IB ({fmt(cashIb)}) = {fmt(cashUb - cashIb)}, men årets kassaflöde = {fmt(cfTotal)}. Differens: {fmt(diff)} kr
            </div>
          );
        }
        return null;
      })()}
    </div>
  );
};
