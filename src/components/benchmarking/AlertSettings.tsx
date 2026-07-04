import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell, Plus, Trash2, Info } from "lucide-react";
import { toast } from "sonner";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";

interface AlertRule {
  id: string;
  metric: string;
  operator: "under" | "over";
  value: number;
}

const METRIC_OPTIONS = [
  { value: "net_margin", label: "Nettomarginal (%)" },
  { value: "cash_balance", label: "Kassabalans (kr)" },
  { value: "cost_increase", label: "Kostnadsökning vs förra mån (%)" },
  { value: "dso", label: "Betalningstid DSO (dagar)" },
  { value: "soliditet", label: "Soliditet (%)" },
];

const STORAGE_KEY = "benchmarking_alert_rules";

function loadRules(): AlertRule[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function AlertSettings() {
  const [rules, setRules] = useState<AlertRule[]>(loadRules);
  const [newMetric, setNewMetric] = useState("net_margin");
  const [newOperator, setNewOperator] = useState<"under" | "over">("under");
  const [newValue, setNewValue] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  }, [rules]);

  const addRule = () => {
    const val = parseFloat(newValue);
    if (isNaN(val)) {
      toast.error("Ange ett giltigt värde");
      return;
    }
    const rule: AlertRule = {
      id: crypto.randomUUID(),
      metric: newMetric,
      operator: newOperator,
      value: val,
    };
    setRules((prev) => [...prev, rule]);
    setNewValue("");
    toast.success("Notisregel tillagd");
  };

  const removeRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    toast.success("Regel borttagen");
  };

  const getMetricLabel = (value: string) =>
    METRIC_OPTIONS.find((m) => m.value === value)?.label ?? value;

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <Alert className="border-[#C8DDF5] bg-[#EFF6FF] dark:bg-blue-950/20 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-600 dark:text-[#1E3A5F]" />
        <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
          Benchmarking mot branschdata (SNI-kod) aktiveras när vi byggt ut datapartnerskapen.
          Dina egna tröskelvärden fungerar redan nu.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Bevakningsregler
          </CardTitle>
          <CardDescription>
            Ställ in tröskelvärden för nyckeltal. Du får en notis när ett värde passerar din gräns.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add rule */}
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1 flex-1 min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground">Nyckeltal</label>
              <Select value={newMetric} onValueChange={setNewMetric}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METRIC_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 w-[120px]">
              <label className="text-xs font-medium text-muted-foreground">Villkor</label>
              <Select value={newOperator} onValueChange={(v) => setNewOperator(v as "under" | "over")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="under">är under</SelectItem>
                  <SelectItem value="over">är över</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 w-[120px]">
              <label className="text-xs font-medium text-muted-foreground">Värde</label>
              <Input
                type="number"
                placeholder="t.ex. 10"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
              />
            </div>
            <Button onClick={addRule} className="shrink-0">
              <Plus className="h-4 w-4 mr-1" /> Lägg till
            </Button>
          </div>

          {/* Rules list */}
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Inga bevakningsregler inställda. Lägg till en ovan.
            </p>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="secondary" className="text-xs">{getMetricLabel(rule.metric)}</Badge>
                    <span className="text-muted-foreground">{rule.operator === "under" ? "sjunker under" : "överstiger"}</span>
                    <span className="font-semibold">{rule.value}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeRule(rule.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {rules.length > 0 && (
            <ComingSoonButton tooltipText="Notisregler sparas lokalt — serverlagring lanseras snart" className="w-full">
              Spara notisregler
            </ComingSoonButton>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
