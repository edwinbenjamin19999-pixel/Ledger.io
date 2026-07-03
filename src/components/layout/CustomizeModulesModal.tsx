import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GripVertical, X, Plus, Settings2, LayoutGrid, Package, Eye, EyeOff, ChevronDown, RotateCcw } from "lucide-react";
import { useModuleOrder } from "@/hooks/useModuleOrder";
import { useTenant } from "@/contexts/TenantContext";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { buildNavGroups, flattenGroupItems } from "@/lib/sidebar-nav-config";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CustomizeModulesModal = ({ open, onOpenChange }: Props) => {
  const { tenant } = useTenant();
  const aiName = tenant?.ai?.ai_name || "AI Ekonom";
  const navGroups = useMemo(() => buildNavGroups(aiName), [aiName]);

  const {
    order, hiddenModules, hiddenItems,
    updateOrder, addModule, removeModule, toggleItem,
    resetAll,
    DEFAULT_ORDER, EXTRA_MODULES,
  } = useModuleOrder();

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Active modules in saved order — only those that exist in current navGroups
  const knownLabels = new Set(navGroups.map((g) => g.label));
  const activeModules = order.filter((m) => !hiddenModules.includes(m) && knownLabels.has(m));
  const availableExtras = EXTRA_MODULES.filter(
    (m) => !activeModules.includes(m.id) || hiddenModules.includes(m.id)
  );
  const hiddenDefaults = DEFAULT_ORDER.filter((m) => hiddenModules.includes(m));

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIdx(idx);
    // Required for Firefox to actually start a drag
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", String(idx)); } catch { /* noop */ }
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIdx(idx);
  };

  const handleDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    const newActive = [...activeModules];
    const [moved] = newActive.splice(dragIdx, 1);
    newActive.splice(idx, 0, moved);

    // Preserve hidden modules at their original positions
    const hiddenInOrder = order
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => hiddenModules.includes(m));

    const fullOrder = [...newActive];
    for (const { m, i } of hiddenInOrder) {
      const insertAt = Math.min(i, fullOrder.length);
      if (!fullOrder.includes(m)) fullOrder.splice(insertAt, 0, m);
    }

    updateOrder(fullOrder);
    setDragIdx(null);
    setOverIdx(null);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setOverIdx(null);
  };

  // Get flattened toggleable items for a module group
  const getGroupFlatItems = (moduleId: string) => {
    const group = navGroups.find((g) => g.label === moduleId);
    return group ? flattenGroupItems(group) : [];
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Settings2 className="h-5 w-5 text-[hsl(var(--sidebar-accent))]" />
              Anpassa din Ledger.io
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Dra i handtaget för att ändra ordning. Dölj hela modulgrupper eller enskilda menyval.
            </p>
          </DialogHeader>

          {/* Active Modules */}
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Aktiva moduler
              </h3>
            </div>
            <div className="space-y-1">
              {activeModules.map((moduleId, idx) => {
                const items = getGroupFlatItems(moduleId);
                const hasSubItems = items.length > 0;
                const hiddenCount = items.filter((i) => hiddenItems.includes(i.path)).length;

                return (
                  <Collapsible key={moduleId}>
                    <div
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "rounded-lg border bg-card transition-all",
                        dragIdx === idx && "opacity-50 scale-[0.98]",
                        overIdx === idx && dragIdx !== idx && "border-accent bg-accent/5"
                      )}
                    >
                      <div className="flex items-center gap-2 px-2 py-2.5">
                        {/* Drag handle — isolated draggable element */}
                        <div
                          draggable
                          onDragStart={(e) => handleDragStart(e, idx)}
                          onDragEnd={handleDragEnd}
                          className="p-1 -ml-1 cursor-grab active:cursor-grabbing rounded hover:bg-muted text-muted-foreground/60 hover:text-muted-foreground flex-shrink-0"
                          title="Dra för att flytta"
                          aria-label={`Flytta ${moduleId}`}
                        >
                          <GripVertical className="h-4 w-4" />
                        </div>

                        <span className="flex-1 text-sm font-medium select-none">{moduleId}</span>

                        {hiddenCount > 0 && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {hiddenCount} dold{hiddenCount > 1 ? "a" : ""}
                          </span>
                        )}

                        {hasSubItems && (
                          <CollapsibleTrigger asChild>
                            <button
                              draggable={false}
                              type="button"
                              className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
                              title="Visa/dölj enskilda menyval"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </CollapsibleTrigger>
                        )}

                        <button
                          draggable={false}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeModule(moduleId); }}
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Dölj hela modulen"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {hasSubItems && (
                        <CollapsibleContent>
                          <div className="border-t px-3 py-2 space-y-0.5 bg-muted/20">
                            {items.map((item) => {
                              const isHidden = hiddenItems.includes(item.path);
                              return (
                                <div
                                  key={item.path}
                                  className={cn(
                                    "flex items-center justify-between py-1.5 px-2 rounded text-sm",
                                    item.isSubItem && "pl-5",
                                    isHidden && "opacity-60"
                                  )}
                                >
                                  <span className={cn(isHidden && "line-through text-muted-foreground")}>
                                    {item.label}
                                  </span>
                                  <button
                                    draggable={false}
                                    type="button"
                                    onClick={() => toggleItem(item.path)}
                                    className={cn(
                                      "p-1 rounded transition-colors",
                                      isHidden
                                        ? "text-muted-foreground hover:text-foreground hover:bg-accent/10"
                                        : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    )}
                                    title={isHidden ? "Visa menyval" : "Dölj menyval"}
                                  >
                                    {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      )}
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          </div>

          {/* Hidden defaults */}
          {hiddenDefaults.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Dolda moduler
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {hiddenDefaults.map((moduleId) => (
                  <div
                    key={moduleId}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-dashed bg-muted/30"
                  >
                    <span className="text-sm text-muted-foreground">{moduleId}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => addModule(moduleId)}
                      className="h-7 text-xs text-accent hover:text-accent hover:bg-accent/10"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Lägg till
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Extra Modules */}
          {availableExtras.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Tillgängliga moduler
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {availableExtras.map((mod) => (
                  <div
                    key={mod.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-dashed bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{mod.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{mod.description}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => addModule(mod.id)}
                      className="h-7 text-xs text-accent hover:text-accent hover:bg-accent/10 flex-shrink-0 ml-2"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Lägg till
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmReset(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Återställ standard
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Klar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Återställ sidomeny?"
        description="Detta återställer alla moduler, dolda menyval och ordning till standardlayouten. Inga data raderas."
        confirmLabel="Återställ"
        variant="warning"
        onConfirm={() => { resetAll(); }}
      />
    </>
  );
};
