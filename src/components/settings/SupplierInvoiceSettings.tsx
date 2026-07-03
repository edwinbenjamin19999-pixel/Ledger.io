import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, ShieldCheck, Zap, AlertTriangle, CreditCard, BookOpen, Sparkles, Loader2,
  Users, Eye, FileWarning, ScanLine, Repeat, FileText, Bot, Plus, Trash2, UserCheck
} from "lucide-react";
import { toast } from "sonner";
import type { FourEyesMode } from "@/hooks/useInvoiceApproval";

interface Attestant { id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  maxAmount: number;
  canApprove: boolean;
  canPay: boolean;
  canRegister: boolean;
}

interface SupplierInvoiceSettingsProps { companyId: string;
}

interface SettingsState { // Attest
  fourEyesPrinciple: boolean;
  fourEyesMode: FourEyesMode;
  extraApprovalThreshold: number;
  fallbackAttestant: string;
  autoRemindDays: number;
  // Automation
  autoApproveEnabled: boolean;
  autoApproveMaxAmount: number;
  autoAccountingPerSupplier: boolean;
  recurringAutoFlow: boolean;
  autoPeriodize: boolean;
  // Controls
  duplicateCheck: boolean;
  flagNewSuppliers: boolean;
  flagHighAmountThreshold: number;
  requireAttachment: boolean;
  ocrValidation: boolean;
  // Payments
  defaultPaymentMethod: string;
  separateApprovalAndPayment: boolean;
  // Accounting
  defaultCostAccount: string;
  defaultVatHandling: string;
  requireCostCenter: boolean;
  // AI
  aiSuggestAccounting: boolean;
  aiAutoBookkeep: boolean;
  aiAutoBookkeepThreshold: number;
  aiFlagAnomalies: boolean;
}

const defaultSettings: SettingsState = { fourEyesPrinciple: true,
  fourEyesMode: "four_threshold",
  extraApprovalThreshold: 50000,
  fallbackAttestant: "",
  autoRemindDays: 3,
  autoApproveEnabled: false,
  autoApproveMaxAmount: 2000,
  autoAccountingPerSupplier: true,
  recurringAutoFlow: false,
  autoPeriodize: true,
  duplicateCheck: true,
  flagNewSuppliers: true,
  flagHighAmountThreshold: 100000,
  requireAttachment: true,
  ocrValidation: true,
  defaultPaymentMethod: "bankgiro",
  separateApprovalAndPayment: true,
  defaultCostAccount: "4010",
  defaultVatHandling: "auto",
  requireCostCenter: false,
  aiSuggestAccounting: true,
  aiAutoBookkeep: false,
  aiAutoBookkeepThreshold: 95,
  aiFlagAnomalies: true,
};

const ToggleRow = ({ icon: Icon, label, description, checked, onChange }: { icon: React.ElementType; label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between py-2.5">
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

export const SupplierInvoiceSettings = ({ companyId }: SupplierInvoiceSettingsProps) => { const [s, setS] = useState<SettingsState>(() => { try { const saved = localStorage.getItem(`supplier-invoice-settings-${companyId}`);
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch { return defaultSettings; }
  });
  const [saving, setSaving] = useState(false);

  const [attestants, setAttestants] = useState<Attestant[]>(() => { try { const saved = localStorage.getItem(`supplier-invoice-attestants-${companyId}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [newAttestant, setNewAttestant] = useState<Omit<Attestant, 'id'>>({ firstName: '', lastName: '', email: '', role: 'attestant',
    maxAmount: 100000, canApprove: true, canPay: false, canRegister: false,
  });

  const update = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => { setS(prev => ({ ...prev, [key]: value }));
  };

  const addAttestant = () => { if (!newAttestant.firstName.trim() || !newAttestant.lastName.trim() || !newAttestant.email.trim()) { toast.error("Fyll i förnamn, efternamn och e-post");
      return;
    }
    const updated = [...attestants, { ...newAttestant, id: crypto.randomUUID() }];
    setAttestants(updated);
    localStorage.setItem(`supplier-invoice-attestants-${companyId}`, JSON.stringify(updated));
    setNewAttestant({ firstName: '', lastName: '', email: '', role: 'attestant', maxAmount: 100000, canApprove: true, canPay: false, canRegister: false });
    toast.success("Attestant tillagd");
  };

  const removeAttestant = (id: string) => { const updated = attestants.filter(a => a.id !== id);
    setAttestants(updated);
    localStorage.setItem(`supplier-invoice-attestants-${companyId}`, JSON.stringify(updated));
    toast.success("Attestant borttagen");
  };

  const save = () => { setSaving(true);
    try { localStorage.setItem(`supplier-invoice-settings-${companyId}`, JSON.stringify(s));
      localStorage.setItem(`supplier-invoice-attestants-${companyId}`, JSON.stringify(attestants));
      toast.success("Inställningar för leverantörsfakturor sparade!");
    } catch { toast.error("Kunde inte spara");
    } finally { setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Recommended setup */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Rekommenderad setup
          </CardTitle>
          <CardDescription>Baserat på bolagets storlek och behov</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { title: "Litet bolag", desc: "1–3 anställda", badge: "Enkelt", items: ["Auto-godkänn < 2 000 kr", "AI-kontering på", "Ej fyra-ögon"] },
              { title: "Växande bolag", desc: "4–20 anställda", badge: "Rekommenderat", items: ["Fyra-ögon > 50 000 kr", "AI-förslag + manuell attest", "Dubblettkontroll"] },
              { title: "Större bolag", desc: "20+ anställda", badge: "Strikt", items: ["Alltid fyra-ögon", "Beloppsgränser per roll", "Fullständig audit trail"] },
            ].map((p, i) => (
              <div key={i} className={`border rounded-lg p-4 space-y-2 ${i === 1 ? "border-primary/50 bg-primary/5" : ""}`}>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">{p.title}</h4>
                  <Badge variant={i === 1 ? "default" : "outline"} className="text-[10px]">{p.badge}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{p.desc}</p>
                <ul className="space-y-1">
                  {p.items.map((item, j) => (
                    <li key={j} className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-primary flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. Attestation & approval */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Attest & godkännande
          </CardTitle>
          <CardDescription>Roller, beloppsgränser och attestflöde</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              Attestprincip
            </Label>
            <RadioGroup
              value={s.fourEyesMode}
              onValueChange={(v) => {
                const mode = v as FourEyesMode;
                update("fourEyesMode", mode);
                update("fourEyesPrinciple", mode !== "two");
              }}
              className="grid gap-2"
            >
              <label
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${s.fourEyesMode === "two" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}
              >
                <RadioGroupItem value="two" className="mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Två ögon</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    En attestant räcker — lämpligt för enmansbolag eller mycket små organisationer.
                  </p>
                </div>
              </label>
              <label
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${s.fourEyesMode === "four_always" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}
              >
                <RadioGroupItem value="four_always" className="mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Fyra ögon — alltid</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Två olika personer måste attestera varje faktura. Rekommenderas för stärkt intern kontroll.
                  </p>
                </div>
              </label>
              <label
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${s.fourEyesMode === "four_threshold" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}
              >
                <RadioGroupItem value="four_threshold" className="mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Fyra ögon — över beloppströskel</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Två ögon under tröskeln, fyra ögon över. Bra balans mellan kontroll och flöde.
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">
                {s.fourEyesMode === "four_threshold"
                  ? "Tröskelbelopp för andra attest"
                  : "Extra godkännande vid belopp över"}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={s.extraApprovalThreshold}
                  onChange={e => update("extraApprovalThreshold", parseInt(e.target.value) || 0)}
                  className="max-w-[140px]"
                  disabled={s.fourEyesMode !== "four_threshold"}
                />
                <span className="text-sm text-muted-foreground">kr</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {s.fourEyesMode === "four_threshold"
                  ? "Fakturor över detta belopp kräver två attestanter"
                  : s.fourEyesMode === "four_always"
                  ? "Alla fakturor kräver två attestanter — tröskel ej tillämplig"
                  : "Endast en attestant krävs — tröskel ej tillämplig"}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Påminnelse till attestant efter</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={s.autoRemindDays}
                  onChange={e => update("autoRemindDays", parseInt(e.target.value) || 1)}
                  className="max-w-[80px]"
                />
                <span className="text-sm text-muted-foreground">dagar</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Fallback-attestant (e-post)</Label>
            <Input
              placeholder="chef@foretaget.se"
              value={s.fallbackAttestant}
              onChange={e => update("fallbackAttestant", e.target.value)}
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">Tar över om ordinarie attestant inte agerar inom angiven tid</p>
          </div>
        </CardContent>
      </Card>

      {/* Attestant management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            Attestanter
          </CardTitle>
          <CardDescription>Lägg till och hantera attestanter med roller, beloppsgränser och behörigheter</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {attestants.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Namn</TableHead>
                    <TableHead className="text-xs">E-post</TableHead>
                    <TableHead className="text-xs">Roll</TableHead>
                    <TableHead className="text-xs text-right">Beloppsgräns</TableHead>
                    <TableHead className="text-xs text-center">Attest</TableHead>
                    <TableHead className="text-xs text-center">Betala</TableHead>
                    <TableHead className="text-xs text-center">Registrera</TableHead>
                    <TableHead className="text-xs w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attestants.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm font-medium">{a.firstName} {a.lastName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {a.role === 'attestant' ? 'Attestant' : a.role === 'approver' ? 'Godkännare' : a.role === 'payer' ? 'Betalare' : 'Admin'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-right">{a.maxAmount.toLocaleString('sv-SE')} kr</TableCell>
                      <TableCell className="text-center">{a.canApprove ? <Badge variant="default" className="text-[9px] px-1.5">Ja</Badge> : <span className="text-xs text-muted-foreground">–</span>}</TableCell>
                      <TableCell className="text-center">{a.canPay ? <Badge variant="default" className="text-[9px] px-1.5">Ja</Badge> : <span className="text-xs text-muted-foreground">–</span>}</TableCell>
                      <TableCell className="text-center">{a.canRegister ? <Badge variant="default" className="text-[9px] px-1.5">Ja</Badge> : <span className="text-xs text-muted-foreground">–</span>}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeAttestant(a.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <Separator />

          <div className="space-y-3">
            <Label className="text-sm font-semibold">Lägg till ny attestant</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Förnamn</Label>
                <Input
                  placeholder="Anna"
                  value={newAttestant.firstName}
                  onChange={e => setNewAttestant(p => ({ ...p, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Efternamn</Label>
                <Input
                  placeholder="Andersson"
                  value={newAttestant.lastName}
                  onChange={e => setNewAttestant(p => ({ ...p, lastName: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">E-post</Label>
                <Input
                  type="email"
                  placeholder="anna@foretaget.se"
                  value={newAttestant.email}
                  onChange={e => setNewAttestant(p => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Roll</Label>
                <Select value={newAttestant.role} onValueChange={v => setNewAttestant(p => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="attestant">Attestant</SelectItem>
                    <SelectItem value="approver">Godkännare</SelectItem>
                    <SelectItem value="payer">Betalare</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Beloppsgräns (kr)</Label>
                <Input
                  type="number"
                  value={newAttestant.maxAmount}
                  onChange={e => setNewAttestant(p => ({ ...p, maxAmount: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Switch checked={newAttestant.canApprove} onCheckedChange={v => setNewAttestant(p => ({ ...p, canApprove: v }))} />
                <Label className="text-xs">Kan attestera</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={newAttestant.canPay} onCheckedChange={v => setNewAttestant(p => ({ ...p, canPay: v }))} />
                <Label className="text-xs">Kan betala</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={newAttestant.canRegister} onCheckedChange={v => setNewAttestant(p => ({ ...p, canRegister: v }))} />
                <Label className="text-xs">Kan registrera</Label>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={addAttestant}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Lägg till attestant
            </Button>
          </div>
        </CardContent>
      </Card>


      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Automatisering
          </CardTitle>
          <CardDescription>Automatiska flöden för snabbare hantering</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            icon={Zap}
            label="Auto-godkänn små belopp"
            description={`Fakturor under ${s.autoApproveMaxAmount.toLocaleString()} kr godkänns automatiskt`}
            checked={s.autoApproveEnabled}
            onChange={v => update("autoApproveEnabled", v)}
          />
          {s.autoApproveEnabled && (
            <div className="ml-7 space-y-2">
              <Label className="text-sm">Max-belopp för auto-godkännande</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={s.autoApproveMaxAmount}
                  onChange={e => update("autoApproveMaxAmount", parseInt(e.target.value) || 0)}
                  className="max-w-[140px]"
                />
                <span className="text-sm text-muted-foreground">kr</span>
              </div>
            </div>
          )}

          <Separator />

          <ToggleRow
            icon={BookOpen}
            label="Auto-kontering per leverantör"
            description="Föreslå konto automatiskt baserat på leverantörens historik"
            checked={s.autoAccountingPerSupplier}
            onChange={v => update("autoAccountingPerSupplier", v)}
          />

          <ToggleRow
            icon={Repeat}
            label="Återkommande fakturor → automatiskt flöde"
            description="Hyra, abonnemang och liknande fakturor matchas och konteras automatiskt"
            checked={s.recurringAutoFlow}
            onChange={v => update("recurringAutoFlow", v)}
          />

          <ToggleRow
            icon={FileText}
            label="Automatisk periodisering"
            description="Periodisera hyror och abonnemang som sträcker sig över flera månader"
            checked={s.autoPeriodize}
            onChange={v => update("autoPeriodize", v)}
          />
        </CardContent>
      </Card>

      {/* 4. Controls & risk */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            Kontroll & risk
          </CardTitle>
          <CardDescription>Skydd mot dubbletter, bedrägerier och felaktigheter</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            icon={FileWarning}
            label="Dubblettkontroll"
            description="Blockera fakturor med samma fakturanummer, belopp och leverantör"
            checked={s.duplicateCheck}
            onChange={v => update("duplicateCheck", v)}
          />

          <ToggleRow
            icon={AlertTriangle}
            label="Flagga nya leverantörer"
            description="Varna när en faktura registreras från en ny, okänd leverantör"
            checked={s.flagNewSuppliers}
            onChange={v => update("flagNewSuppliers", v)}
          />

          <div className="flex items-center justify-between py-2.5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <Label className="text-sm font-medium">Flagga ovanligt höga belopp</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Varna vid fakturor över angivet belopp</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={s.flagHighAmountThreshold}
                onChange={e => update("flagHighAmountThreshold", parseInt(e.target.value) || 0)}
                className="w-[120px] text-right"
              />
              <span className="text-xs text-muted-foreground">kr</span>
            </div>
          </div>

          <Separator />

          <ToggleRow
            icon={FileText}
            label="Kräv bilaga (PDF/kvitto)"
            description="Fakturan kan inte godkännas utan bifogat originalunderlag"
            checked={s.requireAttachment}
            onChange={v => update("requireAttachment", v)}
          />

          <ToggleRow
            icon={ScanLine}
            label="OCR-validering"
            description="Kontrollera att OCR-tolkat belopp, moms och datum stämmer mot bilagan"
            checked={s.ocrValidation}
            onChange={v => update("ocrValidation", v)}
          />
        </CardContent>
      </Card>

      {/* 5. Payments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Betalningar
          </CardTitle>
          <CardDescription>Betalmetod, filformat och separation av godkännande/betalning</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Standard betalmetod</Label>
              <Select value={s.defaultPaymentMethod} onValueChange={v => update("defaultPaymentMethod", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bankgiro">Bankgiro (BG)</SelectItem>
                  <SelectItem value="plusgiro">Plusgiro (PG)</SelectItem>
                  <SelectItem value="iban">IBAN / Utlandsbetalning</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Betalfilsformat</Label>
              <div className="flex items-center gap-2 h-9 px-3 bg-muted/50 rounded-md border">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm">ISO 20022 pain.001</span>
                <Badge variant="outline" className="text-[10px] ml-auto">Standard</Badge>
              </div>
            </div>
          </div>

          <ToggleRow
            icon={ShieldCheck}
            label="Separera godkännande och betalning"
            description="En person attesterar, en annan godkänner betalningen – stärkt intern kontroll"
            checked={s.separateApprovalAndPayment}
            onChange={v => update("separateApprovalAndPayment", v)}
          />
        </CardContent>
      </Card>

      {/* 6. Accounting defaults */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Kontering
          </CardTitle>
          <CardDescription>Standardkonton, moms och kostnadsställe</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Standardkonto (kostnad)</Label>
              <Input
                placeholder="4010"
                value={s.defaultCostAccount}
                onChange={e => update("defaultCostAccount", e.target.value)}
                className="max-w-[140px]"
              />
              <p className="text-xs text-muted-foreground">Används om inget leverantörsspecifikt konto finns</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Momshantering</Label>
              <Select value={s.defaultVatHandling} onValueChange={v => update("defaultVatHandling", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automatisk (AI-baserad)</SelectItem>
                  <SelectItem value="25">Alltid 25%</SelectItem>
                  <SelectItem value="12">Alltid 12%</SelectItem>
                  <SelectItem value="6">Alltid 6%</SelectItem>
                  <SelectItem value="0">Momsfri</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <ToggleRow
            icon={BookOpen}
            label="Kräv kostnadsställe / projekt"
            description="Alla leverantörsfakturor måste ha kostnadsställe eller projekt"
            checked={s.requireCostCenter}
            onChange={v => update("requireCostCenter", v)}
          />
        </CardContent>
      </Card>

      {/* 7. AI behavior */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI-beteende
          </CardTitle>
          <CardDescription>Styr hur AI hanterar leverantörsfakturor</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            icon={Bot}
            label="AI får föreslå kontering"
            description="AI analyserar fakturan och föreslår konto, moms och kostnadsställe"
            checked={s.aiSuggestAccounting}
            onChange={v => update("aiSuggestAccounting", v)}
          />

          <ToggleRow
            icon={Zap}
            label="AI får auto-bokföra"
            description={`Bokför automatiskt vid AI-säkerhet ≥ ${s.aiAutoBookkeepThreshold}%`}
            checked={s.aiAutoBookkeep}
            onChange={v => update("aiAutoBookkeep", v)}
          />
          {s.aiAutoBookkeep && (
            <div className="ml-7 space-y-2">
              <Label className="text-sm">Minsta AI-säkerhet för auto-bokföring</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={50}
                  max={100}
                  value={s.aiAutoBookkeepThreshold}
                  onChange={e => update("aiAutoBookkeepThreshold", parseInt(e.target.value) || 95)}
                  className="max-w-[80px]"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          )}

          <Separator />

          <ToggleRow
            icon={AlertTriangle}
            label="AI flaggar avvikelser"
            description="Flagga fakturor med ovanligt belopp, okänd leverantör eller avvikande mönster"
            checked={s.aiFlagAnomalies}
            onChange={v => update("aiFlagAnomalies", v)}
          />
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end pb-4">
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
          Spara inställningar
        </Button>
      </div>
    </div>
  );
};
