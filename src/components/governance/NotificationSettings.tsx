import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Bell, MessageSquare, Mail, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";
import { DEFAULT_NOTIFICATION_PREFERENCES,
  SMS_PLAN_LIMITS,
  type NotificationPreference,
} from "@/lib/governance";

interface Props { subscriptionTier?: string;
}

export const NotificationSettings = ({ subscriptionTier = "standard" }: Props) => { const [prefs, setPrefs] = useState<Record<string, NotificationPreference>>(
    () => ({ ...DEFAULT_NOTIFICATION_PREFERENCES })
  );
  const [smsBudget, setSmsBudget] = useState(50);
  const smsUsed = 12; // Would come from DB in production
  const planLimit = SMS_PLAN_LIMITS[subscriptionTier as keyof typeof SMS_PLAN_LIMITS] ?? 0;
  const smsIncluded = planLimit > 0;

  const toggleChannel = (key: string, channel: "email" | "sms" | "push") => { setPrefs((prev) => ({ ...prev,
      [key]: { ...prev[key], [channel]: !prev[key][channel] },
    }));
  };

  const handleSave = () => toast.success("Notifieringsinställningar sparade lokalt (databaslagring kommande)");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Notifieringskanaler
          </CardTitle>
          <CardDescription>
            Välj hur du vill bli notifierad per åtgärdstyp
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">Typ</th>
                  <th className="px-3 py-2 text-center font-medium">
                    <Mail className="h-3.5 w-3.5 mx-auto" />
                  </th>
                  <th className="px-3 py-2 text-center font-medium">
                    <MessageSquare className="h-3.5 w-3.5 mx-auto" />
                  </th>
                  <th className="px-3 py-2 text-center font-medium">
                    <Smartphone className="h-3.5 w-3.5 mx-auto" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(prefs).map(([key, pref]) => (
                  <tr key={key} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-2.5">
                      <span className="text-foreground">{pref.label}</span>
                      {pref.isCritical && (
                        <Badge variant="destructive" className="ml-1.5 text-[9px] px-1 py-0">
                          Kritisk
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Switch
                        checked={pref.email}
                        onCheckedChange={() => toggleChannel(key, "email")}
                        className="mx-auto"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Switch
                        checked={pref.sms}
                        onCheckedChange={() => { if (!smsIncluded && !pref.sms) { toast.info("SMS-utskick ingår i Pro-plan. Uppgradera eller aktivera för 0,99 kr/SMS.");
                            return;
                          }
                          toggleChannel(key, "sms");
                        }}
                        className="mx-auto"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Switch
                        checked={pref.push}
                        onCheckedChange={() => toggleChannel(key, "push")}
                        className="mx-auto"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* SMS budget */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            SMS-budget
          </CardTitle>
          <CardDescription>
            {smsIncluded
              ? `${planLimit} SMS/månad ingår i din plan`
              : "SMS-utskick ingår i Pro-plan"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {smsIncluded ? (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Max SMS per månad
                </span>
                <Select
                  value={String(smsBudget)}
                  onValueChange={(v) => setSmsBudget(Number(v))}
                >
                  <SelectTrigger className="w-24 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 100, 200].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Denna månad: {smsUsed} av {smsBudget} SMS använda</span>
                  <span>~{(smsBudget * 3).toLocaleString("sv-SE")} kr</span>
                </div>
                <Progress value={(smsUsed / smsBudget) * 100} className="h-2" />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Om budgeten nås konverteras alla återstående notifieringar till e-post automatiskt.
              </p>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">
                SMS-utskick ingår i Pro-plan
              </p>
              <ComingSoonButton tooltipText="Pro-plan med SMS lanseras snart" variant="outline">
                Uppgradera till Pro
              </ComingSoonButton>
              <p className="text-[10px] text-muted-foreground mt-2">
                Eller aktivera per SMS för 0,99 kr/st
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave}>Spara notifieringsinställningar</Button>
    </div>
  );
};
