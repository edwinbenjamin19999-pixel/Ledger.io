import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, AlertTriangle, XCircle, Search, Brain, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MigrationState, AccountMapping } from "../MigrationWizard";

interface Props { state: MigrationState;
  updateState: (u: Partial<MigrationState>) => void;
  companyId: string;
}

export const MigrationMappingStep = ({ state, updateState, companyId }: Props) => { const [targetAccounts, setTargetAccounts] = useState<{ account_number: string; account_name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData();
  }, [companyId]);

  const loadData = async () => { setLoading(true);
    // Load target chart of accounts
    const { data: accounts } = await supabase
      .from("chart_of_accounts")
      .select("account_number, account_name")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("account_number");
    
    setTargetAccounts(accounts || []);

    // Auto-generate mappings from import summary
    if (state.accountMappings.length === 0 && state.importSummary) { generateAutoMappings(accounts || []);
    }
    setLoading(false);
  };

  // BAS-baserad heuristik: hitta närmaste mål i kontoplanen för ett källkonto.
  // 1) exakt match → 2) samma 3 siffror → 3) samma 2 → 4) samma kontoklass.
  const suggestTarget = (
    source: string,
    targets: { account_number: string; account_name: string }[],
  ): { account_number: string; account_name: string; confidence: number } | null => {
    if (!source || !targets.length) return null;
    const exact = targets.find((t) => t.account_number === source);
    if (exact) return { ...exact, confidence: 100 };
    for (const len of [3, 2, 1]) {
      const prefix = source.slice(0, len);
      const cand = targets.find((t) => t.account_number.startsWith(prefix));
      if (cand) return { ...cand, confidence: len === 3 ? 90 : len === 2 ? 75 : 60 };
    }
    return null;
  };

  const generateAutoMappings = (targets: { account_number: string; account_name: string }[]) => {
    const summary = state.importSummary;
    const importedAccounts: any[] = summary?.importedAccounts || [];
    // No demo fallback — if no real imported accounts, mapping table stays empty
    // (user hasn't committed an SIE import yet for this wizard session).
    if (!importedAccounts.length) {
      updateState({ accountMappings: [] });
      return;
    }
    const sources = importedAccounts.map((a: any) => ({
      number: a.number,
      name: a.name || `Konto ${a.number}`,
    }));

    const mappings: AccountMapping[] = sources.map((acc) => {
      const ai = suggestTarget(acc.number, targets);
      if (ai && ai.confidence === 100) {
        return {
          sourceAccount: acc.number,
          sourceName: acc.name,
          targetAccount: ai.account_number,
          targetName: ai.account_name,
          status: "matched",
          confidence: 100,
        };
      }
      if (ai) {
        return {
          sourceAccount: acc.number,
          sourceName: acc.name,
          targetAccount: ai.account_number,
          targetName: ai.account_name,
          status: "suggested",
          confidence: ai.confidence,
        };
      }
      return {
        sourceAccount: acc.number,
        sourceName: acc.name,
        targetAccount: "",
        targetName: "",
        status: "missing",
        confidence: 0,
      };
    });

    updateState({ accountMappings: mappings });
  };

  // Fyll i AI-förslag på rader som saknar giltigt mål (mål inte i kontoplanen, tom, eller missing).
  const fillMissingSuggestions = () => {
    const updated = state.accountMappings.map((m) => {
      const targetExists = m.targetAccount && targetAccounts.some((t) => t.account_number === m.targetAccount);
      if (targetExists && m.status !== "missing") return m;
      const ai = suggestTarget(m.sourceAccount, targetAccounts);
      if (!ai) return { ...m, targetAccount: "", targetName: "", status: "missing" as const, confidence: 0 };
      return {
        ...m,
        targetAccount: ai.account_number,
        targetName: ai.account_name,
        status: (ai.confidence === 100 ? "matched" : "suggested") as AccountMapping["status"],
        confidence: ai.confidence,
      };
    });
    updateState({ accountMappings: updated });
  };

  // När kontoplanen laddats: auto-fyll förslag på rader med ogiltigt/tomt mål.
  useEffect(() => {
    if (!targetAccounts.length || !state.accountMappings.length) return;
    const needsFill = state.accountMappings.some(
      (m) => !m.targetAccount || !targetAccounts.some((t) => t.account_number === m.targetAccount),
    );
    if (needsFill) fillMissingSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetAccounts]);

  const updateMapping = (index: number, targetAccount: string) => { const updated = [...state.accountMappings];
    const target = targetAccounts.find(t => t.account_number === targetAccount);
    updated[index] = { ...updated[index],
      targetAccount,
      targetName: target?.account_name || "",
      status: target ? "manual" : "missing",
      confidence: target ? 100 : 0,
    };
    updateState({ accountMappings: updated });
  };

  const stats = { matched: state.accountMappings.filter(m => m.status === "matched").length,
    suggested: state.accountMappings.filter(m => m.status === "suggested" || m.status === "manual").length,
    missing: state.accountMappings.filter(m => m.status === "missing").length,
    total: state.accountMappings.length,
  };

  const filtered = state.accountMappings.filter(m =>
    m.sourceAccount.includes(searchQuery) ||
    m.sourceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.targetAccount.includes(searchQuery)
  );

  if (loading) { return <div className="text-center py-12 text-muted-foreground">Laddar kontomappning...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Kontomappning</h2>
        <p className="text-muted-foreground text-sm">AI har automatiskt mappat konton. Granska och justera vid behov.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-[#085041]" />
            <div>
              <p className="text-lg font-bold">{stats.matched}</p>
              <p className="text-[10px] text-muted-foreground">Exakt matchade</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#7A5417]" />
            <div>
              <p className="text-lg font-bold">{stats.suggested}</p>
              <p className="text-[10px] text-muted-foreground">AI-förslag</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-[#7A1A1A]" />
            <div>
              <p className="text-lg font-bold">{stats.missing}</p>
              <p className="text-[10px] text-muted-foreground">Saknar mappning</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI suggestion */}
      {stats.suggested > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3 flex items-center gap-3">
            <Brain className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">AI har föreslagit mappningar för {stats.suggested} konton</p>
              <p className="text-xs text-muted-foreground">Baserat på BAS-standard och kontonumrering. Granska de markerade raderna nedan.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => { const updated = state.accountMappings.map(m => m.status === "suggested" ? { ...m, status: "matched" as const } : m);
              updateState({ accountMappings: updated });
            }}>
              <CheckCircle className="h-3 w-3 mr-1" />Godkänn alla
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Sök konto..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
      </div>

      {/* Mapping table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Källkonto</th>
                  <th className="text-left p-3 font-medium">Källnamn</th>
                  <th className="text-center p-3 font-medium">→</th>
                  <th className="text-left p-3 font-medium">Målkonto</th>
                  <th className="text-left p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((m, i) => { const realIndex = state.accountMappings.indexOf(m);
                  return (
                    <tr key={i} className={m.status === "missing" ? "bg-red-50/50 dark:bg-red-950/10" : m.status === "suggested" ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}>
                      <td className="p-3 font-mono text-xs">{m.sourceAccount}</td>
                      <td className="p-3">{m.sourceName}</td>
                      <td className="p-3 text-center text-muted-foreground">→</td>
                      <td className="p-3">
                        <Select value={m.targetAccount} onValueChange={v => updateMapping(realIndex, v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Välj konto..." />
                          </SelectTrigger>
                          <SelectContent>
                            {targetAccounts.map(t => (
                              <SelectItem key={t.account_number} value={t.account_number} className="text-xs">
                                {t.account_number} — {t.account_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3">
                        {m.status === "matched" && <Badge variant="default" className="text-[10px] bg-emerald-600">Matchad</Badge>}
                        {m.status === "suggested" && <Badge variant="secondary" className="text-[10px]">AI-förslag ({m.confidence}%)</Badge>}
                        {m.status === "manual" && <Badge variant="outline" className="text-[10px]">Manuell</Badge>}
                        {m.status === "missing" && <Badge variant="destructive" className="text-[10px]">Saknas</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
