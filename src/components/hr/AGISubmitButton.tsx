import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface AGISubmitButtonProps { payrollRunId: string;
  companyId: string;
  periodStart: string;
  periodEnd: string;
}

export const AGISubmitButton = ({ payrollRunId, companyId, periodStart, periodEnd }: AGISubmitButtonProps) => { const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'period' | 'submit' | 'complete'>('period');

  const handleSubmit = async () => { setLoading(true);
    try { // Step 1: Create/verify period
      setStep('period');
      const periodDate = new Date(periodStart);
      const { data: periodData, error: periodError } = await supabase.functions.invoke(
        'skatteverket-agi-period',
        { body: { company_id: companyId,
            period_year: periodDate.getFullYear(),
            period_month: periodDate.getMonth() + 1,
            action: 'create'
          }
        }
      );

      if (periodError) { throw new Error(`Period error: ${periodError.message}`);
      }

      // Step 2: Generate and submit AGI file
      setStep('submit');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Give user time to see progress

      const { data: submitData, error: submitError } = await supabase.functions.invoke(
        'skatteverket-agi-submit',
        { body: { payroll_run_id: payrollRunId
          }
        }
      );

      if (submitError) { throw new Error(`Submission error: ${submitError.message}`);
      }

      setStep('complete');
      toast({ title: "AGI-inlämning klar!",
        description: `Referens: ${submitData?.skatteverket_reference || 'N/A'}`,
      });

      setTimeout(() => { setOpen(false);
        setStep('period');
      }, 3000);

    } catch (error) { console.error('AGI submission error:', error);
      toast({ title: "Fel vid AGI-inlämning",
        description: error instanceof Error ? error.message : "Okänt fel",
        variant: "destructive",
      });
    } finally { setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <Send className="w-4 h-4 mr-2" />
          Skicka AGI till Skatteverket
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lämna in AGI till Skatteverket</DialogTitle>
          <DialogDescription>
            Period: {new Date(periodStart).toLocaleDateString('sv-SE')} - {new Date(periodEnd).toLocaleDateString('sv-SE')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3">
            {step === 'period' && loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            ) : step === 'period' ? (
              <div className="w-5 h-5 rounded-full border-2 border-primary" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-[#085041]" />
            )}
            <div>
              <p className="font-medium">1. Skapa redovisningsperiod</p>
              <p className="text-sm text-muted-foreground">Registrerar perioden hos Skatteverket</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {step === 'submit' && loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            ) : ['submit', 'complete'].includes(step) ? (
              <CheckCircle2 className="w-5 h-5 text-[#085041]" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
            )}
            <div>
              <p className="font-medium">2. Generera och skicka AGI-fil</p>
              <p className="text-sm text-muted-foreground">Skapar XML-fil med lönedata och skickar till Skatteverket</p>
            </div>
          </div>

          {step === 'complete' && (
            <div className="flex items-center gap-2 p-3 bg-[#E1F5EE] rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-[#085041]" />
              <p className="text-sm font-medium text-[#085041]">AGI-inlämning genomförd!</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Avbryt
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || step === 'complete'}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Skickar...
              </>
            ) : step === 'complete' ? (
              'Klar!'
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Lämna in
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};