import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

interface DeadlineCalendarSidebarProps { companyId: string;
}

interface CalendarDeadline { day: number;
  month: number;
  label: string;
  type: string;
}

const monthNames = ['', 'januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];

export const DeadlineCalendarSidebar = ({ companyId }: DeadlineCalendarSidebarProps) => { const deadlines = useMemo(() => { const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const items: CalendarDeadline[] = [];

    // Generate next 3 months of deadlines
    for (let m = month; m <= Math.min(month + 3, 12); m++) { items.push({ day: 12, month: m, label: 'AGI + F-skatt', type: 'agi' });
      if (m % 3 === 1 && m > 1) { items.push({ day: 26, month: m, label: 'Moms (kvartalsvis)', type: 'vat' });
      }
    }

    // Annual report deadline (6 months after fiscal year end)
    items.push({ day: 30, month: 6, label: `Årsredovisning ${year - 1}`, type: 'annual' });

    // INK2
    items.push({ day: 2, month: 5, label: `Inkomstdeklaration ${year - 1}`, type: 'ink2' });

    // Filter and sort
    return items
      .filter(d => d.month >= month || (d.month === month && d.day >= now.getDate()))
      .sort((a, b) => a.month !== b.month ? a.month - b.month : a.day - b.day)
      .slice(0, 8);
  }, []);

  const grouped = useMemo(() => { const groups: Record<number, CalendarDeadline[]> = {};
    deadlines.forEach(d => { if (!groups[d.month]) groups[d.month] = [];
      groups[d.month].push(d);
    });
    return groups;
  }, [deadlines]);

  const typeColor: Record<string, string> = { agi: 'bg-[#EFF6FF] text-blue-700 border-[#C8DDF5]',
    vat: 'bg-primary/15 text-primary border-primary/30',
    annual: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
    ink2: 'bg-[#F1F5F9] text-purple-700 border-[#E2E8F0]',
  };

  return (
    <Card className="sticky top-6 relative overflow-hidden bg-[#FAFBFC] border-[0.5px] border-[#DFE4EA] rounded-[12px] shadow-none">
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-[#1D4ED8]" />
      <CardHeader className="pb-2 pt-[14px] px-[14px]">
        <CardTitle className="text-[12px] font-medium text-[#0F172A] flex items-center gap-2">
          <Calendar size={14} strokeWidth={1.5} className="text-[#1D4ED8]" />
          Skattekalender
        </CardTitle>
      </CardHeader>
      <CardContent className="px-[14px] pb-[14px]">
        {Object.entries(grouped).map(([monthStr, items]) => { const m = parseInt(monthStr);
          return (
            <div key={m}>
              <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8] mt-[10px] mb-[4px]">
                {monthNames[m]} {new Date().getFullYear()}
              </p>
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2 py-[3px]">
                  <span className="font-mono text-[11px] text-[#475569] w-[20px]">
                    {item.day}
                  </span>
                  <span className="text-[11px] text-[#0F172A] flex-1">{item.label}</span>
                </div>
              ))}
            </div>
          );
        })}

        <p className="text-[10px] text-[#94A3B8] italic pt-[10px] mt-[8px] border-t-[0.5px] border-[#F1F5F9]">
          AI bevakar alla deadlines och förbereder automatiskt
        </p>
      </CardContent>
    </Card>
  );
};
