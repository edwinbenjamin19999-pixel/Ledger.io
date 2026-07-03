import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, Loader2 } from "lucide-react";

interface AGISubmissionPanelProps { companyId: string;
  onTaskCreated: () => void;
  environment?: string;
}

export const AGISubmissionPanel = ({ companyId, onTaskCreated, environment }: AGISubmissionPanelProps) => { const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth > 1 ? currentMonth - 1 : 12);

  const handlePrepare = async () => { setLoading(true);
    try { const { data, error } = await supabase.functions.invoke('prepare-agi-submission', { body: { company_id: companyId,
          period_year: year,
          period_month: month,
          environment,
        }
      });

      if (error) throw error;

      if (!data.success && !data.has_payroll) { toast({ title: "Ingen lönekörning hittad",
          description: `Ingen godkänd lönekörning hittades för ${year}-${String(month).padStart(2, '0')}. Skapa och godkänn en lönekörning först.`,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "AGI-inlämning förberedd!",
        description: `Period: ${data.summary.period}. ${data.summary.employees} anställda, bruttolön ${data.summary.total_gross.toLocaleString('sv-SE')} kr`,
      });

      onTaskCreated();
    } catch (error) { console.error('Error preparing AGI:', error);
      toast({ title: "Fel",
        description: error instanceof Error ? error.message : "Kunde inte förbereda AGI-inlämning",
        variant: "destructive",
      });
    } finally { setLoading(false);
    }
  };

  const months = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Mars' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Maj' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Augusti' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Arbetsgivardeklaration (AGI)
        </CardTitle>
        <CardDescription>
          Samlar automatiskt ihop lönedata och förbereder för inlämning till Skatteverket
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">År</label>
            <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={String(currentYear)}>{currentYear}</SelectItem>
                <SelectItem value={String(currentYear - 1)}>{currentYear - 1}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Månad</label>
            <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <h4 className="font-medium text-sm">Arbetsgivardeklaration innehåller:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>✓ Kontrolluppgifter per anställd</li>
            <li>✓ Bruttolöner och skatteavdrag</li>
            <li>✓ Arbetsgivaravgifter</li>
            <li>✓ Eventuella tjänstepensioner</li>
          </ul>
        </div>

        <Button onClick={handlePrepare} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Förbereder...
            </>
          ) : (
            <>
              <Users className="w-4 h-4 mr-2" />
              Förbered AGI-inlämning
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Kräver en godkänd lönekörning för vald period. Du godkänner innan den skickas till Skatteverket.
        </p>
      </CardContent>
    </Card>
  );
};
