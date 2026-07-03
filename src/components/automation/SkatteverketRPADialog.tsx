import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, 
  CheckCircle2, 
  Circle, 
  Loader2, 
  Copy,
  Shield,
  AlertTriangle
} from "lucide-react";

interface SkatteverketRPADialogProps { open: boolean;
  onOpenChange: (open: boolean) => void;
  taskType: 'vat_declaration' | 'agi_submission' | 'annual_report';
  taskData: any;
  companyId: string;
  onComplete: (reference: string) => void;
}

const taskTypeLabels = { vat_declaration: 'Momsdeklaration',
  agi_submission: 'AGI-inlämning',
  annual_report: 'Årsredovisning',
};

export function SkatteverketRPADialog({ open,
  onOpenChange,
  taskType,
  taskData,
  companyId,
  onComplete,
}: SkatteverketRPADialogProps) { const { toast } = useToast();
  const [step, setStep] = useState<'intro' | 'bankid' | 'instructions' | 'confirm'>('intro');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<string[]>([]);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [reference, setReference] = useState('');

  const handleStartBankID = async () => { setLoading(true);
    try { const { data, error } = await supabase.functions.invoke('skatteverket-rpa-session', { body: { action: 'initiate_bankid',
          company_id: companyId,
          task_type: taskType,
          task_data: taskData,
        },
      });

      if (error) throw error;

      setSessionId(data.session_id);
      
      // Open BankID auth in new window
      const authWindow = window.open(data.auth_url, '_blank', 'width=500,height=700');
      
      // Poll för completion
      const checkInterval = setInterval(async () => { const { data: session } = await supabase.functions.invoke('skatteverket-rpa-session', { body: { action: 'check_session', session_id: data.session_id },
        });

        if (session?.status === 'bankid_verified') { clearInterval(checkInterval);
          authWindow?.close();
          await loadInstructions(data.session_id);
          setStep('instructions');
        }
      }, 2000);

      // Stop polling after 5 minutes
      setTimeout(() => clearInterval(checkInterval), 300000);

    } catch (error) { console.error('BankID error:', error);
      toast({ title: "Fel",
        description: "Kunde inte starta BankID-inloggning",
        variant: "destructive",
      });
    } finally { setLoading(false);
    }
  };

  const handleSkipBankID = async () => { // For demo/testing, skip directly to instructions
    setInstructions([
      '1. Öppna Skatteverkets webbplats',
      '2. Logga in med ditt BankID',
      '3. Navigera till rätt tjänst',
      `4. Fyll i uppgifterna enligt nedan`,
      '5. Granska och skicka in',
      '6. Kopiera referensnumret',
    ]);
    setStep('instructions');
  };

  const loadInstructions = async (sid: string) => { const { data, error } = await supabase.functions.invoke('skatteverket-rpa-session', { body: { action: 'execute_rpa', session_id: sid },
    });

    if (data?.instructions) { setInstructions(data.instructions);
    }
  };

  const toggleStep = (index: number) => { setCompletedSteps(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text);
    toast({ title: "Kopierat!", description: text });
  };

  const handleComplete = () => { if (!reference.trim()) { toast({ title: "Ange referensnummer",
        description: "Du måste ange referensnumret från Skatteverket",
        variant: "destructive",
      });
      return;
    }
    onComplete(reference);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Manuell inlämning - {taskTypeLabels[taskType]}
          </DialogTitle>
          <DialogDescription>
            Vi guidar dig genom inlämningen på Skatteverkets webbplats
          </DialogDescription>
        </DialogHeader>

        {step === 'intro' && (
          <div className="space-y-4">
            <Card className="border-[#F0DDB7] bg-[#FAEEDA]">
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#7A5417] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-[#7A5417]">Varför manuell inlämning?</p>
                    <p className="text-sm text-[#7A5417] mt-1">
                      Skatteverket har inget API för {taskTypeLabels[taskType].toLowerCase()}. 
                      Vi hjälper dig fylla i rätt värden på deras webbplats.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h4 className="font-medium">Så här fungerar det:</h4>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="font-medium text-foreground">1.</span>
                  Vi visar exakt vilka värden du ska fylla i
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-foreground">2.</span>
                  Du loggar in på Skatteverket med ditt BankID
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-foreground">3.</span>
                  Du fyller i värdena och skickar in
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-foreground">4.</span>
                  Du anger referensnumret här så vi kan spåra det
                </li>
              </ol>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleSkipBankID} className="flex-1">
                Visa instruktioner
              </Button>
            </div>
          </div>
        )}

        {step === 'instructions' && (
          <div className="space-y-4">
            {/* Pre-filled data to copy */}
            {taskData && (
              <Card>
                <CardContent className="pt-4">
                  <h4 className="font-medium mb-3">Värden att fylla i:</h4>
                  <div className="space-y-2">
                    {Object.entries(taskData).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{String(value)}</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(String(value))}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Checklist */}
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-medium mb-3">Steg-för-steg:</h4>
                <div className="space-y-2">
                  {instructions.map((instruction, index) => (
                    <button
                      key={index}
                      onClick={() => toggleStep(index)}
                      className="w-full flex items-start gap-3 p-2 rounded hover:bg-muted text-left"
                    >
                      {completedSteps.includes(index) ? (
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                      )}
                      <span className={completedSteps.includes(index) ? 'line-through text-muted-foreground' : ''}>
                        {instruction}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Open Skatteverket button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open('https://www.skatteverket.se/foretagochorganisationer/etjansterochblanketter/alaboredigering/foretagsredovisningloggain.4.18e1b10334ebe8bc80002417.html', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Öppna Skatteverket
            </Button>

            {/* Reference input */}
            <div className="space-y-2 pt-4 border-t">
              <label className="text-sm font-medium">
                Referensnummer från Skatteverket:
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="T.ex. 123456789"
                className="w-full p-2 border rounded-md"
              />
            </div>

            <Button 
              onClick={handleComplete} 
              className="w-full"
              disabled={!reference.trim()}
            >
              Bekräfta inlämning
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
