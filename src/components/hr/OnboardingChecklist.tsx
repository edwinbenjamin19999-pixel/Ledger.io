import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus, Send, Laptop, Key, Mail, CreditCard, FileText, ShieldCheck } from "lucide-react";

interface OnboardingChecklistProps { companyId: string;
  employees: any[];
}

interface OnboardingItem { id: string;
  label: string;
  icon: React.ReactNode;
  done: boolean;
  category: "employer" | "employee";
}

export const OnboardingChecklist = ({ companyId, employees }: OnboardingChecklistProps) => { const activeEmps = employees.filter(e => e.is_active);

  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(
    activeEmps.length > 0 ? activeEmps[0].id : null
  );

  const [items, setItems] = useState<OnboardingItem[]>([
    { id: "skv", label: "Anmäl anställd till Skatteverket (A-skatt)", icon: <ShieldCheck className="h-4 w-4" />, done: false, category: "employer" },
    { id: "pension", label: "Registrera i pensionssystem", icon: <CreditCard className="h-4 w-4" />, done: false, category: "employer" },
    { id: "equipment", label: "Beställ utrustning (laptop, telefon)", icon: <Laptop className="h-4 w-4" />, done: false, category: "employer" },
    { id: "access", label: "Ge tillgång till system", icon: <Key className="h-4 w-4" />, done: false, category: "employer" },
    { id: "welcome", label: "Skicka välkomstmail", icon: <Mail className="h-4 w-4" />, done: false, category: "employer" },
    { id: "bank", label: "Fyll i bankkontonummer för lönebetalning", icon: <CreditCard className="h-4 w-4" />, done: false, category: "employee" },
    { id: "id", label: "Ladda upp ID-handling", icon: <FileText className="h-4 w-4" />, done: false, category: "employee" },
    { id: "contract", label: "Signera anställningsavtal med BankID", icon: <ShieldCheck className="h-4 w-4" />, done: false, category: "employee" },
    { id: "notify", label: "Välj notifieringspreferenser (e-post/SMS)", icon: <Send className="h-4 w-4" />, done: false, category: "employee" },
  ]);

  const toggleItem = (id: string) => { setItems(prev => prev.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  const doneCount = items.filter(i => i.done).length;
  const progress = Math.round((doneCount / items.length) * 100);

  const employerItems = items.filter(i => i.category === "employer");
  const employeeItems = items.filter(i => i.category === "employee");

  const selectedEmp = activeEmps.find(e => e.id === selectedEmployee);

  const renderCheckbox = (done: boolean, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={done}
      className={`w-[16px] h-[16px] rounded-[3px] flex items-center justify-center cursor-pointer transition-colors ${
        done
          ? "bg-[#1D4ED8] border-[1.5px] border-[#1D4ED8]"
          : "bg-white border-[1.5px] border-[#D1D5DB] hover:border-[#1D4ED8]"
      }`}
    >
      {done && <span className="text-white text-[10px] leading-none">✓</span>}
    </button>
  );

  const renderRow = (item: OnboardingItem, isWelcome = false) => (
    <div
      key={item.id}
      className={`flex items-center gap-[8px] py-[7px] border-b-[0.5px] border-[#F1F5F9] text-[12px] ${
        item.done ? "text-[#94A3B8] line-through" : "text-[#0F172A]"
      }`}
    >
      {renderCheckbox(item.done, () => toggleItem(item.id))}
      <span className="text-[#94A3B8] flex items-center justify-center" style={{ width: 14, height: 14 }}>
        {item.icon}
      </span>
      <span className="flex-1">{item.label}</span>
      {isWelcome && !item.done && (
        <button
          onClick={() => toggleItem(item.id)}
          className="bg-white border-[0.5px] border-[#E2E8F0] text-[#475569] rounded-[8px] text-[11px] px-[10px] h-[28px] hover:bg-[#F8FAFB]"
        >
          Skicka nu
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Employee selector */}
      {activeEmps.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {activeEmps.map(e => {
            const isActive = selectedEmployee === e.id;
            return (
              <button
                key={e.id}
                onClick={() => setSelectedEmployee(e.id)}
                className={
                  isActive
                    ? "bg-[#1D4ED8] text-[#E6F4FA] rounded-[8px] text-[12px] font-medium px-[12px] py-[5px]"
                    : "bg-white border-[0.5px] border-[#E2E8F0] text-[#475569] rounded-[8px] text-[12px] px-[12px] py-[5px] hover:bg-[#F8FAFB]"
                }
              >
                {e.first_name} {e.last_name}
              </button>
            );
          })}
        </div>
      )}

      {selectedEmp && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  Onboarding — {selectedEmp.first_name} {selectedEmp.last_name}
                </CardTitle>
                <CardDescription>Checklista för nystart</CardDescription>
              </div>
              <span className="bg-[#F1F5F9] text-[#475569] rounded-full text-[10px] font-medium px-[8px] py-px">
                {progress}% klar
              </span>
            </div>
            {/* Progress bar — navy fill, accurate width */}
            <div className="w-full bg-[#E2E8F0] rounded-full h-[6px] mt-3 overflow-hidden">
              <div
                className="bg-[#1D4ED8] rounded-full h-[6px] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Employer tasks */}
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#94A3B8] mb-[8px]">
                Arbetsgivare att göra
              </p>
              <div>
                {employerItems.map(item => renderRow(item, item.id === "welcome"))}
              </div>
            </div>

            {/* Employee tasks */}
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#94A3B8] mb-[8px]">
                Anställd att göra (skickas via e-postlänk)
              </p>
              <div>
                {employeeItems.map(item => renderRow(item))}
              </div>
            </div>

            <Button
              className="bg-[#1D4ED8] hover:bg-[#1074A0] text-[#E6F4FA] w-full rounded-[8px] text-[12px] font-medium h-[40px] border-0"
            >
              <Send className="h-4 w-4 mr-2" />
              Skicka onboardinglänk till {selectedEmp.email || "anställd"}
            </Button>
          </CardContent>
        </Card>
      )}

      {activeEmps.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Lägg till en anställd först för att starta onboarding</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
