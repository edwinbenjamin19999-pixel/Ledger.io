import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ASSET_CATEGORIES, getCategoriesForClass, getCategoryByKey, type AssetClass, CLASS_LABELS } from "@/lib/asset-types";
import { DEPRECIATION_METHODS, canDirectExpense, type DepreciationMethod } from "@/lib/depreciation-rules";
import { AlertTriangle, Sparkles, ArrowRight, Check } from "lucide-react";

interface CreateAssetWizardProps { open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateAsset: (data: any) => Promise<any>;
  prefill?: { name?: string; cost?: number; date?: string; account?: string };
}

export const CreateAssetWizard = ({ open, onOpenChange, onCreateAsset, prefill }: CreateAssetWizardProps) => { const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ asset_name: prefill?.name || "",
    asset_class: "" as AssetClass | "",
    category: "",
    acquisition_date: prefill?.date || new Date().toISOString().split("T")[0],
    acquisition_cost: prefill?.cost ? String(prefill.cost) : "",
    residual_value: "0",
    useful_life_years: "5",
    depreciation_method: "straight_line" as DepreciationMethod,
    supplier_name: "",
    location: "",
    serial_number: "",
    notes: "",
  });

  const selectedCategory = getCategoryByKey(form.category);
  const isFinancial = form.asset_class === "financial";
  const cost = parseFloat(form.acquisition_cost) || 0;
  const canDirect = canDirectExpense(cost);

  const handleCategorySelect = (key: string) => { const cat = getCategoryByKey(key);
    if (!cat) return;
    setForm(prev => ({ ...prev,
      category: key,
      asset_class: cat.class,
      useful_life_years: cat.hasDepreciation ? String(cat.usefulLifeYears) : "0",
    }));
  };

  const handleSubmit = async () => { setSaving(true);
    await onCreateAsset({ asset_name: form.asset_name,
      asset_type: selectedCategory?.label || form.category,
      asset_class: form.asset_class || "tangible",
      category: form.category,
      status: "active",
      acquisition_date: form.acquisition_date,
      acquisition_cost: cost,
      residual_value: parseFloat(form.residual_value) || 0,
      useful_life_years: parseInt(form.useful_life_years) || 5,
      depreciation_method: isFinancial ? "none" : form.depreciation_method,
      supplier_name: form.supplier_name || null,
      location: form.location || null,
      serial_number: form.serial_number || null,
      notes: form.notes || null,
    });
    setSaving(false);
    onOpenChange(false);
    setStep(1);
    setForm({ asset_name: "", asset_class: "", category: "",
      acquisition_date: new Date().toISOString().split("T")[0],
      acquisition_cost: "", residual_value: "0", useful_life_years: "5",
      depreciation_method: "straight_line", supplier_name: "", location: "",
      serial_number: "", notes: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "Vad är det du vill registrera?"}
            {step === 2 && "AI-förslag"}
            {step === 3 && "Detaljer"}
            {step === 4 && "Bekräfta"}
          </DialogTitle>
          <div className="flex gap-1 mt-2">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Vad har du köpt eller investerat i?</Label>
              <Input
                value={form.asset_name}
                onChange={e => setForm({ ...form, asset_name: e.target.value })}
                placeholder="T.ex. MacBook Pro, Lagerlokal, Patent..."
              />
            </div>
            <div className="space-y-2">
              <Label>Välj typ</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(["tangible", "intangible", "financial"] as AssetClass[]).map(cls => (
                  <button
                    key={cls}
                    onClick={() => setForm({ ...form, asset_class: cls, category: "" })}
                    className={`p-3 rounded-lg border text-sm text-center transition-colors ${ form.asset_class === cls ? "border-primary bg-primary/5 font-medium" : "border-border hover:border-primary/50"
                    }`}
                  >
                    {CLASS_LABELS[cls]}
                  </button>
                ))}
              </div>
            </div>
            {form.asset_class && (
              <div className="space-y-2">
                <Label>Kategori</Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {getCategoriesForClass(form.asset_class as AssetClass).map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => handleCategorySelect(cat.key)}
                      className={`p-2 rounded-lg border text-left text-sm transition-colors ${ form.category === cat.key ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <p className="font-medium">{cat.label}</p>
                      <p className="text-xs text-muted-foreground">{cat.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setStep(2)} disabled={!form.asset_name || !form.category}>
                Nästa <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && selectedCategory && (
          <div className="space-y-4 py-2">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-primary font-medium text-sm">
                <Sparkles className="w-4 h-4" />
                AI-förslag baserat på "{form.asset_name}"
              </div>
              <div className="text-sm space-y-1">
                <p>Typ: <strong>{CLASS_LABELS[selectedCategory.class]}</strong></p>
                <p>Kategori: <strong>{selectedCategory.label}</strong></p>
                {selectedCategory.hasDepreciation && (
                  <>
                    <p>Föreslagen nyttjandeperiod: <strong>{selectedCategory.usefulLifeYears} år</strong></p>
                    <p>Konto: {selectedCategory.assetAccount} (tillgång) / {selectedCategory.expenseAccount} (avskrivning)</p>
                  </>
                )}
                {!selectedCategory.hasDepreciation && (
                  <p className="text-muted-foreground">Finansiella tillgångar skrivs inte av — de värderas istället</p>
                )}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Ändra</Button>
              <Button onClick={() => setStep(3)}>
                Stämmer <Check className="w-4 h-4 ml-1" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Inköpsdatum</Label>
                <Input type="date" value={form.acquisition_date} onChange={e => setForm({ ...form, acquisition_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Inköpspris (kr)</Label>
                <Input type="number" value={form.acquisition_cost} onChange={e => setForm({ ...form, acquisition_cost: e.target.value })} placeholder="0" />
              </div>
            </div>
            {canDirect && cost > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg border border-[#F0DDB7] bg-[#FAEEDA] text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 text-[#7A5417] shrink-0" />
                <div>
                  <p className="font-medium">Direktavdrag möjligt</p>
                  <p className="text-muted-foreground">Tillgångar under 29 400 kr kan kostnadsföras direkt istället</p>
                </div>
              </div>
            )}
            {!isFinancial && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nyttjandeperiod (år)</Label>
                  <Input type="number" min={1} max={100} value={form.useful_life_years} onChange={e => setForm({ ...form, useful_life_years: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Avskrivningsmetod</Label>
                  <Select value={form.depreciation_method} onValueChange={v => setForm({ ...form, depreciation_method: v as DepreciationMethod })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DEPRECIATION_METHODS.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Leverantör</Label>
                <Input value={form.supplier_name} onChange={e => setForm({ ...form, supplier_name: e.target.value })} placeholder="Valfritt" />
              </div>
              <div className="space-y-2">
                <Label>{form.asset_class === "tangible" ? "Serienummer" : "Referens"}</Label>
                <Input value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} placeholder="Valfritt" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Anteckningar</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Valfritt" />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Tillbaka</Button>
              <Button onClick={() => setStep(4)} disabled={!form.acquisition_cost}>
                Granska <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 4 && selectedCategory && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Namn</span>
                <span className="font-medium">{form.asset_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Typ</span>
                <span>{CLASS_LABELS[selectedCategory.class]} — {selectedCategory.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Inköpsdatum</span>
                <span>{form.acquisition_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Inköpspris</span>
                <span className="font-medium">{cost.toLocaleString("sv-SE")} kr</span>
              </div>
              {!isFinancial && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nyttjandeperiod</span>
                    <span>{form.useful_life_years} år</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Årlig avskrivning</span>
                    <span>{Math.round(cost / parseInt(form.useful_life_years || "5")).toLocaleString("sv-SE")} kr</span>
                  </div>
                </>
              )}
              {selectedCategory.assetAccount && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Konterar på</span>
                  <span>{selectedCategory.assetAccount}</span>
                </div>
              )}
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              {isFinancial
                ? "Denna tillgång bokförs som en finansiell anläggningstillgång och skrivs inte av automatiskt. Du kan manuellt registrera nedskrivningar eller värdeförändringar."
                : `Värdet på denna tillgång minskas automatiskt med ${Math.round(cost / parseInt(form.useful_life_years || "5")).toLocaleString("sv-SE")} kr per år under ${form.useful_life_years} år.`
              }
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep(3)}>Tillbaka</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? "Sparar..." : "Bekräfta och skapa"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
