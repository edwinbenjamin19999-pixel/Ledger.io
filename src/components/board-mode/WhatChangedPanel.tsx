import { ArrowDown, ArrowUp, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BoardChange } from "@/hooks/useBoardSummary";

export const WhatChangedPanel = ({ changes }: { changes: BoardChange[] }) => (
  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
    <div className="flex items-center gap-2 mb-4">
      <TrendingUp className="h-4 w-4 text-gray-400" />
      <h3 className="text-[11px] uppercase tracking-widest text-gray-400 font-medium">Vad har förändrats</h3>
    </div>
    {changes.length === 0 ? (
      <p className="text-gray-400 text-sm">Inga betydande förändringar denna period.</p>
    ) : (
      <ul>
        {changes.map((c, i) => {
          const Icon = c.direction === "up" ? ArrowUp : ArrowDown;
          const positive = c.direction === "up";
          return (
            <li
              key={i}
              className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-b-0"
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 mt-0.5",
                  positive ? "text-emerald-500" : "text-red-400"
                )}
              />
              <div className="flex-1 min-w-0">
                <p className="text-gray-700 text-sm leading-snug">{c.explanation}</p>
              </div>
              {c.delta_pct !== null && (
                <span
                  className={cn(
                    "text-xs font-mono font-medium tabular-nums shrink-0 mt-0.5",
                    positive ? "text-emerald-500" : "text-red-500"
                  )}
                >
                  {positive ? "+" : ""}{c.delta_pct.toFixed(1)}%
                </span>
              )}
            </li>
          );
        })}
      </ul>
    )}
  </div>
);
