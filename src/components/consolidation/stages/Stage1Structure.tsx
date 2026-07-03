import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Building2, GitBranch, Trash2, LayoutList, Network, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface GroupStructureEntry { id: string;
  parent_entity_id: string;
  child_entity_id: string;
  ownership_pct: number;
  voting_pct: number;
  consolidation_method: string;
  acquisition_date: string | null;
  acquisition_price: number | null;
  net_assets_at_acquisition: number | null;
  goodwill_amount: number | null;
  status: string;
  parent_entity?: { name: string; org_number: string };
  child_entity?: { name: string; org_number: string };
}

interface Company { id: string; name: string; org_number: string; }

interface Stage1Props { groupId: string; onComplete: () => void; }

const METHOD_LABELS: Record<string, string> = { full: "Fullkonsolidering",
  equity: "Kapitalandelsmetoden",
  proportional: "Klyvningsmetoden",
  excluded: "Exkluderas",
};

const METHOD_BADGE_CLASS: Record<string, string> = { full: "method-badge-full",
  equity: "method-badge-equity",
  proportional: "method-badge-proportional",
  excluded: "method-badge-excluded",
};

export const Stage1Structure = ({ groupId, onComplete }: Stage1Props) => { const [entries, setEntries] = useState<GroupStructureEntry[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "tree">("table");

  const [parentId, setParentId] = useState("");
  const [childId, setChildId] = useState("");
  const [ownershipPct, setOwnershipPct] = useState("100");
  const [votingPct, setVotingPct] = useState("100");
  const [method, setMethod] = useState("full");
  const [acqDate, setAcqDate] = useState("");
  const [acqPrice, setAcqPrice] = useState("");
  const [netAssets, setNetAssets] = useState("");

  useEffect(() => { loadData(); }, [groupId]);

  const loadData = async () => { setIsLoading(true);
    try { const [structRes, compRes] = await Promise.all([
        supabase.from("group_structure")
          .select(`*, parent_entity:companies!group_structure_parent_entity_id_fkey(name, org_number), child_entity:companies!group_structure_child_entity_id_fkey(name, org_number)`)
          .eq("group_id", groupId).order("created_at"),
        supabase.from("companies").select("id, name, org_number").eq("group_id", groupId).order("name"),
      ]);
      if (structRes.error) throw structRes.error;
      if (compRes.error) throw compRes.error;
      setEntries((structRes.data || []) as unknown as GroupStructureEntry[]);
      setCompanies(compRes.data || []);
    } catch (err: any) { toast.error(err.message || "Kunde inte ladda data");
    } finally { setIsLoading(false);
    }
  };

  const handleCreate = async () => { if (!parentId || !childId) { toast.error("Välj moderbolag och dotterbolag"); return; }
    if (parentId === childId) { toast.error("Moderbolag och dotterbolag kan inte vara samma"); return; }
    try { const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ej inloggad");
      const ownership = parseFloat(ownershipPct);
      const netAssetsVal = netAssets ? parseFloat(netAssets) : null;
      const acqPriceVal = acqPrice ? parseFloat(acqPrice) : null;
      const goodwill = acqPriceVal && netAssetsVal ? acqPriceVal - (netAssetsVal * ownership / 100) : null;

      const { error } = await supabase.from("group_structure").insert([{ group_id: groupId, parent_entity_id: parentId, child_entity_id: childId,
        ownership_pct: ownership, voting_pct: parseFloat(votingPct),
        consolidation_method: method, acquisition_date: acqDate || null,
        acquisition_price: acqPriceVal, net_assets_at_acquisition: netAssetsVal,
        goodwill_amount: goodwill, status: "active",
      }]);
      if (error) throw error;
      toast.success("Ägarrelation tillagd");
      setIsDialogOpen(false);
      resetForm();
      loadData();
    } catch (err: any) { toast.error(err.message || "Kunde inte skapa ägarrelation");
    }
  };

  const handleDelete = async (id: string) => { try { const { error } = await supabase.from("group_structure").delete().eq("id", id);
      if (error) throw error;
      toast.success("Ägarrelation borttagen");
      loadData();
    } catch (err: any) { toast.error(err.message || "Kunde inte ta bort");
    }
  };

  const resetForm = () => { setParentId(""); setChildId(""); setOwnershipPct("100"); setVotingPct("100");
    setMethod("full"); setAcqDate(""); setAcqPrice(""); setNetAssets("");
  };

  const fmt = (n: number | null) => n != null ? n.toLocaleString("sv-SE", { maximumFractionDigits: 0 }) : "—";

  // Determine entity index för color dot
  const entityColorIndex = (entityId: string) => { const idx = companies.findIndex(c => c.id === entityId);
    return Math.max(0, idx) % 8;
  };

  if (isLoading) { return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  // Build tree structure för tree view
  const buildTree = () => { const parentIds = new Set(entries.map(e => e.parent_entity_id));
    const childIds = new Set(entries.map(e => e.child_entity_id));
    const roots = [...parentIds].filter(id => !childIds.has(id));

    const renderNode = (entityId: string, depth: number): React.ReactNode => { const company = companies.find(c => c.id === entityId);
      const children = entries.filter(e => e.parent_entity_id === entityId);
      const asChild = entries.find(e => e.child_entity_id === entityId);
      const colorIdx = entityColorIndex(entityId);

      return (
        <div key={entityId} style={{ marginLeft: depth * 32 }} className="mb-2">
          <div className={cn(
            "inline-flex items-start gap-3 p-3 rounded-lg border transition-all hover:shadow-sm",
            depth === 0 ? "bg-primary/5 border-primary/20" : "bg-card border-border"
          )}>
            <span className={`entity-dot entity-dot-${colorIdx} mt-1.5`} />
            <div>
              <div className="font-medium text-sm">{company?.name || "—"}</div>
              <div className="text-[11px] text-muted-foreground">{company?.org_number}</div>
              {asChild && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-medium">{asChild.ownership_pct}%</span>
                  <span className={cn("status-badge text-[10px]", METHOD_BADGE_CLASS[asChild.consolidation_method])}>
                    {METHOD_LABELS[asChild.consolidation_method]}
                  </span>
                </div>
              )}
            </div>
          </div>
          {children.map(c => renderNode(c.child_entity_id, depth + 1))}
        </div>
      );
    };

    if (roots.length === 0 && entries.length > 0) { return entries.map(e => renderNode(e.parent_entity_id, 0));
    }
    return roots.map(r => renderNode(r, 0));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <GitBranch className="w-5 h-5 text-accent" />
                Ägarstruktur
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {entries.length} ägarrelationer • {companies.length} bolag
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  className={cn("px-3 py-1.5 text-xs font-medium transition-colors", viewMode === "table" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted")}
                  onClick={() => setViewMode("table")}
                >
                  <LayoutList className="w-3.5 h-3.5 inline mr-1" />Tabell
                </button>
                <button
                  className={cn("px-3 py-1.5 text-xs font-medium transition-colors", viewMode === "tree" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted")}
                  onClick={() => setViewMode("tree")}
                >
                  <Network className="w-3.5 h-3.5 inline mr-1" />Träd
                </button>
              </div>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" disabled={companies.length < 2} className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Lägg till
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px]">
                  <DialogHeader>
                    <DialogTitle>Ny ägarrelation</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Moderbolag</Label>
                        <Select value={parentId} onValueChange={setParentId}>
                          <SelectTrigger><SelectValue placeholder="Välj..." /></SelectTrigger>
                          <SelectContent>
                            {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Dotterbolag</Label>
                        <Select value={childId} onValueChange={setChildId}>
                          <SelectTrigger><SelectValue placeholder="Välj..." /></SelectTrigger>
                          <SelectContent>
                            {companies.filter(c => c.id !== parentId).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Ägarandel %</Label>
                        <Input type="number" min="0" max="100" step="0.01" value={ownershipPct} onChange={e => setOwnershipPct(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Röstetal %</Label>
                        <Input type="number" min="0" max="100" step="0.01" value={votingPct} onChange={e => setVotingPct(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Metod</Label>
                        <Select value={method} onValueChange={setMethod}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full">Fullkonsolidering</SelectItem>
                            <SelectItem value="equity">Kapitalandelsmetoden</SelectItem>
                            <SelectItem value="proportional">Klyvningsmetoden</SelectItem>
                            <SelectItem value="excluded">Exkluderas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Förvärvsdatum</Label>
                        <Input type="date" value={acqDate} onChange={e => setAcqDate(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Förvärvspris (kr)</Label>
                        <Input type="number" step="0.01" value={acqPrice} onChange={e => setAcqPrice(e.target.value)} placeholder="0" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Nettotillgångar</Label>
                        <Input type="number" step="0.01" value={netAssets} onChange={e => setNetAssets(e.target.value)} placeholder="0" />
                      </div>
                    </div>
                    {acqPrice && netAssets && (
                      <div className="p-3 bg-muted rounded-lg text-sm">
                        <strong>Beräknad goodwill:</strong>{" "}
                        {fmt(parseFloat(acqPrice) - (parseFloat(netAssets) * parseFloat(ownershipPct) / 100))} kr
                      </div>
                    )}
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Avbryt</Button>
                      <Button onClick={handleCreate}>Lägg till</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {companies.length < 2 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium mb-1">Inga bolag att visa</p>
              <p className="text-xs">Lägg till minst 2 bolag i koncernen</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <GitBranch className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium mb-1">Inga ägarrelationer</p>
              <p className="text-xs mb-4">Definiera ägarstrukturen för att börja konsolidera</p>
              <Button variant="outline" size="sm" className="border-dashed" onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Skapa första relationen
              </Button>
            </div>
          ) : viewMode === "tree" ? (
            <div className="py-4">
              {buildTree()}
              <div className="flex gap-4 mt-6 pt-4 border-t border-border">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-primary/20 border border-primary/40" /> Fullkonsolidering
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="w-2 h-2 rounded-full" style={{ background: "hsl(38 92% 50%)" }} /> Kapitalandel
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/30" /> Exkluderas
                </div>
              </div>
            </div>
          ) : (
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">MODERBOLAG</TableHead>
                    <TableHead className="text-[11px]">DOTTERBOLAG</TableHead>
                    <TableHead className="text-right text-[11px]">ÄG.%</TableHead>
                    <TableHead className="text-right text-[11px]">RÖST%</TableHead>
                    <TableHead className="text-[11px]">METOD</TableHead>
                    <TableHead className="text-right text-[11px]">GOODWILL</TableHead>
                    <TableHead className="text-[11px]">STATUS</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map(e => { const parentIdx = entityColorIndex(e.parent_entity_id);
                    const childIdx = entityColorIndex(e.child_entity_id);
                    return (
                      <TableRow key={e.id} className="h-[52px] group">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`entity-dot entity-dot-${parentIdx}`} />
                            <div>
                              <div className="font-medium text-sm">{e.parent_entity?.name || "—"}</div>
                              <div className="text-[11px] text-muted-foreground">{e.parent_entity?.org_number}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`entity-dot entity-dot-${childIdx}`} />
                            <div>
                              <div className="font-medium text-sm">{e.child_entity?.name || "—"}</div>
                              <div className="text-[11px] text-muted-foreground">{e.child_entity?.org_number}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="tabular-nums text-sm font-medium">{e.ownership_pct}%</div>
                          <div className="ownership-bar">
                            <div
                              className={`ownership-bar-fill entity-dot-${childIdx}`}
                              style={{ width: `${e.ownership_pct}%`,
                                background: `hsl(var(--entity-${childIdx + 1}))`
                              }}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{e.voting_pct}%</TableCell>
                        <TableCell>
                          <span className={cn("status-badge", METHOD_BADGE_CLASS[e.consolidation_method])}>
                            {METHOD_LABELS[e.consolidation_method] || e.consolidation_method}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {e.goodwill_amount != null ? (
                            <Tooltip>
                              <TooltipTrigger className="underline decoration-dotted cursor-help">
                                {fmt(e.goodwill_amount)} kr
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Förvärvspris: {fmt(e.acquisition_price)} kr</p>
                                <p className="text-xs">Nettotillgångar: {fmt(e.net_assets_at_acquisition)} kr</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "status-badge",
                            e.status === "active" ? "status-approved" : e.status === "disposed" ? "status-rejected" : "status-proposed"
                          )} role="status" aria-label={e.status === "active" ? "Aktiv" : e.status === "disposed" ? "Avyttrad" : "Under förvärv"}>
                            {e.status === "active" ? "Aktiv" : e.status === "disposed" ? "Avyttrad" : "Under förvärv"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(e.id)}>
                            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>

      {entries.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={onComplete}>
            Gå vidare till Datainsamling →
          </Button>
        </div>
      )}
    </div>
  );
};
