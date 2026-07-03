import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Bot, Users, Check, Plus, Trash2, Sparkles } from "lucide-react";

interface ParsedEmployee { first_name: string;
  last_name: string;
  monthly_salary: number;
  employment_type: string;
  work_percentage: number;
  personal_number: string;
}

interface PayrollSetupWizardProps { companyId: string;
  onComplete: () => void;
}

export const PayrollSetupWizard = ({ companyId, onComplete }: PayrollSetupWizardProps) => { const [step, setStep] = useState<"input" | "parsing" | "review" | "saving">("input");
  const [naturalInput, setNaturalInput] = useState("");
  const [employees, setEmployees] = useState<ParsedEmployee[]>([]);
  const [loading, setLoading] = useState(false);

  const parseWithAI = async () => { if (!naturalInput.trim()) { toast.error("Skriv en beskrivning av dina anställda");
      return;
    }
    setStep("parsing");
    setLoading(true);

    try { const { data, error } = await supabase.functions.invoke("ai-chat", { body: { messages: [
            { role: "system",
              content: `Du är en löneredovisningsassistent. Extrahera anställda från användarens text.
Svara ENBART med en JSON-array (ingen annan text). Varje objekt ska ha:
- first_name (string)
- last_name (string)
- monthly_salary (number)
- employment_type ("full_time" | "part_time" | "hourly")
- work_percentage (number, 100 = heltid)
- personal_number (string, tom om ej angett)

Om information saknas, gissa rimliga standardvärden (heltid=100%, employment_type=full_time).`,
            },
            { role: "user", content: naturalInput },
          ],
          model: "google/gemini-3-flash-preview",
        },
      });

      if (error) throw error;

      const text = data?.choices?.[0]?.message?.content || data?.content || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("Kunde inte tolka svaret");

      const parsed: ParsedEmployee[] = JSON.parse(jsonMatch[0]);
      setEmployees(parsed);
      setStep("review");
    } catch (err: any) { console.error(err);
      toast.error("Kunde inte tolka anställda — prova att formulera om.");
      setStep("input");
    } finally { setLoading(false);
    }
  };

  const addManualEmployee = () => { setEmployees((prev) => [
      ...prev,
      { first_name: "",
        last_name: "",
        monthly_salary: 30000,
        employment_type: "full_time",
        work_percentage: 100,
        personal_number: "",
      },
    ]);
  };

  const updateEmployee = (index: number, field: keyof ParsedEmployee, value: any) => { setEmployees((prev) => prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)));
  };

  const removeEmployee = (index: number) => { setEmployees((prev) => prev.filter((_, i) => i !== index));
  };

  const saveAll = async () => { setStep("saving");
    setLoading(true);
    try { const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id || "";
      const today = new Date().toISOString().split("T")[0];

      const inserts = employees.map((e) => ({ company_id: companyId,
        first_name: e.first_name,
        last_name: e.last_name,
        monthly_salary: e.monthly_salary,
        employment_type: e.employment_type,
        personal_number: e.personal_number || "00000000-0000",
        is_active: true,
        vacation_days_per_year: 25,
        vacation_pay_percentage: e.employment_type === "hourly" ? 12 : 0,
        created_by: userId,
        employment_start: today,
      }));

      const { error } = await supabase.from("employees").insert(inserts);
      if (error) throw error;

      toast.success(`${employees.length} anställda sparade!`);
      onComplete();
    } catch (err: any) { console.error(err);
      toast.error("Kunde inte spara anställda");
      setStep("review");
    } finally { setLoading(false);
    }
  };

  if (step === "input" || step === "parsing") { return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Berätta om dina anställda
          </CardTitle>
          <CardDescription>
            Skriv fritt på svenska — AI:n extraherar namn, löner och anställningsform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder={`Exempel: "Jag har 3 anställda. Anna Svensson tjänar 45 000/mån, heltid. Björn Johansson jobbar 80%, 36 000/mån. Clara Nilsson är timanställd, ca 160 kr/timme."`}
            value={naturalInput}
            onChange={(e) => setNaturalInput(e.target.value)}
            rows={6}
            className="resize-none"
          />
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => { setStep("review"); setEmployees([]); }}>
              Lägg till manuellt istället
            </Button>
            <Button onClick={parseWithAI} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyserar...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Extrahera med AI
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Granska och justera
        </CardTitle>
        <CardDescription>
          Kontrollera att allt stämmer innan du sparar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {employees.map((emp, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <Badge variant="secondary">Anställd {i + 1}</Badge>
              <Button variant="ghost" size="icon" onClick={() => removeEmployee(i)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Förnamn</Label>
                <Input value={emp.first_name} onChange={(e) => updateEmployee(i, "first_name", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Efternamn</Label>
                <Input value={emp.last_name} onChange={(e) => updateEmployee(i, "last_name", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Månadslön (kr)</Label>
                <Input
                  type="number"
                  value={emp.monthly_salary}
                  onChange={(e) => updateEmployee(i, "monthly_salary", Number(e.target.value))}
                />
              </div>
              <div>
                <Label className="text-xs">Personnummer</Label>
                <Input
                  placeholder="YYYYMMDD-XXXX"
                  value={emp.personal_number}
                  onChange={(e) => updateEmployee(i, "personal_number", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Anställningsform</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={emp.employment_type}
                  onChange={(e) => updateEmployee(i, "employment_type", e.target.value)}
                >
                  <option value="full_time">Heltid</option>
                  <option value="part_time">Deltid</option>
                  <option value="hourly">Timanställd</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Tjänstgöringsgrad (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={emp.work_percentage}
                  onChange={(e) => updateEmployee(i, "work_percentage", Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        ))}

        <Button variant="outline" onClick={addManualEmployee} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Lägg till anställd
        </Button>

        <div className="flex justify-between pt-4">
          <Button variant="ghost" onClick={() => setStep("input")}>
            Tillbaka
          </Button>
          <Button onClick={saveAll} disabled={loading || employees.length === 0}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Spara {employees.length} anställda
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
