import type { MemberCapacity } from "@/hooks/useTeamCapacity";

interface Props { capacity: MemberCapacity[]; }

const WEEKDAYS = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

const cellColor = (count: number, max: number): string => {
  if (count === 0) return "#F1F5F9";
  const intensity = Math.min(1, count / Math.max(1, max));
  // brand cyan with varying alpha
  return `hsl(var(--brand-primary) / ${0.15 + intensity * 0.7})`;
};

export const CapacityHeatmap = ({ capacity }: Props) => {
  const today = new Date();
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return { weekday: WEEKDAYS[(d.getDay() + 6) % 7], date: d.getDate() };
  });
  const max = Math.max(1, ...capacity.flatMap((c) => c.weeklyHeat));

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left text-[10px] uppercase tracking-wider font-bold text-[#94A3B8] py-2 pr-4">Medlem</th>
            {dayLabels.map((d, i) => (
              <th key={i} className="text-center text-[10px] uppercase tracking-wider font-bold text-[#94A3B8] py-2 px-1">
                {d.weekday}<br /><span className="text-[#CBD5E1] tabular-nums">{d.date}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {capacity.map((c) => (
            <tr key={c.member.user_id} className="border-t border-[#F1F5F9]">
              <td className="py-2 pr-4 text-sm font-medium text-[#0F172A] whitespace-nowrap">
                {c.member.display_name}
              </td>
              {c.weeklyHeat.map((count, i) => (
                <td key={i} className="px-1 py-2">
                  <div
                    className="h-9 rounded-md flex items-center justify-center text-xs font-semibold tabular-nums"
                    style={{
                      background: cellColor(count, max),
                      color: count > max * 0.5 ? "#FFFFFF" : "#475569",
                    }}
                    title={`${count} deadlines`}
                  >
                    {count > 0 ? count : ""}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
