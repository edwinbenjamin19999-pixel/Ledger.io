import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Sparkles, Lock } from "lucide-react";

interface CountItem { id: string;
  articleNr: string;
  name: string;
  expected: number;
  counted: number | null;
  diff: number | null;
  value: number | null;
}

export const InventoryCount = () => { const [active, setActive] = useState(false);
  const [items, setItems] = useState<CountItem[]>([]);
  const [showResult, setShowResult] = useState(false);

  const counted = items.filter((i) => i.counted !== null).length;
  const progress = items.length > 0 ? Math.round((counted / items.length) * 100) : 0;
  const totalDiff = items.reduce((s, i) => s + (i.value ?? 0), 0);
  const diffItems = items.filter((i) => i.diff !== null && i.diff !== 0);

  const handleCount = (id: string, val: string) => { const num = val === "" ? null : parseInt(val);
    setItems((prev) =>
      prev.map((i) => { if (i.id !== id) return i;
        const diff = num !== null ? num - i.expected : null;
        return { ...i, counted: num, diff, value: diff !== null ? diff * 10 : null };
      })
    );
  };

  if (!active) { return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" /> Starta ny inventering
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Inga artiklar registrerade ännu. Lägg till artiklar i artikelregistret innan du startar en inventering.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-2">Inventeringstyp</p>
                <Select defaultValue="full">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Fullständig inventering</SelectItem>
                    <SelectItem value="rolling">Rullande (per kategori)</SelectItem>
                    <SelectItem value="sample">Stickprov</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Frekvens</p>
                <Select defaultValue="quarterly">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Månadsvis</SelectItem>
                    <SelectItem value="quarterly">Kvartalsvis</SelectItem>
                    <SelectItem value="yearly">Årsvis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={() => setActive(true)} className="w-full sm:w-auto" disabled={items.length === 0}>
              Starta inventering ({items.length} artiklar)
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardContent className="p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Tips: Mobilanpassat räkneläge</p>
            <p>Öppna denna sida på din telefon eller surfplatta för stora inmatningsfält optimerade för lagerräkning.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showResult) { return (
      <div className="space-y-4">
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> AI-analys av inventeringen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">Inventeringen är klar. Resultat:</p>
            <ul className="text-sm space-y-1.5 text-muted-foreground">
              <li>Total differens: <span className="font-medium text-destructive">{totalDiff.toLocaleString("sv-SE")} kr</span></li>
              <li>{diffItems.filter((i) => (i.diff ?? 0) < 0).length} artiklar har lägre saldo än systemet</li>
              <li>{diffItems.filter((i) => (i.diff ?? 0) > 0).length} artiklar har högre saldo</li>
            </ul>
          </CardContent>
        </Card>

        {diffItems.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Inventeringsdifferenser att bokföra</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {diffItems.map((i) => (
                <div key={i.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{i.articleNr} — {i.name}</p>
                    <p className="text-xs text-muted-foreground">
                      System: {i.expected} st → Räknat: {i.counted} st = {(i.diff ?? 0) > 0 ? "+" : ""}{i.diff} st
                    </p>
                  </div>
                  <span className={`font-mono text-sm font-medium ${(i.value ?? 0) < 0 ? "text-destructive" : "text-[#085041]"}`}>
                    {(i.value ?? 0) > 0 ? "+" : ""}{i.value} kr
                  </span>
                </div>
              ))}
              <div className="pt-3 border-t space-y-2">
                <Button className="w-full">
                  <Lock className="h-4 w-4 mr-2" /> Signera med BankID
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Button variant="outline" onClick={() => { setShowResult(false); setActive(false); }}>
          ← Tillbaka
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Inventeringsframsteg</p>
            <span className="text-sm text-muted-foreground">{counted} av {items.length} artiklar räknade</span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      <div className="space-y-2">
        {items.map((item) => (
          <Card key={item.id} className={item.diff !== null && item.diff !== 0 ? "border-[#F0DDB7]" : ""}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.articleNr} • Förväntat: {item.expected} st</p>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    className="w-24 text-center text-lg font-bold h-12"
                    placeholder="0"
                    value={item.counted ?? ""}
                    onChange={(e) => handleCount(item.id, e.target.value)}
                  />
                  {item.diff !== null && (
                    <Badge
                      variant="outline"
                      className={ item.diff === 0
                          ? "bg-[#E1F5EE] text-[#085041]"
                          : item.diff < 0
                          ? "bg-destructive/10 text-destructive"
                          : "bg-[#EFF6FF] text-blue-600"
                      }
                    >
                      {item.diff > 0 ? "+" : ""}{item.diff}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button onClick={() => setShowResult(true)} disabled={counted < items.length} className="w-full">
        Avsluta inventering och visa resultat
      </Button>
    </div>
  );
};
