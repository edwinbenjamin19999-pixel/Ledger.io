import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Filter, RotateCcw, List, LayoutGrid, Table as TableIcon, MoreHorizontal, Check, X, Eye, Trash2, Paperclip, Wallet } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export interface ExpenseClaimRow { id: string;
  description: string;
  category: string | null;
  user_name: string;
  company_name: string;
  amount: number;
  vat_amount: number;
  expense_date: string;
  approver_name: string | null;
  status: string;
  account_number: string | null;
  file_count: number;
}

interface Props { claims: ExpenseClaimRow[];
  loading: boolean;
  onSelect: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon?: any }> = { draft: { label: "Utkast", variant: "secondary" },
  pending_approval: { label: "Under attest", variant: "default" },
  approved: { label: "Attesterad", variant: "outline" },
  rejected: { label: "Avvisad", variant: "destructive" },
  paid: { label: "Betald", variant: "outline" },
  paid_via_salary: { label: "Betald via lön", variant: "outline", icon: Wallet },
};

export default function ExpenseListView({ claims, loading, onSelect, onApprove, onReject, onDelete }: Props) { const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

  const statusCounts = useMemo(() => { const counts: Record<string, number> = { all: claims.length };
    for (const c of claims) { counts[c.status] = (counts[c.status] || 0) + 1;
    }
    return counts;
  }, [claims]);

  const filtered = useMemo(() => { let list = claims;
    if (tab !== "all") list = list.filter((c) => c.status === tab);
    if (search) { const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.description.toLowerCase().includes(q) ||
          (c.category || "").toLowerCase().includes(q) ||
          c.user_name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [claims, tab, search]);

  const renderStatusBadge = (status: string) => {
    const s = STATUS_MAP[status] || STATUS_MAP.draft;
    const Icon = s.icon;
    const palette: Record<string, { bg: string; fg: string; border: string; dot: string }> = {
      paid: { bg: "bg-[#E1F5EE]", fg: "text-[#085041]", border: "border-[#BFE6D6]", dot: "bg-[#1D9E75]" },
      paid_via_salary: { bg: "bg-[#E1F5EE]", fg: "text-[#085041]", border: "border-[#BFE6D6]", dot: "bg-[#1D9E75]" },
      approved: { bg: "bg-[#EFF6FF]", fg: "text-[#1E3A5F]", border: "border-[#C8DDF5]", dot: "bg-[#1E3A5F]" },
      pending_approval: { bg: "bg-[#FAEEDA]", fg: "text-[#7A5417]", border: "border-[#F0DDB7]", dot: "bg-[#C28A2B]" },
      rejected: { bg: "bg-[#FCE8E8]", fg: "text-[#7A1A1A]", border: "border-[#F4C8C8]", dot: "bg-[#C73838]" },
      draft: { bg: "bg-[#F1F5F9]", fg: "text-[#475569]", border: "border-[#E2E8F0]", dot: "bg-[#94A3B8]" },
    };
    const p = palette[status] || palette.draft;
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border-[0.5px] px-2.5 h-[22px] text-[11px] font-medium ${p.bg} ${p.fg} ${p.border}`}>
        {Icon ? <Icon className="w-3 h-3" /> : <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />}
        {s.label}
      </span>
    );
  };

  const tabs = [
    { value: "all", label: "Allt" },
    { value: "draft", label: "Utkast" },
    { value: "pending_approval", label: "Under attest" },
    { value: "approved", label: "Attesterad" },
    { value: "rejected", label: "Avvisad" },
    { value: "paid", label: "Betald" },
    { value: "paid_via_salary", label: "Betald via lön" },
  ];

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-[#F1F5F9] p-1 rounded-[10px]">
          {tabs.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="text-xs h-[28px] px-3 rounded-[8px] data-[state=active]:bg-[#0F1F3D] data-[state=active]:text-white data-[state=active]:shadow-none"
            >
              {t.label}
              {statusCounts[t.value] ? (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-semibold">
                  {statusCounts[t.value]}
                </span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Sök beskrivning, kategori, anställd..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {search && (
          <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
            <RotateCcw className="w-4 h-4 mr-1" /> Återställ
          </Button>
        )}
        <div className="ml-auto flex gap-1">
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode("table")}
          >
            <TableIcon className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "card" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode("card")}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Wallet className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>Inga utlägg att visa</p>
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        <Card className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] shadow-none">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Beskrivning</TableHead>
                  <TableHead>Anställd</TableHead>
                  <TableHead className="text-right">Belopp</TableHead>
                  <TableHead className="text-right">Moms</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Konto</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c, i) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-accent/30"
                    onClick={() => onSelect(c.id)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell className="text-sm">{c.category || "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm font-medium">
                      {c.description || "—"}
                    </TableCell>
                    <TableCell className="text-sm">{c.user_name}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">
                      {c.amount.toLocaleString("sv-SE")} kr
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {c.vat_amount.toLocaleString("sv-SE")} kr
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(c.expense_date), "d MMM yyyy", { locale: sv })}
                    </TableCell>
                    <TableCell>{renderStatusBadge(c.status)}</TableCell>
                    <TableCell className="font-mono text-xs">{c.account_number || "—"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelect(c.id); }}>
                            <Eye className="w-4 h-4 mr-2" /> Granska
                          </DropdownMenuItem>
                          {(c.status === "pending_approval" || c.status === "draft") && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onApprove(c.id); }}>
                              <Check className="w-4 h-4 mr-2" /> Attestera
                            </DropdownMenuItem>
                          )}
                          {(c.status === "pending_approval" || c.status === "draft") && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onReject(c.id); }}>
                              <X className="w-4 h-4 mr-2" /> Avvisa
                            </DropdownMenuItem>
                          )}
                          {c.status === "draft" && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Ta bort
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] shadow-none hover:border-[#0F1F3D]/30 transition-colors"
              onClick={() => onSelect(c.id)}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{c.description || "—"}</span>
                  {renderStatusBadge(c.status)}
                </div>
                <div className="text-xs text-muted-foreground">{c.category || "Övrigt"}</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{c.user_name}</span>
                  <span className="font-mono font-semibold">
                    {c.amount.toLocaleString("sv-SE")} kr
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(c.expense_date), "d MMM yyyy", { locale: sv })}
                </div>
                {c.file_count > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Paperclip className="w-3 h-3" /> {c.file_count} fil(er)
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
