import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Camera, ClipboardList, Lock, AlertTriangle, Calendar, CheckCircle } from "lucide-react";

interface ScheduledCount { date: string;
  category: string;
  articleCount: number;
  estimatedMinutes: number;
  priority: "high" | "medium" | "low";
  reason: string;
}

const schedule: ScheduledCount[] = [
  { date: "Idag", category: "Elektronik (A-artiklar)", articleCount: 15, estimatedMinutes: 12, priority: "high", reason: "Hög omsättning — räknas veckovis" },
  { date: "Onsdag", category: "Livsmedel (A-artiklar)", articleCount: 12, estimatedMinutes: 10, priority: "high", reason: "Utgångsdatumkontroll + räkning" },
  { date: "Fredag", category: "Kontorsmaterial (B-artiklar)", articleCount: 28, estimatedMinutes: 20, priority: "medium", reason: "Veckovis stickprov" },
  { date: "Nästa tisdag", category: "Presentartiklar (C-artiklar)", articleCount: 45, estimatedMinutes: 30, priority: "low", reason: "Månadsvis räkning" },
];

interface CountItem { id: string;
  articleNr: string;
  name: string;
  expected: number;
  counted: number | null;
  diff: number | null;
  aiWarning: string | null;
}

const todayItems: CountItem[] = [
  { id: "1", articleNr: "ART-0003", name: "USB-C kabel 2m", expected: 85, counted: null, diff: null, aiWarning: "Hög stöldfrekvens i din bransch — räkna extra noga" },
  { id: "2", articleNr: "ART-0004", name: "Skrivbordslampa LED", expected: 0, counted: null, diff: null, aiWarning: null },
  { id: "3", articleNr: "ART-0007", name: "Bluetooth-högtalare", expected: 7, counted: null, diff: null, aiWarning: "Hög stöldfrekvens — kontrollera kvantitet noggrant" },
];

export const InventoryAICount = () => { const [mode, setMode] = useState<"schedule" | "counting" | "photo">("schedule");
  const [items, setItems] = useState(todayItems);
  const [photoResult, setPhotoResult] = useState<{ detected: number; expected: number; article: string } | null>(null);

  const counted = items.filter((i) => i.counted !== null).length;
  const progress = items.length > 0 ? Math.round((counted / items.length) * 100) : 0;

  const handleCount = (id: string, val: string) => { const num = val === "" ? null : parseInt(val);
    setItems((prev) =>
      prev.map((i) => { if (i.id !== id) return i;
        const diff = num !== null ? num - i.expected : null;
        return { ...i, counted: num, diff };
      })
    );
  };

  if (mode === "counting") { return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setMode("schedule")}>
            Tillbaka till schema
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMode("photo")} className="gap-1.5">
            <Camera className="h-3.5 w-3.5" />
            Foto-inventering
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">Räknar: Elektronik (A-artiklar)</p>
              <span className="text-sm text-muted-foreground">{counted} av {items.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id} className={item.diff !== null && item.diff !== 0 ? "border-[#F0DDB7]" : ""}>
              <CardContent className="p-4 space-y-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.articleNr} | Förväntat: {item.expected} st</p>
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
                      <Badge variant="outline" className={ item.diff === 0 ? "bg-[#E1F5EE] text-[#085041]" :
                        item.diff < 0 ? "bg-destructive/10 text-destructive" :
                        "bg-[#EFF6FF] text-blue-600"
                      }>
                        {item.diff > 0 ? "+" : ""}{item.diff}
                      </Badge>
                    )}
                  </div>
                </div>
                {item.aiWarning && (
                  <div className="flex items-center gap-2 p-2 rounded bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-800/30">
                    <AlertTriangle className="h-3.5 w-3.5 text-[#7A5417] flex-shrink-0" />
                    <p className="text-xs text-[#7A5417] dark:text-[#C28A2B]">{item.aiWarning}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Button disabled={counted < items.length} className="w-full">
          Avsluta och visa resultat
        </Button>
      </div>
    );
  }

  if (mode === "photo") { return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => setMode("counting")}>
          Tillbaka till manuell räkning
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-[#3b82f6]" />
              <CardTitle className="text-base">Foto-inventering</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Fotografera hyllan — AI räknar automatiskt synliga enheter
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-8 text-center">
              <Camera className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                Rikta kameran mot hyllan och ta ett foto
              </p>
              <Button
                className="bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-foreground"
                onClick={() => setPhotoResult({ detected: 43, expected: 48, article: "Kaffe 500g" })}
              >
                <Camera className="h-4 w-4 mr-2" />
                Ta foto
              </Button>
            </div>

            {photoResult && (
              <Card className="border-[#3b82f6]/30 bg-[#3b82f6]/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-[#3b82f6] mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">AI räknade {photoResult.detected} st {photoResult.article}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        System visar {photoResult.expected} st.
                        Differens: {photoResult.detected - photoResult.expected} st
                        ({((photoResult.detected - photoResult.expected) * 39)} kr)
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" className="text-xs bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-foreground">
                          <CheckCircle className="h-3 w-3 mr-1" /> Bekräfta
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs">Räkna om manuellt</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Schedule view
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-[#3b82f6]/5 border border-[#3b82f6]/20">
        <Sparkles className="h-4 w-4 text-[#3b82f6] mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-medium">AI-schemalagd rullande inventering</p>
          <p className="text-xs text-muted-foreground mt-1">
            AI planerar vilka artiklar som ska räknas varje dag baserat på omsättningshastighet,
            stöldfrekvens och tid sedan senaste räkning. Ingen stängning krävs.
          </p>
        </div>
      </div>

      {schedule.map((s, i) => (
        <Card key={i} className={i === 0 ? "border-[#3b82f6]/50 ring-1 ring-[#3b82f6]/20" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">{s.date}</span>
                  <Badge variant="outline" className={ s.priority === "high" ? "bg-destructive/10 text-destructive text-[10px]" :
                    s.priority === "medium" ? "bg-[#FAEEDA] text-[#7A5417] text-[10px]" :
                    "bg-muted text-muted-foreground text-[10px]"
                  }>
                    {s.priority === "high" ? "Hög prioritet" : s.priority === "medium" ? "Medel" : "Låg"}
                  </Badge>
                </div>
                <p className="text-sm font-medium">{s.category}</p>
                <p className="text-xs text-muted-foreground">
                  {s.articleCount} artiklar | Beräknad tid: {s.estimatedMinutes} min | {s.reason}
                </p>
              </div>
              {i === 0 && (
                <Button size="sm" onClick={() => setMode("counting")} className="bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-foreground">
                  <ClipboardList className="h-3.5 w-3.5 mr-1" />
                  Starta räkning
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="bg-muted/30">
        <CardContent className="p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Tips: Mobilanpassat räkneläge</p>
          <p>Öppna denna sida på din telefon för stora inmatningsfält. Foto-inventering kräver kamera.</p>
        </CardContent>
      </Card>
    </div>
  );
};
