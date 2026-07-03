// DEPRECATED: Use src/components/tax-agent/forms/AGIForm.tsx instead
// Kept for reference — do not import this component
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertTriangle, ChevronDown, ChevronRight, Plus, Upload, Copy,
  Users, Trash2, Edit2
} from "lucide-react";
import { AGIFieldInput } from "./AGIFieldInput";
import { IndividualRecord, FKRecord } from "./types";
import { cn } from "@/lib/utils";

interface Step1Props {
  individuals: IndividualRecord[];
  onUpdate: (individuals: IndividualRecord[]) => void;
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

const getInitials = (name: string) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
};

const getStatus = (ind: IndividualRecord) => {
  if (!ind.personal_number || !ind.name) return "incomplete";
  if (ind.field_011 === 0 && ind.field_001 === 0) return "incomplete";
  return "complete";
};

export const Step1Individuals = ({ individuals, onUpdate }: Step1Props) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copyFromMonth, setCopyFromMonth] = useState("");
  const months = ["Januari", "Februari", "Mars", "April", "Maj", "Juni", "Juli", "Augusti", "September", "Oktober", "November", "December"];

  // Sheet form state
  const [formName, setFormName] = useState("");
  const [formPnr, setFormPnr] = useState("");
  const [formType, setFormType] = useState("lon");
  const [formGross, setFormGross] = useState(0);
  const [formTax, setFormTax] = useState(0);
  const [formAgi, setFormAgi] = useState(true);

  const openAddSheet = () => {
    setEditingId(null);
    setFormName("");
    setFormPnr("");
    setFormType("lon");
    setFormGross(0);
    setFormTax(0);
    setFormAgi(true);
    setSheetOpen(true);
  };

  const openEditSheet = (ind: IndividualRecord) => {
    setEditingId(ind.id);
    setFormName(ind.name);
    setFormPnr(ind.personal_number);
    setFormType("lon");
    setFormGross(ind.field_011);
    setFormTax(ind.field_001);
    setFormAgi(true);
    setSheetOpen(true);
  };

  const handleSaveSheet = () => {
    if (editingId) {
      onUpdate(individuals.map(ind =>
        ind.id === editingId
          ? { ...ind, name: formName, personal_number: formPnr, field_011: formGross, field_001: formTax }
          : ind
      ));
    } else {
      const newInd: IndividualRecord = {
        id: crypto.randomUUID(),
        name: formName,
        personal_number: formPnr,
        spec_number: individuals.length + 1,
        status: "complete",
        field_001: formTax, field_011: formGross, field_012: 0, field_013: 0,
        field_014: 0, field_015: 0, field_016: 0, field_020: 0, field_035: 0,
        showAllFields: false,
        expanded: false,
        fk_expanded: false,
        fk_date: "", fk_type: "", fk_spec: "",
        fk_records: [],
        fk_multiday: false,
      };
      onUpdate([...individuals, newInd]);
    }
    setSheetOpen(false);
  };

  const handleDelete = (id: string) => {
    onUpdate(individuals.filter(ind => ind.id !== id));
  };

  const toggleExpand = (id: string) => {
    onUpdate(individuals.map(ind => ind.id === id ? { ...ind, expanded: !ind.expanded } : ind));
  };

  const updateField = (id: string, field: string, value: any) => {
    onUpdate(individuals.map(ind => ind.id === id ? { ...ind, [field]: value } : ind));
  };

  const addFKRecord = (id: string) => {
    onUpdate(individuals.map(ind => {
      if (ind.id !== id) return ind;
      if (!ind.fk_date || !ind.fk_type) return ind;
      const rec: FKRecord = { date: ind.fk_date, type: ind.fk_type, spec: ind.fk_spec };
      return { ...ind, fk_records: [...ind.fk_records, rec], fk_date: "", fk_type: "", fk_spec: "" };
    }));
  };

  const completeCount = individuals.filter(i => getStatus(i) === "complete").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Betalningsmottagare</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Redovisa ersättningar och skatteavdrag per betalningsmottagare.
        </p>
      </div>

      {individuals.length === 0 ? (
        /* Empty state */
        <Card className="border-dashed border-2 border-border">
          <CardContent className="py-16 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#2563EB]/10 flex items-center justify-center mb-5">
              <Users className="w-8 h-8 text-[#2563EB]" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Inga betalningsmottagare tillagda</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              Lägg till betalningsmottagare manuellt eller kopiera från en tidigare period.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Button onClick={openAddSheet} className="bg-[#2563EB] hover:bg-[#2563EB]/90 text-white">
                <Plus className="w-4 h-4 mr-2" /> Lägg till betalningsmottagare
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">eller kopiera från</span>
                <Select value={copyFromMonth} onValueChange={setCopyFromMonth}>
                  <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Välj månad" /></SelectTrigger>
                  <SelectContent>
                    {months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" disabled={!copyFromMonth}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Data table */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Betalningsmottagare</TableHead>
                  <TableHead>Personnummer</TableHead>
                  <TableHead className="text-right">Bruttolön</TableHead>
                  <TableHead className="text-right">Skatteavdrag</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20 text-right">Åtgärder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {individuals.map(ind => (
                  <React.Fragment key={ind.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/30 transition-colors group"
                      onClick={() => toggleExpand(ind.id)}
                    >
                      <TableCell className="pl-3">
                        {ind.expanded
                          ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center text-xs font-bold shrink-0">
                            {getInitials(ind.name)}
                          </div>
                          <span className="font-medium text-foreground">
                            {ind.name || <span className="text-muted-foreground italic">Ej ifylld</span>}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {ind.personal_number || "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {ind.field_011 ? `${fmt(ind.field_011)} kr` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {ind.field_001 ? `${fmt(ind.field_001)} kr` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatus(ind) === "complete" ? "default" : "destructive"}
                          className={cn(
                            "text-xs",
                            getStatus(ind) === "complete"
                              ? "bg-[#E1F5EE] text-[#085041] dark:bg-emerald-900/30 dark:text-[#1D9E75] hover:bg-[#E1F5EE]"
                              : ""
                          )}
                        >
                          {getStatus(ind) === "complete" ? "Komplett" : "Ofullständig"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openEditSheet(ind); }}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); handleDelete(ind.id); }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded detail */}
                    {ind.expanded && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/10 p-0">
                          <div className="p-5 border-l-4 border-[#2563EB]/30">
                            <ExpandedIndividual
                              ind={ind}
                              onUpdateField={(field, value) => updateField(ind.id, field, value)}
                              onAddFK={() => addFKRecord(ind.id)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Bottom action bar */}
      {individuals.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={openAddSheet} className="gap-2">
              <Plus className="w-4 h-4" /> Lägg till
            </Button>
            <Button variant="outline" className="gap-2">
              <Upload className="w-4 h-4" /> Ladda upp fil
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1 text-xs">
              {completeCount}/{individuals.length} kompletta
            </Badge>
          </div>
        </div>
      )}

      {/* Side sheet for add/edit */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId ? "Redigera betalningsmottagare" : "Lägg till betalningsmottagare"}</SheetTitle>
            <SheetDescription>
              Fyll i uppgifter för betalningsmottagaren.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 py-6">
            <div className="space-y-2">
              <Label>Namn *</Label>
              <Input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="Förnamn Efternamn"
                className="rounded-lg border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              />
            </div>

            <div className="space-y-2">
              <Label>Personnummer *</Label>
              <Input
                value={formPnr}
                onChange={e => setFormPnr(e.target.value)}
                placeholder="YYYYMMDD-XXXX"
                className="font-mono rounded-lg border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              />
            </div>

            <div className="space-y-2">
              <Label>Inkomsttyp</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="rounded-lg border-slate-200 dark:border-slate-700"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lon">Lön</SelectItem>
                  <SelectItem value="pension">Pension</SelectItem>
                  <SelectItem value="formaner">Förmåner</SelectItem>
                  <SelectItem value="ersattning">Annan ersättning</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Bruttolön (kr)</Label>
              <Input
                type="number"
                value={formGross || ""}
                onChange={e => setFormGross(Number(e.target.value) || 0)}
                placeholder="0"
                className="font-mono rounded-lg border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Skatteavdrag (kr)</Label>
              <Input
                type="number"
                value={formTax || ""}
                onChange={e => setFormTax(Number(e.target.value) || 0)}
                placeholder="0"
                className="font-mono rounded-lg border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <p className="text-sm font-medium text-foreground">Arbetsgivaravgifter</p>
                <p className="text-xs text-muted-foreground">Beräknas automatiskt (31,42%)</p>
              </div>
              <Switch checked={formAgi} onCheckedChange={setFormAgi} />
            </div>

            {formAgi && formGross > 0 && (
              <div className="p-3 bg-[#2563EB]/5 rounded-lg border border-[#2563EB]/20">
                <p className="text-xs text-muted-foreground">Beräknade avgifter</p>
                <p className="text-lg font-bold font-mono text-[#2563EB]">
                  {fmt(Math.round(formGross * 0.3142))} kr
                </p>
              </div>
            )}
          </div>

          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Avbryt</Button>
            <Button
              onClick={handleSaveSheet}
              disabled={!formName || !formPnr}
              className="bg-[#2563EB] hover:bg-[#2563EB]/90 text-white"
            >
              {editingId ? "Spara ändringar" : "Lägg till"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

/* Expanded detail row */
interface ExpandedIndividualProps {
  ind: IndividualRecord;
  onUpdateField: (field: string, value: any) => void;
  onAddFK: () => void;
}

const ExpandedIndividual = ({ ind, onUpdateField, onAddFK }: ExpandedIndividualProps) => {
  const isIncomplete = !ind.personal_number || !ind.name || (ind.field_011 === 0 && ind.field_001 === 0);

  return (
    <div className="space-y-4 max-w-2xl">
      {isIncomplete && (
        <div className="p-3 bg-[#FAEEDA] dark:bg-amber-900/20 border border-[#F0DDB7] dark:border-amber-800 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-[#7A5417] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-[#7A5417] dark:text-amber-300">Uppgifter saknas</p>
            <p className="text-xs text-[#7A5417] dark:text-[#C28A2B]">
              Individuppgiften är ofullständig. Fyll i fälten nedan för att kunna skicka in.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Namn</Label>
          <Input
            value={ind.name}
            onChange={e => onUpdateField("name", e.target.value)}
            className="h-9 rounded-lg border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Personnummer</Label>
          <Input
            value={ind.personal_number}
            onChange={e => onUpdateField("personal_number", e.target.value)}
            className="h-9 font-mono rounded-lg border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
            placeholder="YYYYMMDD-XXXX"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Ersättning och skatt</p>
        <AGIFieldInput code="001" label="Avdragen preliminär skatt" value={ind.field_001} onChange={v => onUpdateField("field_001", v)} />
        <AGIFieldInput code="011" label="Kontant bruttolön m.m." value={ind.field_011} onChange={v => onUpdateField("field_011", v)} />
        <AGIFieldInput code="012" label="Övriga skattepliktiga förmåner" value={ind.field_012} onChange={v => onUpdateField("field_012", v)} />
        <AGIFieldInput code="013" label="Bilförmån" value={ind.field_013} onChange={v => onUpdateField("field_013", v)} />
        <AGIFieldInput code="014" label="Kostförmån" value={ind.field_014} onChange={v => onUpdateField("field_014", v)} />

        {ind.showAllFields && (
          <>
            <AGIFieldInput code="015" label="Bostadsförmån" value={ind.field_015} onChange={v => onUpdateField("field_015", v)} />
            <AGIFieldInput code="016" label="Övriga förmåner" value={ind.field_016} onChange={v => onUpdateField("field_016", v)} />
            <AGIFieldInput code="020" label="Sjuklön" value={ind.field_020} onChange={v => onUpdateField("field_020", v)} />
            <AGIFieldInput code="035" label="Pensionsförsäkringspremie" value={ind.field_035} onChange={v => onUpdateField("field_035", v)} />
          </>
        )}

        <Button variant="link" size="sm" className="text-xs px-0 text-[#2563EB]" onClick={() => onUpdateField("showAllFields", !ind.showAllFields)}>
          {ind.showAllFields ? "Dölj extra fält" : "Visa alla fält"}
        </Button>
      </div>

      {/* Försäkringskassan */}
      <Collapsible open={ind.fk_expanded} onOpenChange={v => onUpdateField("fk_expanded", v)}>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-[#2563EB] transition-colors w-full">
          {ind.fk_expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          Uppgifter till Försäkringskassan
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Redovisa uppgifter om frånvaro som kan ge rätt till föräldrapenning eller tillfällig föräldrapenning.
          </p>

          <div className="flex items-center gap-2">
            <Checkbox checked={ind.fk_multiday} onCheckedChange={v => onUpdateField("fk_multiday", v)} />
            <span className="text-sm">Registrera frånvaro för flera dagar</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Datum <span className="text-muted-foreground font-mono">821</span></Label>
              <Input type="date" value={ind.fk_date} onChange={e => onUpdateField("fk_date", e.target.value)} className="h-9 rounded-lg border-slate-200 dark:border-slate-700" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Typ <span className="text-muted-foreground font-mono">823</span></Label>
              <Select value={ind.fk_type} onValueChange={v => onUpdateField("fk_type", v)}>
                <SelectTrigger className="h-9 rounded-lg border-slate-200 dark:border-slate-700"><SelectValue placeholder="Välj typ" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="foraldrapenning">Föräldrapenning</SelectItem>
                  <SelectItem value="tillfällig_foraldrapenning">Tillfällig föräldrapenning</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Spec.nr <span className="text-muted-foreground font-mono">822</span></Label>
              <Input value={ind.fk_spec} onChange={e => onUpdateField("fk_spec", e.target.value)} className="h-9 rounded-lg border-slate-200 dark:border-slate-700" />
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={onAddFK}>Spara frånvarouppgift</Button>

          {ind.fk_records.length > 0 && (
            <div className="space-y-1 mt-2">
              <p className="text-xs font-medium text-muted-foreground">Sparade uppgifter</p>
              {ind.fk_records.map((r, i) => (
                <div key={i} className="text-xs bg-muted/50 rounded-lg px-3 py-1.5 flex gap-4 font-mono">
                  <span>{r.date}</span>
                  <span>{r.type}</span>
                  <span>{r.spec}</span>
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
