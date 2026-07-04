import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { useTimeRates, formatKr } from "@/hooks/useTimeTracking";
import { ACTIVE_COMPANY_STORAGE_KEY } from "@/lib/company-selection";

export function RateSettings() { const { rates, upsertRate } = useTimeRates();
  const companyId = localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);

  const [newLabel, setNewLabel] = useState("Standard");
  const [newRate, setNewRate] = useState("");
  const [newClient, setNewClient] = useState("");
  const [newDefault, setNewDefault] = useState(false);

  const handleAdd = () => { if (!companyId || !newRate) return;
    upsertRate.mutate({ company_id: companyId,
      rate_label: newLabel,
      hourly_rate: parseFloat(newRate),
      client_name: newClient || null,
      project_id: null,
      is_default: newDefault,
    });
    setNewLabel("Standard");
    setNewRate("");
    setNewClient("");
    setNewDefault(false);
  };

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Timpriser</CardTitle>
        </CardHeader>
        <CardContent>
          {rates.length > 0 ? (
            <div className="space-y-2 mb-4">
              {rates.map((rate) => (
                <div key={rate.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">
                      {rate.rate_label}
                      {rate.is_default && (
                        <span className="ml-2 text-[10px] bg-[#3b82f6]/10 text-[#3b82f6] px-1.5 py-0.5 rounded-full font-semibold">
                          Standard
                        </span>
                      )}
                    </p>
                    {rate.client_name && (
                      <p className="text-xs text-muted-foreground">{rate.client_name}</p>
                    )}
                  </div>
                  <span className="text-sm font-bold">{formatKr(rate.hourly_rate)}/tim</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">Inga timpriser konfigurerade</p>
          )}

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Lägg till timpris</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Benämning</Label>
                <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="T.ex. Senior, Junior" />
              </div>
              <div>
                <Label className="text-xs">Timpris (kr)</Label>
                <Input type="number" value={newRate} onChange={(e) => setNewRate(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Kund (valfritt, lämna tomt för globalt)</Label>
              <Input value={newClient} onChange={(e) => setNewClient(e.target.value)} placeholder="Kundnamn" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={newDefault} onCheckedChange={setNewDefault} id="is-default" />
              <Label htmlFor="is-default" className="text-sm cursor-pointer">Standardpris</Label>
            </div>
            <Button onClick={handleAdd} disabled={!newRate} className="gap-1.5 bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white">
              <Plus className="h-4 w-4" />
              Lägg till
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
