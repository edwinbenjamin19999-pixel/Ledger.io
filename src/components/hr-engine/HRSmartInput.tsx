import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Check, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  companyId: string;
  defaultEmployeeId?: string;
}

interface ParsedEvent {
  category_key: string;
  event_date: string;
  event_end_date?: string;
  hours?: number;
  amount?: number;
  quantity?: number;
  description?: string;
  confidence: number;
}

const EXAMPLES = [
  "Jobbade 8h idag på Projekt Falken",
  "Sjuk sedan lunch",
  "Halvdag semester på morgonen, jobbade 4h på eftermiddagen",
  "3h övertid i lördags",
  "VAB hela dagen",
  "Körde 42 km till kundmöte",
];

/**
 * AI Smart Input — fritext till strukturerade payroll-events.
 * Premium-yta som ersätter formulärifyllning för det vanligaste flödet.
 */
export function HRSmartInput({ companyId, defaultEmployeeId }: Props) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [employeeId, setEmployeeId] = useState<string | undefined>(defaultEmployeeId);
  const [parsed, setParsed] = useState<{ events: ParsedEvent[]; clarification_needed: string } | null>(null);

  const { data: employees } = useQuery({
    queryKey: ["hr-employees-active", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("id, first_name, last_name")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("first_name");
      return data || [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["hr-event-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("hr_event_categories").select("*");
      return data || [];
    },
  });

  const categoryMap = useMemo(() => {
    const m = new Map<string, any>();
    (categories || []).forEach((c) => m.set(c.category_key, c));
    return m;
  }, [categories]);

  const interpret = useMutation({
    mutationFn: async () => {
      if (!text.trim()) throw new Error("Skriv något först");
      if (!employeeId) throw new Error("Välj anställd");
      const { data, error } = await supabase.functions.invoke("hr-smart-input", {
        body: { text: text.trim(), company_id: companyId, employee_id: employeeId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => setParsed(data),
    onError: (e: any) => toast.error(e.message || "AI-tolkning misslyckades"),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!parsed?.events?.length || !employeeId) throw new Error("Inget att spara");
      const rows = parsed.events.map((e) => ({
        company_id: companyId,
        employee_id: employeeId,
        category_key: e.category_key,
        event_date: e.event_date,
        event_end_date: e.event_end_date || null,
        hours: e.hours ?? null,
        amount: e.amount ?? null,
        quantity: e.quantity ?? null,
        description: e.description ?? text,
        source: "ai_smart_input",
        source_text: text,
        ai_confidence: e.confidence,
        status: e.confidence >= 0.8 ? "approved" : "pending",
      }));
      const { error } = await supabase.from("hr_events").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} händelse${count > 1 ? "r" : ""} sparad${count > 1 ? "e" : ""}`);
      setText("");
      setParsed(null);
      qc.invalidateQueries({ queryKey: ["hr-events", companyId] });
    },
    onError: (e: any) => toast.error(e.message || "Kunde inte spara"),
  });

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 via-background to-background border-primary/20">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-base">Vad hände idag?</h3>
          <p className="text-xs text-muted-foreground">
            Skriv fritt — AI tolkar och sparar som löneunderlag
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <select
          value={employeeId || ""}
          onChange={(e) => setEmployeeId(e.target.value || undefined)}
          className="w-full text-sm rounded-md border border-input bg-background px-3 py-2"
        >
          <option value="">Välj anställd…</option>
          {(employees || []).map((e) => (
            <option key={e.id} value={e.id}>
              {e.first_name} {e.last_name}
            </option>
          ))}
        </select>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ex: 'Jobbade 8h på Projekt X, övertid 2h på kvällen'"
          className="min-h-[80px] resize-none"
          disabled={interpret.isPending}
        />

        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setText(ex)}
              className="text-[11px] px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>

        <Button
          onClick={() => interpret.mutate()}
          disabled={interpret.isPending || !text.trim() || !employeeId}
          className="w-full"
        >
          {interpret.isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> AI tolkar…</>
          ) : (
            <><Sparkles className="h-4 w-4 mr-2" /> Tolka med AI</>
          )}
        </Button>
      </div>

      {parsed && (
        <div className="mt-5 space-y-3 border-t pt-4">
          {parsed.clarification_needed && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-[#FAEEDA] border border-[#F0DDB7] text-sm">
              <AlertTriangle className="h-4 w-4 text-[#7A5417] mt-0.5 shrink-0" />
              <span>{parsed.clarification_needed}</span>
            </div>
          )}

          {parsed.events.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Inga händelser kunde tolkas.</p>
          ) : (
            <>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                AI tolkade {parsed.events.length} händelse{parsed.events.length > 1 ? "r" : ""}
              </p>
              <div className="space-y-2">
                {parsed.events.map((ev, i) => {
                  const cat = categoryMap.get(ev.category_key);
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-lg bg-card border"
                    >
                      <div
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: cat?.color_token || "hsl(var(--muted))" }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {cat?.label_sv || ev.category_key}
                          </span>
                          <Badge
                            variant={ev.confidence >= 0.8 ? "default" : "secondary"}
                            className="text-[10px] h-4 px-1.5"
                          >
                            {Math.round(ev.confidence * 100)}%
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {ev.event_date}
                          {ev.event_end_date && ` → ${ev.event_end_date}`}
                          {ev.hours && ` · ${ev.hours}h`}
                          {ev.amount && ` · ${ev.amount} kr`}
                          {ev.quantity && ` · ${ev.quantity} ${ev.category_key === "comp_mileage" ? "km" : ""}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setParsed(null)}
                  disabled={save.isPending}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-1" /> Avbryt
                </Button>
                <Button
                  size="sm"
                  onClick={() => save.mutate()}
                  disabled={save.isPending}
                  className="flex-1"
                >
                  {save.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  Bekräfta & spara
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
