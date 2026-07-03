import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, 
  ChevronUp, 
  Loader2,
  Send,
  ExternalLink,
  AlertTriangle
} from "lucide-react";
import { SkatteverketRPADialog } from "./SkatteverketRPADialog";

interface AutomationTaskCardProps { task: { id: string;
    task_type: string;
    status: string;
    approval_summary: string;
    prepared_data: any;
    created_at: string;
    company_id?: string;
  };
  icon: React.ReactNode;
  typeName: string;
  onApprove: () => void;
  onRPAComplete?: (reference: string) => void;
}

// All submission types use API integrations via mTLS/Expisoft
const REQUIRES_RPA: Record<string, boolean> = { 'vat_declaration': false, // API via mTLS proxy + Expisoft
  'agi_submission': false, // API via mTLS proxy + Expisoft
  'annual_report': false, // Bolagsverket API
};

export const AutomationTaskCard = ({ task, 
  icon, 
  typeName, 
  onApprove,
  onRPAComplete 
}: AutomationTaskCardProps) => { const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showRPADialog, setShowRPADialog] = useState(false);

  const requiresRPA = REQUIRES_RPA[task.task_type] ?? false;

  const handleApprove = async () => { if (requiresRPA) { setShowRPADialog(true);
      return;
    }
    
    setSubmitting(true);
    await onApprove();
    setSubmitting(false);
  };

  const handleRPAComplete = (reference: string) => { onRPAComplete?.(reference);
    setShowRPADialog(false);
  };

  const formatDate = (dateStr: string) => { return new Date(dateStr).toLocaleDateString('sv-SE', { year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => { return new Intl.NumberFormat('sv-SE', { style: 'currency',
      currency: 'SEK',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <>
      <Card className="border-primary/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              {icon}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold">{typeName}</h4>
                <Badge variant="secondary" className="text-xs">
                  Redo att skicka
                </Badge>
                {requiresRPA && (
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    Manuell
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{task.approval_summary}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Förberedd {formatDate(task.created_at)}
              </p>
              
              {requiresRPA && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Skatteverket har inget API – vi guidar dig genom webbplatsen
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
              
              <Button
                onClick={handleApprove}
                disabled={submitting}
                className="whitespace-nowrap"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Skickar...
                  </>
                ) : requiresRPA ? (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Öppna guide
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Godkänn & Skicka
                  </>
                )}
              </Button>
            </div>
          </div>

          {expanded && task.prepared_data && (
            <div className="mt-4 pt-4 border-t">
              <h5 className="font-medium mb-3">Detaljer</h5>
              
              {task.task_type === 'agi_submission' && task.prepared_data.employee_details && (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-4 text-sm font-medium text-muted-foreground">
                    <span>Anställd</span>
                    <span className="text-right">Bruttolön</span>
                    <span className="text-right">Skatt</span>
                  </div>
                  {task.prepared_data.employee_details.map((emp: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-3 gap-4 text-sm">
                      <span>{emp.name}</span>
                      <span className="text-right">{formatCurrency(emp.gross)}</span>
                      <span className="text-right">{formatCurrency(emp.tax)}</span>
                    </div>
                  ))}
                  <div className="grid grid-cols-3 gap-4 text-sm font-semibold border-t pt-2 mt-2">
                    <span>Totalt</span>
                    <span className="text-right">{formatCurrency(task.prepared_data.total_gross)}</span>
                    <span className="text-right">{formatCurrency(task.prepared_data.total_tax)}</span>
                  </div>
                </div>
              )}

              {task.task_type === 'vat_declaration' && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Försäljning 25%:</span>
                    <span className="ml-2 font-medium">{formatCurrency(task.prepared_data.sales_25_percent || 0)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Utgående moms:</span>
                    <span className="ml-2 font-medium">{formatCurrency(task.prepared_data.output_vat_25 || 0)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ingående moms:</span>
                    <span className="ml-2 font-medium">{formatCurrency(task.prepared_data.input_vat || 0)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Att betala:</span>
                    <span className={`ml-2 font-semibold ${task.prepared_data.vat_to_pay >= 0 ? 'text-destructive' : 'text-primary'}`}>
                      {formatCurrency(Math.abs(task.prepared_data.vat_to_pay || 0))}
                      {task.prepared_data.vat_to_pay < 0 && ' (återbetalning)'}
                    </span>
                  </div>
                </div>
              )}

              {task.task_type === 'annual_report' && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Omsättning:</span>
                    <span className="ml-2 font-medium">{formatCurrency(task.prepared_data.revenue || 0)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Resultat:</span>
                    <span className={`ml-2 font-semibold ${task.prepared_data.net_profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {formatCurrency(task.prepared_data.net_profit || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tillgångar:</span>
                    <span className="ml-2 font-medium">{formatCurrency(task.prepared_data.total_assets || 0)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Eget kapital:</span>
                    <span className="ml-2 font-medium">{formatCurrency(task.prepared_data.total_equity || 0)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* RPA Dialog för manual submission */}
      <SkatteverketRPADialog
        open={showRPADialog}
        onOpenChange={setShowRPADialog}
        taskType={task.task_type as 'vat_declaration' | 'agi_submission' | 'annual_report'}
        taskData={task.prepared_data}
        companyId={task.company_id || ''}
        onComplete={handleRPAComplete}
      />
    </>
  );
};
