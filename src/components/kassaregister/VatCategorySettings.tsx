import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePosVatCategories, formatKr } from "@/hooks/useKassaregister";
import { ACTIVE_COMPANY_STORAGE_KEY } from "@/lib/company-selection";
import { Plus } from "lucide-react";

const VAT_RATES = [
  { value: "25", label: "25% (standard)" },
  { value: "12", label: "12% (mat, hotell)" },
  { value: "6", label: "6% (böcker, kultur)" },
  { value: "0", label: "0% (momsfritt)" },
];

export function VatCategorySettings() { const { categories, addCategory } = usePosVatCategories();
  const companyId = localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);

  const [newCategory, setNewCategory] = useState("");
  const [newRate, setNewRate] = useState("25");
  const [newAccount, setNewAccount] = useState("3010");

  const handleAdd = () => { if (!companyId || !newCategory) return;
    addCategory.mutate({ company_id: companyId,
      pos_category: newCategory,
      vat_rate: parseFloat(newRate),
      account_number: newAccount,
      account_name: null,
      description: null,
    });
    setNewCategory("");
  };

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Momskategorier</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Mappa dina kassasystemets produktkategorier till rätt momssats. AI använder dessa för automatisk bokföring.
          </p>

          {categories.length > 0 ? (
            <div className="space-y-2 mb-4">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">{cat.pos_category}</p>
                    <p className="text-xs text-muted-foreground">Konto {cat.account_number}</p>
                  </div>
                  <span className="text-sm font-bold">{cat.vat_rate}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">Inga kategorier konfigurerade</p>
          )}

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Lägg till kategori</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Kategori</Label>
                <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="T.ex. Lunch" />
              </div>
              <div>
                <Label className="text-xs">Momssats</Label>
                <Select value={newRate} onValueChange={setNewRate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VAT_RATES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Konto</Label>
                <Input value={newAccount} onChange={(e) => setNewAccount(e.target.value)} placeholder="3010" />
              </div>
            </div>
            <Button onClick={handleAdd} disabled={!newCategory || addCategory.isPending} className="gap-1.5 bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white">
              <Plus className="h-4 w-4" />
              Lägg till
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
