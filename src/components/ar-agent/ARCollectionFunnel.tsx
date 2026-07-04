import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ARInvoice } from "./ARAgent";

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

interface Props {
  openInvoices: ARInvoice[];
  collectionCount: number;
  collectionAmount: number;
  writtenOffCount: number;
  writtenOffAmount: number;
}

export const ARCollectionFunnel = ({ openInvoices, collectionCount, collectionAmount, writtenOffCount, writtenOffAmount }: Props) => {
  const now = new Date();
  const overdue = openInvoices.filter(
    (i) => Math.floor((now.getTime() - new Date(i.due_date).getTime()) / 86400000) > 0
  );

  const totalAll = openInvoices.reduce((s, i) => s + i.total_amount, 0);
  const reminder1 = overdue.filter((i) => (i.reminder_count || 0) >= 1);
  const reminder2 = overdue.filter((i) => (i.reminder_count || 0) >= 2);

  const stages = [
    { label: "Alla fordringar", count: openInvoices.length, amount: totalAll, color: "bg-blue-500", width: "100%" },
    { label: "Förfallna", count: overdue.length, amount: overdue.reduce((s, i) => s + i.total_amount, 0), color: "bg-amber-500", width: `${Math.max(10, openInvoices.length > 0 ? (overdue.length / openInvoices.length) * 100 : 0)}%` },
    { label: "Påminnelse 1", count: reminder1.length, amount: reminder1.reduce((s, i) => s + i.total_amount, 0), color: "bg-orange-500", width: `${Math.max(8, openInvoices.length > 0 ? (reminder1.length / openInvoices.length) * 100 : 0)}%` },
    { label: "Påminnelse 2", count: reminder2.length, amount: reminder2.reduce((s, i) => s + i.total_amount, 0), color: "bg-rose-500", width: `${Math.max(6, openInvoices.length > 0 ? (reminder2.length / openInvoices.length) * 100 : 0)}%` },
    { label: "Inkasso", count: collectionCount, amount: collectionAmount, color: "bg-red-600", width: `${Math.max(5, openInvoices.length > 0 ? (collectionCount / openInvoices.length) * 100 : 0)}%` },
    { label: "Avskriven", count: writtenOffCount, amount: writtenOffAmount, color: "bg-slate-500", width: `${Math.max(4, openInvoices.length > 0 ? (writtenOffCount / openInvoices.length) * 100 : 0)}%` },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Inkassotratt</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stages.map((s, i) => {
          const nextStage = stages[i + 1];
          const conversionRate = nextStage && s.count > 0 ? Math.round((nextStage.count / s.count) * 100) : null;
          return (
            <div key={s.label}>
              <div className="flex items-center gap-3">
                <div className="w-28 text-xs font-medium text-muted-foreground text-right flex-shrink-0">
                  {s.label}
                </div>
                <div className="flex-1 relative">
                  <div
                    className={`${s.color} h-9 rounded-lg flex items-center px-3 transition-all`}
                    style={{ width: s.width }}
                  >
                    <span className="text-white text-xs font-semibold tabular-nums whitespace-nowrap">
                      {s.count} st — {fmt(s.amount)} kr
                    </span>
                  </div>
                </div>
              </div>
              {conversionRate !== null && conversionRate > 0 && (
                <div className="flex items-center gap-3 my-1">
                  <div className="w-28" />
                  <div className="text-[10px] text-muted-foreground pl-2">
                    ↓ {conversionRate}% eskaleras
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
