import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Calendar, TrendingUp, Sun, Heart, FileText, Upload,
  Briefcase, Phone, Mail, MapPin, Clock, Pencil, Save, Loader2, ChevronsUpDown, Check, Info,
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip } from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, LINE_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { useChartTheme } from "@/hooks/useChartTheme";
import { KOMMUN_NAMES, lookupKommunSkatt, SKATTE_KOLUMN_DESCRIPTIONS } from "@/lib/kommunSkatt";
import { cn } from "@/lib/utils";
import { KommunCombobox } from "@/components/hr/KommunCombobox";

function validatePersonnummer(pnr: string): boolean {
  const cleaned = pnr.replace(/-/g, '').replace(/\+/g, '');
  if (cleaned.length !== 10 && cleaned.length !== 12) return false;
  const digits = cleaned.slice(-10);
  if (!/^\d{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let d = parseInt(digits[i]) * (i % 2 === 0 ? 2 : 1);
    if (d > 9) d -= 9;
    sum += d;
  }
  return (10 - (sum % 10)) % 10 === parseInt(digits[9]);
}

interface Employee { id: string;
  first_name: string;
  last_name: string;
  personal_number: string;
  email: string | null;
  employment_type: string;
  monthly_salary: number | null;
  is_active: boolean;
  vacation_days_per_year: number;
  vacation_days_used: number | null;
  vacation_pay_percentage: number;
  employment_start?: string;
  municipality?: string | null;
  tax_table?: string | null;
  tax_column?: number | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  birth_date?: string | null;
}

interface EmployeeDrawerProps { employee: Employee | null;
  open: boolean;
  onClose: () => void;
  companyId: string;
  onUpdate?: () => void;
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

const employeeNumber = (id: string) => `EMP-${id.substring(0, 3).toUpperCase()}`;

export const EmployeeDrawer = ({ employee, open, onClose, companyId, onUpdate }: EmployeeDrawerProps) => {
  const chartTheme = useChartTheme(); const [benefits, setBenefits] = useState({ pension: true,
    pensionRate: 4.5,
    wellness: true,
    wellnessAmount: 5000,
    wellnessUsed: 0,
    companyCar: false,
    carBenefitValue: 0,
    mobilePhone: false,
    healthInsurance: false,
    homeOffice: false,
    homeOfficeAmount: 0,
  });

  const [sickLeaveHistory] = useState([
    { date: "2026-01-15", days: 2, type: "Sjuk", cost: 2400 },
    { date: "2025-11-03", days: 1, type: "VAB", cost: 1200 },
  ]);

  // Edit state
  const [editForm, setEditForm] = useState({ first_name: "",
    last_name: "",
    email: "",
    monthly_salary: "",
    municipality: "",
    tax_table: "",
    tax_column: "",
    employment_type: "",
    vacation_days_per_year: "",
    is_active: true,
    address: "",
    postal_code: "",
    city: "",
    birth_date: "",
    personal_number: "",
  });
  const [saving, setSaving] = useState(false);
  const [lookingUpTax, setLookingUpTax] = useState(false);

  const [decryptedPersonalNumber, setDecryptedPersonalNumber] = useState<string>("");

  useEffect(() => { if (employee) { setEditForm({ first_name: employee.first_name || "",
        last_name: employee.last_name || "",
        email: employee.email || "",
        monthly_salary: String(employee.monthly_salary || ""),
        municipality: employee.municipality || "",
        tax_table: employee.tax_table || "",
        tax_column: String(employee.tax_column || ""),
        employment_type: employee.employment_type || "permanent",
        vacation_days_per_year: String(employee.vacation_days_per_year || 25),
        is_active: employee.is_active,
        address: employee.address || "",
        postal_code: employee.postal_code || "",
        city: employee.city || "",
        birth_date: employee.birth_date || "",
        personal_number: employee.personal_number || "",
      });
      setDecryptedPersonalNumber(employee.personal_number || "");

      // If the personal number is masked, fetch the decrypted version via secure RPC
      const masked = !employee.personal_number || employee.personal_number === "********" || employee.personal_number.includes("*");
      if (masked && employee.id) {
        (supabase.rpc as any)("get_employee_pii", { p_employee_id: employee.id })
          .then(({ data, error }: any) => {
            if (error) {
              console.warn("Could not decrypt PII:", error.message);
              return;
            }
            const pn = data?.personal_number || data?.[0]?.personal_number || "";
            if (pn && pn !== "********") {
              setDecryptedPersonalNumber(pn);
              setEditForm(prev => ({ ...prev, personal_number: pn }));
            }
          });
      }
    }
  }, [employee]);

  // Auto-lookup tax table when municipality or salary changes
  useEffect(() => { const municipality = editForm.municipality?.trim();
    const salary = editForm.monthly_salary ? Number(editForm.monthly_salary) : 0;
    const personalNumber = editForm.personal_number?.trim();

    if (!municipality || !salary || !personalNumber) return;

    const timeout = setTimeout(async () => { setLookingUpTax(true);
      try { const { data, error } = await supabase.functions.invoke('lookup-person', { body: { personal_number: personalNumber, monthly_salary: salary, municipality },
        });
        if (!error && data?.success && data.data?.tax_table) { setEditForm(prev => ({ ...prev,
            tax_table: data.data.tax_table,
            tax_column: String(data.data.tax_column || prev.tax_column),
            vacation_days_per_year: String(data.data.vacation_days_per_year || prev.vacation_days_per_year),
          }));
          toast.success(`Skattetabell ${data.data.tax_table} kol ${data.data.tax_column} hämtad från SKV`);
        }
      } catch (e) { console.error('Tax table lookup failed:', e);
      } finally { setLookingUpTax(false);
      }
    }, 600);

    return () => clearTimeout(timeout);
  }, [editForm.municipality, editForm.monthly_salary, editForm.personal_number]);

  if (!employee) return null;

  const handleSave = async () => { setSaving(true);
    try { const updates: Record<string, any> = { first_name: editForm.first_name,
        last_name: editForm.last_name,
        email: editForm.email || null,
        monthly_salary: editForm.monthly_salary ? Number(editForm.monthly_salary) : null,
        municipality: editForm.municipality || null,
        tax_table: editForm.tax_table || null,
        tax_column: editForm.tax_column ? Number(editForm.tax_column) : null,
        employment_type: editForm.employment_type,
        vacation_days_per_year: editForm.vacation_days_per_year ? Number(editForm.vacation_days_per_year) : 25,
        is_active: editForm.is_active,
        address: editForm.address || null,
        postal_code: editForm.postal_code || null,
        city: editForm.city || null,
        birth_date: editForm.birth_date || null,
        personal_number: editForm.personal_number?.trim() || null,
      };

      const { error } = await supabase
        .from("employees")
        .update(updates)
        .eq("id", employee.id)
        .eq("company_id", companyId);

      if (error) throw error;

      toast.success("Anställd uppdaterad!");
      onUpdate?.();
      onClose();
    } catch (err: any) { toast.error("Kunde inte spara: " + (err.message || "Okänt fel"));
    } finally { setSaving(false);
    }
  };

  const salary = employee.monthly_salary || 0;
  const pensionCost = benefits.pension ? salary * (benefits.pensionRate / 100) : 0;
  const mobileBenefit = benefits.mobilePhone ? 350 : 0;
  const healthBenefit = benefits.healthInsurance ? 600 : 0;
  const homeOfficeBenefit = benefits.homeOffice ? benefits.homeOfficeAmount : 0;
  const totalBenefitValue = pensionCost + mobileBenefit + healthBenefit + homeOfficeBenefit + benefits.carBenefitValue;

  const vacationEarned = employee.vacation_days_per_year;
  const vacationUsed = employee.vacation_days_used || 0;
  const vacationRemaining = vacationEarned - vacationUsed;
  const dailySalary = salary / 21;
  const vacationPayEarned = salary * (employee.vacation_pay_percentage / 100);
  const vacationDebt = vacationRemaining * dailySalary;

  const salaryHistory = Array.from({ length: 12 }, (_, i) => ({ month: new Date(2025, i).toLocaleDateString("sv-SE", { month: "short" }),
    salary: salary - (i > 8 ? 1200 : 0),
  }));

  const employmentLabel =
    employee.employment_type === "permanent" ? "Tillsvidare" :
    employee.employment_type === "temporary" ? "Tidsbegränsad" : "Timanställd";

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
              {employee.first_name[0]}{employee.last_name[0]}
            </div>
            <div>
              <SheetTitle className="text-lg">
                {employee.first_name} {employee.last_name}
              </SheetTitle>
              <p className="text-sm text-muted-foreground">{employeeNumber(employee.id)}</p>
              <Badge variant={employee.is_active ? "default" : "secondary"} className="mt-1">
                {employee.is_active ? "Aktiv" : "Inaktiv"}
              </Badge>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="overview" className="mt-2">
          <TabsList className="grid grid-cols-4 sm:grid-cols-7 w-full">
            <TabsTrigger value="overview" className="text-xs px-1">Översikt</TabsTrigger>
            <TabsTrigger value="edit" className="text-xs px-1">Redigera</TabsTrigger>
            <TabsTrigger value="benefits" className="text-xs px-1">Förmåner</TabsTrigger>
            <TabsTrigger value="salary" className="text-xs px-1">Lön</TabsTrigger>
            <TabsTrigger value="vacation" className="text-xs px-1">Semester</TabsTrigger>
            <TabsTrigger value="sick" className="text-xs px-1">Sjuk</TabsTrigger>
            <TabsTrigger value="docs" className="text-xs px-1">Dokument</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Personnummer</p>
                <p className="text-sm font-medium">{decryptedPersonalNumber || employee.personal_number}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Startdatum</p>
                <p className="text-sm font-medium">{employee.employment_start || "Ej angivet"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Anställningsform</p>
                <p className="text-sm font-medium">{employmentLabel}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Löneart</p>
                <p className="text-sm font-medium">Månadslön</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Bruttolön</p>
                <p className="text-sm font-bold">{fmt(salary)} kr/mån</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Kommun</p>
                <p className="text-sm font-medium capitalize">{employee.municipality || "Ej angiven"}</p>
              </div>
              {employee.email && (
                <div className="space-y-1 col-span-2">
                  <p className="text-xs text-muted-foreground">E-post</p>
                  <p className="text-sm font-medium">{employee.email}</p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Skattetabell</p>
                <p className="text-sm font-medium">{employee.tax_table || "–"} kol {employee.tax_column || "–"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Kollektivavtal</p>
                <p className="text-sm font-medium">Inget</p>
              </div>
            </div>
          </TabsContent>

          {/* EDIT */}
          <TabsContent value="edit" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Förnamn</Label>
                <Input
                  value={editForm.first_name}
                  onChange={e => setEditForm({ ...editForm, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Efternamn</Label>
                <Input
                  value={editForm.last_name}
                  onChange={e => setEditForm({ ...editForm, last_name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">E-post</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="anställd@företag.se"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Månadslön (kr)</Label>
                <Input
                  type="number"
                  value={editForm.monthly_salary}
                  onChange={e => setEditForm({ ...editForm, monthly_salary: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Anställningsform</Label>
                <Select
                  value={editForm.employment_type}
                  onValueChange={v => setEditForm({ ...editForm, employment_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permanent">Tillsvidare</SelectItem>
                    <SelectItem value="temporary">Tidsbegränsad</SelectItem>
                    <SelectItem value="hourly">Timanställd</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Personnummer with validation */}
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Personnummer</Label>
                <div className="relative">
                  <Input
                    value={editForm.personal_number}
                    onChange={e => setEditForm({ ...editForm, personal_number: e.target.value })}
                    placeholder="ÅÅÅÅMMDD-XXXX"
                    maxLength={13}
                    className="pr-20"
                  />
                  {editForm.personal_number && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      {validatePersonnummer(editForm.personal_number) ? (
                        <Check className="w-4 h-4 text-[#085041]" />
                      ) : (
                        <span className="text-[10px] text-destructive font-medium">Ogiltigt</span>
                      )}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">Format: ÅÅMMDD-XXXX (används för AGI-rapportering)</p>
              </div>
              {/* Födelsedatum */}
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs flex items-center gap-1">
                  Födelsedatum
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild><Info className="w-3 h-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent className="max-w-[220px] text-xs">
                        Krävs för korrekt beräkning av åldersdifferentierade arbetsgivaravgifter (under 18: 10,21%, 18–65: 31,42%, över 65: 10,21%)
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  type="date"
                  value={editForm.birth_date}
                  onChange={e => setEditForm({ ...editForm, birth_date: e.target.value })}
                  placeholder="ÅÅÅÅ-MM-DD"
                />
                <p className="text-[10px] text-muted-foreground">Valfritt — används för AGI-avgiftsberäkning</p>
              </div>
              {/* Kommun Combobox */}
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Kommun</Label>
                <KommunCombobox
                  value={editForm.municipality}
                  onChange={(kommun) => {
                    setEditForm(prev => ({ ...prev, municipality: kommun }));
                    const info = lookupKommunSkatt(kommun);
                    if (info) {
                      setEditForm(prev => ({
                        ...prev,
                        municipality: kommun,
                        tax_table: String(info.skattetabell),
                        tax_column: String(info.defaultKolumn),
                      }));
                      toast.info(
                        `Skattetabell ${info.skattetabell} (${info.kommunalskatt}% kommunalskatt) hämtad för ${info.kommunnamn}`,
                        { duration: 3000 }
                      );
                    }
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  Skattetabell
                  {lookingUpTax && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                  {!lookingUpTax && editForm.tax_table && <span className="text-[10px] text-[#085041] dark:text-[#1D9E75] font-normal">auto</span>}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild><Info className="w-3 h-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent className="max-w-[220px] text-xs">
                        Automatiskt beräknat baserat på kommun. Justera manuellt vid behov (t.ex. för A-skatt eller jämkning).
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  value={editForm.tax_table}
                  onChange={e => setEditForm({ ...editForm, tax_table: e.target.value })}
                  placeholder="Fylls i automatiskt"
                  className={lookingUpTax ? "opacity-50" : ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  Skattekolumn
                  {lookingUpTax && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                </Label>
                <Input
                  type="number"
                  value={editForm.tax_column}
                  onChange={e => setEditForm({ ...editForm, tax_column: e.target.value })}
                  placeholder="1"
                  className={lookingUpTax ? "opacity-50" : ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Semesterdagar/år</Label>
                <Input
                  type="number"
                  value={editForm.vacation_days_per_year}
                  onChange={e => setEditForm({ ...editForm, vacation_days_per_year: e.target.value })}
                />
              </div>
            </div>

            {/* Collapsible skattekolumn info */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                <Info className="w-3 h-3" />
                <span>Vad betyder skattekolumnerna?</span>
                <ChevronsUpDown className="w-3 h-3" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-1 pb-2">
                <div className="rounded-md border bg-muted/30 p-3 space-y-1">
                  {Object.entries(SKATTE_KOLUMN_DESCRIPTIONS).map(([col, desc]) => (
                    <p key={col} className={cn("text-[11px]", Number(col) === Number(editForm.tax_column) ? "text-foreground font-medium" : "text-muted-foreground")}>
                      {desc}
                    </p>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Address section */}
            <div className="space-y-3 pt-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Adress</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Gatuadress</Label>
                <Input
                  value={editForm.address}
                  onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                  placeholder="Exempelgatan 12"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Postnummer</Label>
                  <Input
                    value={editForm.postal_code}
                    onChange={e => setEditForm({ ...editForm, postal_code: e.target.value })}
                    placeholder="123 45"
                    maxLength={6}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Ort</Label>
                  <Input
                    value={editForm.city}
                    onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                    placeholder="Stockholm"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="text-sm font-medium">Aktiv anställd</p>
                <p className="text-xs text-muted-foreground">Avaktivera för att dölja från lönekörningar</p>
              </div>
              <Switch
                checked={editForm.is_active}
                onCheckedChange={v => setEditForm({ ...editForm, is_active: v })}
              />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sparar...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Spara ändringar
                </>
              )}
            </Button>
          </TabsContent>

          {/* BENEFITS */}
          <TabsContent value="benefits" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Tjänstepension</p>
                  <p className="text-xs text-muted-foreground">{benefits.pensionRate}% av bruttolön = {fmt(pensionCost)} kr/mån</p>
                </div>
                <Switch checked={benefits.pension} onCheckedChange={v => setBenefits({ ...benefits, pension: v })} />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Friskvårdsbidrag</p>
                  <p className="text-xs text-muted-foreground">{fmt(benefits.wellnessAmount)} kr/år — {fmt(benefits.wellnessUsed)} kr utnyttjat</p>
                </div>
                <Switch checked={benefits.wellness} onCheckedChange={v => setBenefits({ ...benefits, wellness: v })} />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Mobiltelefon</p>
                  <p className="text-xs text-muted-foreground">Förmånsvärde 4 200 kr/år (350 kr/mån)</p>
                </div>
                <Switch checked={benefits.mobilePhone} onCheckedChange={v => setBenefits({ ...benefits, mobilePhone: v })} />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Sjukvårdsförsäkring</p>
                  <p className="text-xs text-muted-foreground">Förmånsvärde ca 7 200 kr/år (600 kr/mån)</p>
                </div>
                <Switch checked={benefits.healthInsurance} onCheckedChange={v => setBenefits({ ...benefits, healthInsurance: v })} />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Hemmakontor</p>
                  <p className="text-xs text-muted-foreground">Månadsersättning {fmt(benefits.homeOfficeAmount)} kr</p>
                </div>
                <Switch checked={benefits.homeOffice} onCheckedChange={v => setBenefits({ ...benefits, homeOffice: v })} />
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-semibold">Totalt förmånsvärde: {fmt(totalBenefitValue)} kr/mån</p>
              <p className="text-xs text-muted-foreground mt-1">Skattas som lön, påverkar AGI</p>
            </div>
          </TabsContent>

          {/* SALARY HISTORY */}
          <TabsContent value="salary" className="space-y-4 mt-4">
            <p className="text-sm font-medium">Löneutveckling (senaste 12 mån)</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={salaryHistory}>
              <ChartGradients />
                <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v / 1000)}k`} domain={["dataMin - 2000", "dataMax + 2000"]} />
                <RechartsTooltip formatter={(v: number) => `${fmt(v)} kr`} />
                <Line type="monotone" dataKey="salary" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>

            <div className="space-y-2">
              <p className="text-sm font-medium">Historik</p>
              <div className="border rounded-lg divide-y">
                <div className="flex items-center justify-between p-3 text-sm">
                  <span>2026-01-01</span>
                  <span className="text-primary font-medium">+1 200 kr</span>
                  <span>{fmt(salary)} kr</span>
                  <span className="text-muted-foreground text-xs">Lönerevision</span>
                </div>
                <div className="flex items-center justify-between p-3 text-sm">
                  <span>2025-01-01</span>
                  <span className="text-primary font-medium">+1 500 kr</span>
                  <span>{fmt(salary - 1200)} kr</span>
                  <span className="text-muted-foreground text-xs">Anställning</span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* VACATION */}
          <TabsContent value="vacation" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">Intjänade dagar</p>
                <p className="text-xl font-bold">{vacationEarned}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">Uttagna dagar</p>
                <p className="text-xl font-bold">{vacationUsed}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">Kvarvarande</p>
                <p className="text-xl font-bold text-primary">{vacationRemaining}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">Semesterlön intjänad</p>
                <p className="text-xl font-bold">{fmt(vacationPayEarned)} kr</p>
              </Card>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-semibold">Semesterdagsskuld: {fmt(vacationDebt)} kr</p>
              <p className="text-xs text-muted-foreground">Balansräkningspost — konto 2920</p>
            </div>
          </TabsContent>

          {/* SICK LEAVE */}
          <TabsContent value="sick" className="space-y-4 mt-4">
            <p className="text-sm font-medium">Sjukfrånvarohistorik</p>
            {sickLeaveHistory.length > 0 ? (
              <div className="border rounded-lg divide-y">
                {sickLeaveHistory.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 text-sm">
                    <span>{s.date}</span>
                    <span>{s.days} dag{s.days > 1 ? "ar" : ""}</span>
                    <Badge variant={s.type === "Sjuk" ? "destructive" : "secondary"} className="text-xs">{s.type}</Badge>
                    <span className="text-muted-foreground">{fmt(s.cost)} kr</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">Ingen sjukfrånvaro registrerad</p>
            )}

            <Button variant="outline" className="w-full">
              <Calendar className="h-4 w-4 mr-2" />
              Registrera sjukfrånvaro
            </Button>
          </TabsContent>

          {/* DOCUMENTS */}
          <TabsContent value="docs" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Anställningsavtal</p>
                    <p className="text-xs text-muted-foreground">Status: Osignerat</p>
                  </div>
                </div>
                <Badge variant="secondary">Osignerat</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Skattekort</p>
                    <p className="text-xs text-muted-foreground">Tabell {employee.tax_table || "–"}</p>
                  </div>
                </div>
                <Badge variant="default">Inläst</Badge>
              </div>
            </div>

            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">Dra hit dokument eller klicka för att ladda upp</p>
              <p className="text-xs text-muted-foreground mt-1">Avtal, ID-handling, intyg</p>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
