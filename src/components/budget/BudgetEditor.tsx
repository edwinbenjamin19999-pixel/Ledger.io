import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChevronRight,
  ChevronDown,
  Save,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

const MONTH_KEYS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"] as const;
type MonthKey = typeof MONTH_KEYS[number];
type BudgetViewMode = "month" | "quarter" | "year";

interface BudgetRow { id: string;
  account_number: string;
  account_name: string;
  jan: number; feb: number; mar: number; apr: number; maj: number; jun: number;
  jul: number; aug: number; sep: number; okt: number; nov: number; dec: number;
  annual_total: number;
  ai_generated: boolean;
  manually_adjusted: boolean;
  notes: string | null;
}

interface CategoryNode { label: string;
  range: [string, string];
  children?: CategoryNode[];
}

const ACCOUNT_TREE: CategoryNode[] = [
  { label: "Intäkter",
    range: ["3000", "3999"],
    children: [
      { label: "Nettoomsättning", range: ["3000", "3799"] },
      { label: "Övriga rörelseintäkter", range: ["3900", "3999"] },
    ],
  },
  { label: "Kostnader",
    range: ["4000", "7899"],
    children: [
      { label: "Råvaror & handelsvaror", range: ["4000", "4999"] },
      { label: "Externa kostnader", range: ["5000", "6999"] },
      { label: "Personalkostnader", range: ["7000", "7699"] },
      { label: "Avskrivningar", range: ["7800", "7899"] },
    ],
  },
  { label: "Finansiella poster", range: ["8000", "8999"] },
];

interface BudgetEditorProps { budgetId: string;
  companyId: string;
  status: string;
}

export const BudgetEditor = ({ budgetId, companyId, status }: BudgetEditorProps) => { const [rows, setRows] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [viewMode, setViewMode] = useState<BudgetViewMode>("month");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(ACCOUNT_TREE.map(c => c.label)));
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>();
  const isLocked = status === "locked" || status === "approved";

  useEffect(() => { loadRows();
  }, [budgetId]);

  useEffect(() => { if (!dirty) return;
    autoSaveTimer.current = setTimeout(() => saveRows(), 30000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [dirty]);

  const loadRows = async () => { setLoading(true);
    const { data, error } = await supabase
      .from("budget_rows")
      .select("*")
      .eq("budget_id", budgetId)
      .order("account_number");

    if (error) { toast.error("Kunde inte ladda budgetrader");
      console.error(error);
    } else { setRows((data || []) as unknown as BudgetRow[]);
    }
    setLoading(false);
  };

  const saveRows = useCallback(async () => { if (!dirty || isLocked) return;
    setSaving(true);
    try { const updates = rows.map((r) => ({ id: r.id,
        budget_id: budgetId,
        account_number: r.account_number,
        account_name: r.account_name,
        jan: r.jan, feb: r.feb, mar: r.mar, apr: r.apr,
        maj: r.maj, jun: r.jun, jul: r.jul, aug: r.aug,
        sep: r.sep, okt: r.okt, nov: r.nov, dec: r.dec,
        manually_adjusted: r.manually_adjusted,
        notes: r.notes,
      }));

      const { error } = await supabase.from("budget_rows").upsert(updates);
      if (error) throw error;
      setDirty(false);
      toast.success("Budget sparad");
    } catch (e: any) { toast.error("Kunde inte spara");
    } finally { setSaving(false);
    }
  }, [rows, dirty, budgetId, isLocked]);

  const updateCell = (rowIdx: number, month: MonthKey, value: string) => { if (isLocked) return;
    const num = value === "" ? 0 : parseFloat(value) || 0;
    setRows((prev) => { const copy = [...prev];
      copy[rowIdx] = { ...copy[rowIdx],
        [month]: num,
        manually_adjusted: true,
        annual_total: MONTH_KEYS.reduce((sum, k) => sum + (k === month ? num : copy[rowIdx][k]), 0),
      };
      return copy;
    });
    setDirty(true);
  };

  const filterRows = (range: [string, string]) =>
    rows.filter((r) => r.account_number >= range[0] && r.account_number <= range[1]);

  const categoryTotal = (range: [string, string], month: MonthKey) =>
    filterRows(range).reduce((s, r) => s + r[month], 0);

  const categoryAnnual = (range: [string, string]) =>
    filterRows(range).reduce((s, r) => s + MONTH_KEYS.reduce((ms, m) => ms + r[m], 0), 0);

  const toggleCategory = (label: string) => { setExpandedCategories((prev) => { const copy = new Set(prev);
      if (copy.has(label)) copy.delete(label); else copy.add(label);
      return copy;
    });
  };

  const fmt = (n: number) => n.toLocaleString("sv-SE");

  const resultRow = () => { const income = ACCOUNT_TREE[0]; // Intäkter
    const costs = ACCOUNT_TREE[1]; // Kostnader
    const financial = ACCOUNT_TREE[2]; // Finansiella
    return MONTH_KEYS.map((m) => { const inc = categoryTotal(income.range, m);
      const cost = categoryTotal(costs.range, m);
      const fin = categoryTotal(financial.range, m);
      return inc - cost + fin;
    });
  };

  const result = resultRow();
  const resultAnnual = result.reduce((s, v) => s + v, 0);

  if (loading) { return <div className="flex items-center justify-center py-12 text-muted-foreground">Laddar budget...</div>;
  }

  const renderCategoryRows = (node: CategoryNode, depth = 0) => { const isExpanded = expandedCategories.has(node.label);
    const filtered = filterRows(node.range);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.label}>
        {/* Category summary row */}
        <div
          className={cn(
            "flex items-center border-b bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors",
            depth === 0 && "bg-muted/60 font-semibold"
          )}
          onClick={() => toggleCategory(node.label)}
        >
          <div className="flex items-center gap-1 min-w-[240px] px-3 py-2 sticky left-0 bg-inherit z-10 border-r" style={{ paddingLeft: `${12 + depth * 16}px` }}>
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
            <span className="text-xs truncate">{node.label}</span>
          </div>
          {viewMode === "month" && MONTH_KEYS.map((m) => (
            <div key={m} className="w-[90px] min-w-[90px] text-right px-2 py-2 text-xs font-medium tabular-nums border-r">
              {fmt(categoryTotal(node.range, m))}
            </div>
          ))}
          <div className="w-[100px] min-w-[100px] text-right px-2 py-2 text-xs font-bold tabular-nums bg-muted/40">
            {fmt(categoryAnnual(node.range))}
          </div>
        </div>

        {/* Expanded children or rows */}
        {isExpanded && (
          <>
            {hasChildren
              ? node.children!.map((child) => renderCategoryRows(child, depth + 1))
              : filtered.map((row, ri) => { const rowIdx = rows.findIndex((r) => r.id === row.id);
                  return (
                    <div key={row.id} className="flex items-center border-b hover:bg-accent/30 transition-colors">
                      <div className="min-w-[240px] px-3 py-1.5 sticky left-0 bg-background z-10 border-r" style={{ paddingLeft: `${12 + (depth + 1) * 16}px` }}>
                        <span className="text-xs text-muted-foreground">{row.account_number}</span>
                        <span className="text-xs ml-1.5">{row.account_name}</span>
                      </div>
                      {viewMode === "month" && MONTH_KEYS.map((m) => (
                        <div key={m} className="w-[90px] min-w-[90px] border-r">
                          <input
                            type="number"
                            value={row[m] || ""}
                            onChange={(e) => updateCell(rowIdx, m, e.target.value)}
                            disabled={isLocked}
                            className={cn(
                              "w-full h-full text-right text-xs px-2 py-1.5 bg-transparent outline-none tabular-nums",
                              "focus:bg-primary/5 focus:ring-1 focus:ring-primary/30",
                              row[m] === 0 && "text-muted-foreground/40",
                              isLocked && "cursor-not-allowed"
                            )}
                          />
                        </div>
                      ))}
                      <div className="w-[100px] min-w-[100px] text-right px-2 py-1.5 text-xs font-medium tabular-nums bg-muted/20">
                        {fmt(MONTH_KEYS.reduce((s, k) => s + row[k], 0))}
                      </div>
                    </div>
                  );
                })}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background shrink-0">
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as BudgetViewMode)}>
            <TabsList className="h-8">
              <TabsTrigger value="month" className="text-xs h-7 px-3">Månad</TabsTrigger>
              <TabsTrigger value="quarter" className="text-xs h-7 px-3">Kvartal</TabsTrigger>
              <TabsTrigger value="year" className="text-xs h-7 px-3">Helår</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-xs text-muted-foreground">Osparade ändringar</span>}
          <Button size="sm" onClick={saveRows} disabled={!dirty || saving || isLocked} className="h-8 text-xs gap-1.5">
            <Save className="w-3.5 h-3.5" />
            {saving ? "Sparar..." : "Spara"}
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
          {/* Header */}
          <div className="flex items-center border-b bg-muted/50 sticky top-0 z-20">
            <div className="min-w-[240px] px-3 py-2 text-xs font-semibold sticky left-0 bg-muted/50 z-30 border-r">
              Konto
            </div>
            {viewMode === "month" && MONTH_KEYS.map((m) => (
              <div key={m} className="w-[90px] min-w-[90px] text-center text-xs font-semibold py-2 border-r capitalize">
                {m}
              </div>
            ))}
            <div className="w-[100px] min-w-[100px] text-center text-xs font-bold py-2 bg-muted/40">
              Helår
            </div>
          </div>

          {/* Account tree rows */}
          {ACCOUNT_TREE.map((node) => renderCategoryRows(node))}

          {/* Result row */}
          <div className="flex items-center border-t-2 border-primary/30 bg-primary/5 font-bold sticky bottom-0">
            <div className="min-w-[240px] px-3 py-2.5 text-xs sticky left-0 bg-primary/5 z-10 border-r">
              Resultat
            </div>
            {viewMode === "month" && result.map((v, i) => (
              <div key={i} className={cn(
                "w-[90px] min-w-[90px] text-right px-2 py-2.5 text-xs tabular-nums border-r",
                v >= 0 ? "text-[#085041]" : "text-[#7A1A1A]"
              )}>
                {fmt(v)}
              </div>
            ))}
            <div className={cn(
              "w-[100px] min-w-[100px] text-right px-2 py-2.5 text-xs font-bold tabular-nums bg-primary/10",
              resultAnnual >= 0 ? "text-[#085041]" : "text-[#7A1A1A]"
            )}>
              {fmt(resultAnnual)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
