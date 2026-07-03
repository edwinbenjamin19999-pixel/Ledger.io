import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, BAR_ANIMATION, LINE_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths } from "date-fns";
import { sv } from "date-fns/locale";
import { useChartTheme } from "@/hooks/useChartTheme";

interface Transaction { booking_date: string;
  amount: number;
  currency: string;
  chart_of_accounts: { account_number: string;
    account_name: string;
    account_type: string;
  } | null;
}

interface BankAnalyticsProps { transactions: Transaction[];
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export function BankAnalytics({ transactions }: BankAnalyticsProps) { const chartTheme = useChartTheme(); // Calculate cashflow data (daily balance change over last 30 days)
  const getCashflowData = () => {
  const today = new Date();
    const thirtyDaysAgo = subMonths(today, 1);
    const days = eachDayOfInterval({ start: thirtyDaysAgo, end: today });

    return days.map((day) => { const dayStr = format(day, "yyyy-MM-dd");
      const dayTransactions = transactions.filter(
        (t) => format(new Date(t.booking_date), "yyyy-MM-dd") === dayStr
      );
      const income = dayTransactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
      const expenses = Math.abs(
        dayTransactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)
      );

      return { date: format(day, "d MMM", { locale: sv }),
        income,
        expenses,
        net: income - expenses,
      };
    });
  };

  // Calculate expenses by category
  const getExpensesByCategory = () => { const expenseTransactions = transactions.filter((t) => t.amount < 0);
    const categoryMap = new Map<string, number>();

    expenseTransactions.forEach((t) => { const category = t.chart_of_accounts?.account_name || "Okategoriserad";
      const current = categoryMap.get(category) || 0;
      categoryMap.set(category, current + Math.abs(t.amount));
    });

    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 categories
  };

  // Calculate monthly comparison
  const getMonthlyComparison = () => { const currentMonth = new Date();
    const lastMonth = subMonths(currentMonth, 1);

    const currentMonthTransactions = transactions.filter((t) => { const date = new Date(t.booking_date);
      return date >= startOfMonth(currentMonth) && date <= endOfMonth(currentMonth);
    });

    const lastMonthTransactions = transactions.filter((t) => { const date = new Date(t.booking_date);
      return date >= startOfMonth(lastMonth) && date <= endOfMonth(lastMonth);
    });

    const calculateTotals = (txns: Transaction[]) => { const income = txns.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
      const expenses = Math.abs(txns.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
      return { income, expenses };
    };

    const current = calculateTotals(currentMonthTransactions);
    const last = calculateTotals(lastMonthTransactions);

    return [
      { month: format(lastMonth, "MMMM", { locale: sv }),
        Inkomster: last.income,
        Utgifter: last.expenses,
      },
      { month: format(currentMonth, "MMMM", { locale: sv }),
        Inkomster: current.income,
        Utgifter: current.expenses,
      },
    ];
  };

  const cashflowData = getCashflowData();
  const expensesData = getExpensesByCategory();
  const monthlyData = getMonthlyComparison();

  return (
    <div className="space-y-[14px]">
      <div className="grid gap-[14px] md:grid-cols-2">
        {/* Cashflow Chart */}
        <div className="md:col-span-2 bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] overflow-hidden">
          <div className="px-[16px] py-[12px] border-b-[0.5px] border-[#E2E8F0]">
            <h3 className="text-[13px] font-medium text-[#0F172A]">Kassaflöde (senaste 30 dagarna)</h3>
            <p className="text-[11px] text-[#94A3B8] mt-[2px]">Dagliga inkomster och utgifter</p>
          </div>
          <div className="p-[16px]">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={cashflowData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#1D9E75" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0B4F6C" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#0B4F6C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={TOOLTIP_CURSOR} />
                <Legend content={<CustomLegend />} />
                <Area type="monotone" dataKey="income" stroke="#1D9E75" fillOpacity={1} fill="url(#colorIncome)" name="Inkomster" />
                <Area type="monotone" dataKey="expenses" stroke="#0B4F6C" fillOpacity={1} fill="url(#colorExpenses)" name="Utgifter" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Comparison */}
        <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] overflow-hidden">
          <div className="px-[16px] py-[12px] border-b-[0.5px] border-[#E2E8F0]">
            <h3 className="text-[13px] font-medium text-[#0F172A]">Månadsjämförelse</h3>
            <p className="text-[11px] text-[#94A3B8] mt-[2px]">Inkomster vs utgifter per månad</p>
          </div>
          <div className="p-[16px]">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <ChartGradients />
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={TOOLTIP_CURSOR} />
                <Legend content={<CustomLegend />} />
                <Bar dataKey="Inkomster" fill="#1D9E75" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Utgifter" fill="#0B4F6C" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses by Category */}
        <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] overflow-hidden">
          <div className="px-[16px] py-[12px] border-b-[0.5px] border-[#E2E8F0]">
            <h3 className="text-[13px] font-medium text-[#0F172A]">Utgifter per kategori</h3>
            <p className="text-[11px] text-[#94A3B8] mt-[2px]">Top 5 utgiftskategorier</p>
          </div>
          <div className="p-[16px]">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={expensesData}
                  cx="50%" cy="50%" labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value.toLocaleString("sv-SE")} kr`}
                  outerRadius={80} fill="#8884d8" dataKey="value"
                >
                  {expensesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={chartTheme.tooltipStyle}
                  formatter={(value: number) => `${value.toLocaleString("sv-SE")} kr`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
