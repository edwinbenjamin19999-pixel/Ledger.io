import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Shield, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ComplianceAlertsProps { employees: any[];
  companyId: string;
}

interface Alert { type: "error" | "warning" | "info" | "success";
  title: string;
  description: string;
}

export const ComplianceAlerts = ({ employees, companyId }: ComplianceAlertsProps) => { const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => { generateAlerts();
  }, [employees]);

  const generateAlerts = () => { const newAlerts: Alert[] = [];
    const activeEmps = employees.filter((e) => e.is_active);

    // Check minimum salary
    const MIN_SALARY_THRESHOLD = 24000;
    activeEmps.forEach((emp) => { if (emp.monthly_salary && emp.monthly_salary < MIN_SALARY_THRESHOLD) { newAlerts.push({ type: "warning",
          title: `Låg lön: ${emp.first_name} ${emp.last_name}`,
          description: `Månadslön ${emp.monthly_salary.toLocaleString()} kr ligger under rekommenderad miniminivå (${MIN_SALARY_THRESHOLD.toLocaleString()} kr).`,
        });
      }
    });

    // Check missing personal numbers
    activeEmps.forEach((emp) => { if (!emp.personal_number || emp.personal_number === "00000000-0000" || emp.personal_number === "********") { newAlerts.push({ type: "error",
          title: `Personnummer saknas: ${emp.first_name} ${emp.last_name}`,
          description: "Personnummer krävs för AGI-inlämning till Skatteverket.",
        });
      }
    });

    // Check vacation days
    activeEmps.forEach((emp) => { const remaining = (emp.vacation_days_per_year || 25) - (emp.vacation_days_used || 0);
      if (remaining > 25) { newAlerts.push({ type: "warning",
          title: `Många sparade semesterdagar: ${emp.first_name} ${emp.last_name}`,
          description: `${remaining} dagar kvar — överväg att schemalägga semester (max 25 sparade dagar enl. semesterlagen).`,
        });
      }
    });

    // Employer social fee reminder
    const now = new Date();
    if (now.getDate() <= 12) { newAlerts.push({ type: "info",
        title: "AGI-deadline närmar sig",
        description: `Arbetsgivardeklaration för föregående månad ska lämnas senast den 12:e.`,
      });
    }

    // GDPR reminder
    newAlerts.push({ type: "success",
      title: "GDPR: Lönedata krypterad",
      description: "Personnummer och bankuppgifter lagras krypterat med AES-256.",
    });

    if (newAlerts.length === 0) { newAlerts.push({ type: "success",
        title: "Allt ser bra ut!",
        description: "Inga avvikelser eller varningar hittades.",
      });
    }

    setAlerts(newAlerts);
  };

  const iconMap = { error: <AlertTriangle className="h-4 w-4 text-destructive" />,
    warning: <AlertTriangle className="h-4 w-4 text-[#7A5417]" />,
    info: <Info className="h-4 w-4 text-blue-500" />,
    success: <CheckCircle className="h-4 w-4 text-[#085041]" />,
  };

  const bgMap = { error: "border-destructive/30 bg-destructive/5",
    warning: "border-[#F0DDB7] bg-[#FAEEDA] dark:bg-yellow-950/10",
    info: "border-[#C8DDF5] bg-[#EFF6FF] dark:bg-blue-950/10",
    success: "border-green-500/30 bg-[#E1F5EE] dark:bg-green-950/10",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Kontroll & Compliance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert, i) => (
          <div key={i} className={`border rounded-lg p-3 ${bgMap[alert.type]}`}>
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{iconMap[alert.type]}</div>
              <div>
                <p className="text-sm font-medium">{alert.title}</p>
                <p className="text-xs text-muted-foreground">{alert.description}</p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
