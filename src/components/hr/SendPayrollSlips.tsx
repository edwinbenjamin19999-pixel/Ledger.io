import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SendPayrollSlipsProps { payrollRunId: string;
  onComplete: () => void;
}

interface EmployeePreview { id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

export const SendPayrollSlips = ({ payrollRunId, onComplete }: SendPayrollSlipsProps) => { const [showDialog, setShowDialog] = useState(false);
  const [sending, setSending] = useState(false);
  const [employees, setEmployees] = useState<EmployeePreview[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (showDialog) { // Reset state and reload fresh data when dialog opens
      setEmployees([]);
      setLoading(true);
      loadEmployees();
    }
  }, [showDialog, payrollRunId]);

  const loadEmployees = async () => { setLoading(true);
    try { console.log('Loading employees för payroll run:', payrollRunId);
      
      // Get payroll lines with employee data
      const { data: payrollLines, error: linesError } = await supabase
        .from("payroll_lines")
        .select("id, employee_id")
        .eq("payroll_run_id", payrollRunId);

      console.log('Payroll lines fetched:', payrollLines);
      if (linesError) { console.error('Error fetching payroll lines:', linesError);
        throw linesError;
      }

      if (!payrollLines || payrollLines.length === 0) { console.log('No payroll lines found');
        setEmployees([]);
        toast.info("Inga lönerader funna. Tryck på 'Generera lönerader' för att skapa dem.");
        setLoading(false);
        return;
      }

      // Get employee details
      const employeeIds = payrollLines.map(line => line.employee_id);
      console.log('Fetching employees with IDs:', employeeIds);
      
      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .select("id, first_name, last_name, email")
        .in("id", employeeIds);

      console.log('Employee data fetched:', employeeData);
      if (employeeError) { console.error('Error fetching employees:', employeeError);
        throw employeeError;
      }

      // Map payroll lines to employee data
      const employeeList = payrollLines.map(line => { const employee = employeeData?.find(e => e.id === line.employee_id);
        console.log(`Mapping employee ${line.employee_id}:`, employee);
        return { id: line.id,
          first_name: employee?.first_name || '',
          last_name: employee?.last_name || '',
          email: employee?.email || null,
        };
      });

      console.log('Final employee list with emails:', employeeList);
      setEmployees(employeeList);
    } catch (error: any) { console.error("Error loading employees:", error);
      toast.error("Kunde inte hämta anställda");
    } finally { setLoading(false);
    }
  };

  const regeneratePayrollLines = async () => { setSending(true);
    try { const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-payroll-lines`, { method: 'POST',
        headers: { 'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ payroll_run_id: payrollRunId }),
      });

      if (!response.ok) { const error = await response.json();
        throw new Error(error.error || "Kunde inte generera lönerader");
      }

      toast.success("Lönerader genererade!");
      await loadEmployees();
    } catch (error: any) { console.error("Error regenerating payroll lines:", error);
      toast.error(error.message || "Kunde inte generera lönerader");
    } finally { setSending(false);
    }
  };

  const sendPayrollSlips = async () => { setSending(true);
    try { let successCount = 0;
      let errorCount = 0;
      const employeesMissingEmail: string[] = [];

      for (const employee of employees) { if (!employee.email) { console.log(`Employee missing email:`, employee);
          employeesMissingEmail.push(`${employee.first_name} ${employee.last_name}`);
          errorCount++;
          continue;
        }

        try { const { error } = await supabase.functions.invoke("send-payroll-slip", { body: { payroll_line_id: employee.id },
          });

          if (error) throw error;
          successCount++;
          console.log(`Payroll slip sent to ${employee.email}`);
        } catch (error: any) { console.error(`Failed to send to ${employee.email}:`, error);
          errorCount++;
        }
      }

      console.log('Send payroll slips results:', { successCount, errorCount, employeesMissingEmail });

      if (successCount > 0) { toast.success(`${successCount} lönespecifikationer skickade`);
      }
      if (errorCount > 0) { toast.error(`${errorCount} ${errorCount === 1 ? 'anställd saknar' : 'anställda saknar'} e-postadress: ${employeesMissingEmail.join(', ')}`);
      }

      setShowDialog(false);
      onComplete();
    } catch (error: any) { console.error("Error sending payroll slips:", error);
      toast.error(error.message || "Kunde inte skicka lönespecifikationer");
    } finally { setSending(false);
    }
  };

  const employeesWithEmail = employees.filter(e => e.email);
  const employeesWithoutEmail = employees.filter(e => !e.email);
  const hasMissingEmails = employeesWithoutEmail.length > 0;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDialog(true)}
      >
        <Mail className="w-4 h-4 mr-2" />
        Skicka lönespecar
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Skicka lönespecifikationer</DialogTitle>
            <DialogDescription>
              Förhandsgranskning innan utskick
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {employees.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Inga lönerader hittades för denna lönekörning. Detta händer om anställda lades till efter att lönekörningen skapades.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 text-success mb-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="font-semibold">Kommer skickas</span>
                      </div>
                      <p className="text-2xl font-bold">{employeesWithEmail.length}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className={`flex items-center gap-2 mb-1 ${hasMissingEmails ? 'text-warning' : 'text-success'}`}>
                        {hasMissingEmails ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        <span className="font-semibold">{hasMissingEmails ? 'Saknar e-post' : 'Alla har e-post'}</span>
                      </div>
                      <p className="text-2xl font-bold">{hasMissingEmails ? employeesWithoutEmail.length : '✓'}</p>
                    </div>
                  </div>

              {/* Warning if missing emails */}
              {hasMissingEmails && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {employeesWithoutEmail.length} anställda saknar e-postadress och kommer INTE få lönespec:
                    <ul className="mt-2 list-disc list-inside">
                      {employeesWithoutEmail.map((emp) => (
                        <li key={emp.id}>
                          {emp.first_name} {emp.last_name}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-sm">
                      Lägg till e-postadresser under HR → Anställda innan du skickar.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

                  {/* Employee list */}
                  <ScrollArea className="h-64 border rounded-lg">
                    <div className="p-4 space-y-2">
                      <h4 className="font-semibold text-sm text-muted-foreground mb-3">Anställda</h4>
                      {employees.map((employee) => (
                        <div
                          key={employee.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${ employee.email ? 'bg-success/10 border-success/20' : 'bg-warning/10 border-warning/20'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {employee.email ? (
                              <CheckCircle2 className="w-5 h-5 text-success" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-warning" />
                            )}
                            <div>
                              <p className="font-medium">
                                {employee.first_name} {employee.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {employee.email || 'Ingen e-postadress'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                {employees.length === 0 ? (
                  <Button
                    onClick={regeneratePayrollLines}
                    disabled={sending}
                    className="flex-1"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Genererar...
                      </>
                    ) : (
                      "Generera lönerader"
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={sendPayrollSlips}
                    disabled={sending || employeesWithEmail.length === 0}
                    className="flex-1"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Skickar...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Skicka till {employeesWithEmail.length} anställda
                      </>
                    )}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                  disabled={sending}
                >
                  Avbryt
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
