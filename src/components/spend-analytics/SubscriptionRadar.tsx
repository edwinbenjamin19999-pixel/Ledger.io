import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Repeat, AlertTriangle, CheckCircle2, Mail, Circle } from "lucide-react";

interface RecurringPayment { vendor: string;
  monthlyAvg: number;
  frequency: number; // months seen
  lastSeen: string;
  daysSinceLast: number;
}

interface Props { vendors: { name: string; total: number; count: number; dates?: string[] }[];
  months: number;
}

const KNOWN_SUBS: Record<string, string> = { chatgpt: "AI-verktyg", openai: "AI-verktyg", "github": "Utveckling",
  slack: "Kommunikation", adobe: "Design", canva: "Design",
  spotify: "Musik", netflix: "Streaming", dropbox: "Molnlagring",
  "google drive": "Molnlagring", onedrive: "Molnlagring", icloud: "Molnlagring",
  "microsoft 365": "Kontorsverktyg", office: "Kontorsverktyg",
  zoom: "Videokonferens", teams: "Videokonferens",
  hubspot: "CRM", salesforce: "CRM", fortnox: "Redovisning",
  tele2: "Telekom", telia: "Telekom", "tre": "Telekom",
};

function detectCategory(name: string): string { const lower = name.toLowerCase();
  for (const [key, cat] of Object.entries(KNOWN_SUBS)) { if (lower.includes(key)) return cat;
  }
  return "Övrigt";
}

function detectDuplicates(subs: RecurringPayment[]): { a: string; b: string; category: string; saving: number }[] { const byCat = new Map<string, RecurringPayment[]>();
  for (const s of subs) { const cat = detectCategory(s.vendor);
    if (cat === "Övrigt") continue;
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat)!.push(s);
  }
  const dups: { a: string; b: string; category: string; saving: number }[] = [];
  for (const [cat, items] of byCat) { if (items.length >= 2) { items.sort((a, b) => a.monthlyAvg - b.monthlyAvg);
      dups.push({ a: items[0].vendor,
        b: items[1].vendor,
        category: cat,
        saving: items[0].monthlyAvg,
      });
    }
  }
  return dups;
}

export function SubscriptionRadar({ vendors, months }: Props) { const [reportOpen, setReportOpen] = useState(false);

  const subscriptions = useMemo(() => { // Identify recurring payments: same vendor appearing in 2+ months
    const vendorMap = new Map<string, { total: number; monthSet: Set<string>; lastDate: string }>();

    for (const v of vendors) { const key = v.name.toLowerCase().trim().slice(0, 30);
      if (!key || v.total <= 0) continue;

      const entry = vendorMap.get(key) || { total: 0, monthSet: new Set(), lastDate: "" };
      entry.total += v.total;

      if (v.dates) { for (const d of v.dates) { entry.monthSet.add(d.substring(0, 7));
          if (d > entry.lastDate) entry.lastDate = d;
        }
      } else if (v.count >= 2) { // If no dates, assume recurring if count >= 2
        entry.monthSet.add("auto-1");
        entry.monthSet.add("auto-2");
      }
      vendorMap.set(key, entry);
    }

    const result: RecurringPayment[] = [];
    for (const [name, data] of vendorMap) { if (data.monthSet.size < 2) continue;
      const monthlyAvg = data.total / Math.max(data.monthSet.size, 1);
      const daysSinceLast = data.lastDate
        ? Math.round((Date.now() - new Date(data.lastDate).getTime()) / 86400000)
        : 0;
      result.push({ vendor: name.charAt(0).toUpperCase() + name.slice(1),
        monthlyAvg: Math.round(monthlyAvg),
        frequency: data.monthSet.size,
        lastSeen: data.lastDate,
        daysSinceLast,
      });
    }
    return result.sort((a, b) => b.monthlyAvg - a.monthlyAvg);
  }, [vendors]);

  const totalMonthly = subscriptions.reduce((s, sub) => s + sub.monthlyAvg, 0);
  const totalYearly = totalMonthly * 12;
  const duplicates = detectDuplicates(subscriptions);
  const stale = subscriptions.filter(s => s.daysSinceLast > 45);
  const potentialSaving = duplicates.reduce((s, d) => s + d.saving, 0) + stale.reduce((s, sub) => s + sub.monthlyAvg, 0);

  const getStatusIcon = (sub: RecurringPayment) => { if (sub.daysSinceLast > 45) return <Circle className="h-3 w-3 fill-yellow-500 text-[#7A5417]" />;
    const isDup = duplicates.some(d => d.a.toLowerCase() === sub.vendor.toLowerCase() || d.b.toLowerCase() === sub.vendor.toLowerCase());
    if (isDup) return <AlertTriangle className="h-3 w-3 text-[#7A5417]" />;
    return <Circle className="h-3 w-3 fill-green-500 text-[#085041]" />;
  };

  const getStatusText = (sub: RecurringPayment) => { if (sub.daysSinceLast > 45) return `⚠️ Senast ${sub.daysSinceLast}d sedan`;
    const dup = duplicates.find(d => d.a.toLowerCase() === sub.vendor.toLowerCase() || d.b.toLowerCase() === sub.vendor.toLowerCase());
    if (dup) return `⚠️ Duplikat? (${dup.category})`;
    return "● Aktiv";
  };

  const handleSendReport = () => { const body = subscriptions.map(s => `${s.vendor}: ${s.monthlyAvg} kr/mån`).join("%0A");
    const subject = encodeURIComponent("Prenumerationsrapport — Bokfy");
    window.open(`mailto:?subject=${subject}&body=${encodeURIComponent(`Aktiva prenumerationer:\n\n${subscriptions.map(s => `${s.vendor}: ${s.monthlyAvg} kr/mån`).join("\n")}\n\nTotalt: ${totalMonthly} kr/mån (${totalYearly} kr/år)\nPotentiell besparing: ${potentialSaving} kr/mån`)}`);
  };

  if (subscriptions.length === 0) { return (
      <Card>
        <CardContent className="py-12 text-center">
          <Repeat className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium text-foreground">Inga återkommande betalningar identifierade</p>
          <p className="text-xs text-muted-foreground mt-1">Systemet analyserar transaktioner som upprepas varje månad</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Repeat className="h-5 w-5" /> Aktiva prenumerationer (AI-identifierade)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {subscriptions.map((sub, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2.5">
                  {getStatusIcon(sub)}
                  <div>
                    <p className="text-sm font-medium">{sub.vendor}</p>
                    <p className="text-[11px] text-muted-foreground">{getStatusText(sub)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono">{sub.monthlyAvg.toLocaleString("sv-SE")} kr/mån</p>
                  <p className="text-[10px] text-muted-foreground">{detectCategory(sub.vendor)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Totalt:</span>
              <span className="font-bold">{totalMonthly.toLocaleString("sv-SE")} kr/mån • {totalYearly.toLocaleString("sv-SE")} kr/år</span>
            </div>
            {potentialSaving > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Potentiell besparing:</span>
                <span className="font-bold text-primary">{potentialSaving.toLocaleString("sv-SE")} kr/mån</span>
              </div>
            )}
          </div>

          <Button variant="outline" size="sm" className="mt-3 w-full" onClick={handleSendReport}>
            <Mail className="h-4 w-4 mr-1" /> Skicka besparingsrapport
          </Button>
        </CardContent>
      </Card>

      {duplicates.length > 0 && (
        <Card className="border-[#F0DDB7]">
          <CardContent className="pt-4 pb-4 space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#7A5417]" /> Möjliga dubbletter
            </p>
            {duplicates.map((d, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                {d.a} + {d.b} ({d.category}) — besparing ~{d.saving.toLocaleString("sv-SE")} kr/mån
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
