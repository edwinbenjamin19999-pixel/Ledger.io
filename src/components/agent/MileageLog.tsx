import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Car, Plus, Calculator, CheckCircle, Loader2, Download, Bookmark, Trash2, Route, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
// jsPDF & autoTable loaded lazily via dynamic import
import { AddressAutocomplete, calculateRouteDistance } from "./AddressAutocomplete";

interface MileageLogProps { companyId: string;
  userId: string;
}

interface MileageEntry { id: string;
  date: string;
  from: string;
  to: string;
  distanceKm: number;
  purpose: string;
  purposeLabel: string;
  ratePerMil: number;
  totalAmount: number;
  vehicle: string;
  status: "draft" | "booked";
}

interface TripTemplate { id: string;
  name: string;
  from: string;
  to: string;
  distanceKm: number;
}

const SKATTEVERKET_RATE_PRIVATE = 25; // kr/mil för private car
const PURPOSE_OPTIONS = [
  { value: "customer_meeting", label: "Kundmöte" },
  { value: "supplier_visit", label: "Leverantörsbesök" },
  { value: "office", label: "Kontor" },
  { value: "conference", label: "Konferens/utbildning" },
  { value: "delivery", label: "Leverans" },
  { value: "other", label: "Annat" },
];

export function MileageLog({ companyId, userId }: MileageLogProps) { const [entries, setEntries] = useState<MileageEntry[]>([]);
  const [templates, setTemplates] = useState<TripTemplate[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [calculatingDistance, setCalculatingDistance] = useState(false);

  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [fromCoords, setFromCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [toCoords, setToCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [distanceKm, setDistanceKm] = useState("");
  const [purposeType, setPurposeType] = useState("customer_meeting");
  const [purposeNote, setPurposeNote] = useState("");
  const [vehicle, setVehicle] = useState("private_car");

  useEffect(() => { const saved = localStorage.getItem(`mileage-templates-${companyId}`);
    if (saved) { try { setTemplates(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, [companyId]);

  // Auto-calculate distance when both coordinates are set
  useEffect(() => { if (fromCoords && toCoords) { setCalculatingDistance(true);
      calculateRouteDistance(fromCoords.lat, fromCoords.lon, toCoords.lat, toCoords.lon)
        .then((km) => { if (km !== null) { setDistanceKm(String(km));
            toast({ title: "Avstånd beräknat", description: `${km} km via vägnätet` });
          }
        })
        .finally(() => setCalculatingDistance(false));
    }
  }, [fromCoords, toCoords]);

  const distanceNum = parseFloat(distanceKm) || 0;
  const milCount = distanceNum / 10;
  const ratePerMil = SKATTEVERKET_RATE_PRIVATE;
  const totalAmount = milCount * ratePerMil;

  const applyTemplate = (template: TripTemplate) => { setFrom(template.from);
    setTo(template.to);
    setDistanceKm(String(template.distanceKm));
    setFromCoords(null);
    setToCoords(null);
    setShowForm(true);
  };

  const saveAsTemplate = () => { if (!templateName || !from || !to || !distanceKm) return;
    const t: TripTemplate = { id: crypto.randomUUID(),
      name: templateName,
      from, to,
      distanceKm: distanceNum,
    };
    const updated = [...templates, t];
    setTemplates(updated);
    localStorage.setItem(`mileage-templates-${companyId}`, JSON.stringify(updated));
    setTemplateName("");
    setShowTemplateDialog(false);
    toast({ title: "Mall sparad", description: `"${t.name}" tillagd` });
  };

  const deleteTemplate = (id: string) => { const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    localStorage.setItem(`mileage-templates-${companyId}`, JSON.stringify(updated));
  };

  const handleSubmit = async () => { if (!from || !to || !distanceKm || distanceNum <= 0) { toast({ title: "Fyll i från, till och avstånd", variant: "destructive" });
      return;
    }

    setSaving(true);
    try { const purposeLabel = PURPOSE_OPTIONS.find(p => p.value === purposeType)?.label || purposeType;
      const fullPurpose = purposeNote ? `${purposeLabel}: ${purposeNote}` : purposeLabel;

      const entry: MileageEntry = { id: crypto.randomUUID(),
        date, from, to,
        distanceKm: distanceNum,
        purpose: fullPurpose,
        purposeLabel,
        ratePerMil,
        totalAmount,
        vehicle,
        status: "draft",
      };

      const description = `Milersättning: ${from} → ${to} (${distanceNum} km)`;
      
      // Get or create accounts first
      const debitAccountId = await getAccountId(companyId, "5810");
      const creditAccountId = await getAccountId(companyId, "2893");
      
      const { data: journalEntry, error: jeError } = await supabase
        .from("journal_entries")
        .insert({ company_id: companyId,
          description,
          entry_date: date,
          status: "draft",
          created_by: userId,
          memo: `Körjournal: ${fullPurpose}. ${from} till ${to}, ${distanceNum} km. ${vehicle === "private_car" ? "Privat bil" : "Tjänstebil"}. Skatteverkets schablon: ${ratePerMil} kr/mil.`,
        })
        .select("id")
        .maybeSingle();

      if (jeError) throw jeError;

      const { error: lineError } = await supabase
        .from("journal_entry_lines")
        .insert([
          { journal_entry_id: journalEntry.id, account_id: debitAccountId, debit: totalAmount, credit: 0 },
          { journal_entry_id: journalEntry.id, account_id: creditAccountId, debit: 0, credit: totalAmount },
        ]);

      if (lineError) throw lineError;

      entry.status = "booked";
      setEntries(prev => [entry, ...prev]);
      toast({ title: "Körjournal sparad", description: `${distanceNum} km = ${totalAmount.toFixed(0)} kr bokfört på konto 5810` });

      // Reset form
      setFrom("");
      setTo("");
      setDistanceKm("");
      setPurposeNote("");
      setFromCoords(null);
      setToCoords(null);
      setShowForm(false);
    } catch (err: any) { console.error("MileageLog save error:", err);
      toast({ title: "Fel vid sparning", description: err.message || "Kunde inte spara resan", variant: "destructive" });
    } finally { setSaving(false);
    }
  };

  const totalKm = entries.reduce((s, e) => s + e.distanceKm, 0);
  const totalReimbursement = entries.reduce((s, e) => s + e.totalAmount, 0);

  const exportPDF = async () => { if (entries.length === 0) { toast({ title: "Ingen data", description: "Registrera resor först.", variant: "destructive" });
      return;
    }
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Körjournal", 14, 20);
    doc.setFontSize(10);
    doc.text(`Genererad: ${new Date().toLocaleDateString("sv-SE")}`, 14, 28);
    doc.text(`Skatteverkets milersättning: ${ratePerMil} kr/mil (2026)`, 14, 34);

    const body = entries.map(e => [
      e.date, e.from, e.to,
      `${e.distanceKm} km`, e.purpose,
      e.vehicle === "private_car" ? "Privat" : "Tjänste",
      `${e.totalAmount.toFixed(0)} kr`,
    ]);
    body.push(["", "", "TOTALT", `${totalKm} km`, "", "", `${totalReimbursement.toFixed(0)} kr`]);

    autoTable(doc, { startY: 42,
      head: [["Datum", "Från", "Till", "Sträcka", "Ändamål", "Fordon", "Ersättning"]],
      body,
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    const blob = doc.output("blob");
    window.open(URL.createObjectURL(blob), "_blank");
    toast({ title: "Körjournal exporterad" });
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Resor denna månad</p>
            <p className="text-3xl font-bold mt-1">{entries.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total sträcka</p>
            <p className="text-3xl font-bold mt-1">{totalKm.toFixed(0)} km</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Milersättning</p>
            <p className="text-3xl font-bold mt-1">{totalReimbursement.toFixed(0)} kr</p>
            <p className="text-xs text-muted-foreground mt-1">Konto 5810 | {ratePerMil} kr/mil (2026)</p>
          </CardContent>
        </Card>
      </div>

      {/* Templates */}
      {templates.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Sparade rutter</h3>
          <div className="flex gap-2 flex-wrap">
            {templates.map(t => (
              <div key={t.id} className="flex items-center gap-1">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={() => applyTemplate(t)}>
                  <Route className="h-3 w-3" /> {t.name} ({t.distanceKm} km)
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteTemplate(t.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Ny resa
          </Button>
        )}
        {entries.length > 0 && (
          <Button variant="outline" onClick={exportPDF} className="gap-1.5">
            <Download className="h-4 w-4" /> Skapa Skatteverket-körjournal
          </Button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-4 w-4 text-primary" />
              Registrera resa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Datum</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <Label>Fordon</Label>
                <Select value={vehicle} onValueChange={setVehicle}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private_car">Privat bil</SelectItem>
                    <SelectItem value="company_car">Tjänstebil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Från</Label>
                <AddressAutocomplete
                  value={from}
                  onChange={(val, lat, lon) => { setFrom(val);
                    if (lat !== undefined && lon !== undefined) { setFromCoords({ lat, lon });
                    }
                  }}
                  placeholder="Sök adress..."
                />
              </div>
              <div>
                <Label className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Till</Label>
                <AddressAutocomplete
                  value={to}
                  onChange={(val, lat, lon) => { setTo(val);
                    if (lat !== undefined && lon !== undefined) { setToCoords({ lat, lon });
                    }
                  }}
                  placeholder="Sök adress..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="flex items-center gap-1">
                  Avstånd (km)
                  {calculatingDistance && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                </Label>
                <Input
                  type="number"
                  placeholder="Beräknas automatiskt"
                  value={distanceKm}
                  onChange={e => setDistanceKm(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">Välj adresser ovan för automatisk beräkning</p>
              </div>
              <div>
                <Label>Syfte</Label>
                <Select value={purposeType} onValueChange={setPurposeType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PURPOSE_OPTIONS.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Detaljer (valfritt)</Label>
                <Input placeholder="t.ex. Möte med Kund AB" value={purposeNote} onChange={e => setPurposeNote(e.target.value)} />
              </div>
            </div>

            {distanceNum > 0 && (
              <Card className="bg-muted/50">
                <CardContent className="py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calculator className="h-4 w-4 text-primary" />
                    <span>{from || "Start"} {"\u2192"} {to || "Mål"}, {distanceNum} km = {milCount.toFixed(1)} mil x {ratePerMil} kr = </span>
                    <span className="font-bold">{totalAmount.toFixed(0)} kr</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Bokförs: Debet 5810 (Bilkostnader) / Kredit 2893 (Löneskulder)
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleSubmit} disabled={saving || !from || !to || distanceNum <= 0} className="gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Spara och bokför
              </Button>
              {from && to && distanceNum > 0 && (
                <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-1.5">
                      <Bookmark className="h-4 w-4" /> Spara som mall
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Spara ruttmall</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                      <div>
                        <Label>Namn på mall</Label>
                        <Input
                          placeholder="t.ex. Kontoret till Kund X"
                          value={templateName}
                          onChange={e => setTemplateName(e.target.value)}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {from} {"\u2192"} {to}, {distanceNum} km
                      </p>
                      <Button onClick={saveAsTemplate} disabled={!templateName} className="w-full">
                        Spara mall
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              <Button variant="outline" onClick={() => setShowForm(false)}>Avbryt</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly route summary */}
      {entries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Route className="h-4 w-4 text-primary" /> Månadens resor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {entries.map(entry => (
                <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{entry.from} {"\u2192"} {entry.to}</span>
                        <Badge variant={entry.status === "booked" ? "default" : "secondary"} className="text-[10px]">
                          {entry.status === "booked" ? "Bokförd" : "Utkast"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {entry.date} | {entry.distanceKm} km | {entry.purpose}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-sm shrink-0">{entry.totalAmount.toFixed(0)} kr</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {entries.length === 0 && !showForm && (
        <Card>
          <CardContent className="py-12 text-center">
            <Car className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Ingen körjournal registrerad</p>
            <p className="text-xs text-muted-foreground mt-1">Klicka "Ny resa" för att registrera en tjänsteresa</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

async function getAccountId(companyId: string, accountNumber: string): Promise<string> { const { data } = await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("company_id", companyId)
    .eq("account_number", accountNumber)
    .maybeSingle();

  if (data) return data.id;

  const accountNames: Record<string, { name: string; type: string }> = { "5810": { name: "Bilkostnader", type: "expense" },
    "7331": { name: "Bilersättningar", type: "expense" },
    "2893": { name: "Löneskulder", type: "liability" },
  };
  const info = accountNames[accountNumber] || { name: `Konto ${accountNumber}`, type: "expense" };

  const { data: created, error } = await supabase
    .from("chart_of_accounts")
    .insert({ company_id: companyId, account_number: accountNumber, account_name: info.name, account_type: info.type })
    .select("id")
    .maybeSingle();

  if (error) throw new Error(`Kunde inte skapa konto ${accountNumber}: ${error.message}`);
  return created!.id;
}
