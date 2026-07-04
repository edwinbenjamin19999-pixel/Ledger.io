import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileCode, Loader2, CheckCircle, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SIEExportPanelProps { companyId: string;
  companyName: string;
}

const SIE_FORMATS = [
  { value: "SIE4", label: "SIE4", desc: "Komplett — kontoplan, saldon och alla verifikationer. Standard för revision och flytt." },
  { value: "SIE3", label: "SIE3", desc: "Kontoplan och periodsaldon per månad. Används ofta för koncernrapportering." },
  { value: "SIE2", label: "SIE2", desc: "Årsbalanser — kontoplan och årssaldon. Komprimerad sammanfattning." },
  { value: "SIE1", label: "SIE1", desc: "Enbart årssaldon — minimal fil utan kontonamn." },
];

const PREVIEW_LINES = `#FLAGGA 0
#PROGRAM "Cogniq" 2.0
#FORMAT PC8
#GEN 20260410
#SIETYP 4
#FNR 1
#ORGNR 5591234567
#FNAMN "Ditt Företag AB"
#RAR 0 20260101 20261231
#KONTO 1930 "Bank"`;

export const SIEExportPanel = ({ companyId, companyName }: SIEExportPanelProps) => { const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [sieFormat, setSieFormat] = useState("SIE4");
  const [includeZero, setIncludeZero] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [lastExport, setLastExport] = useState<{ verifications: number;
    accounts: number;
    fileName: string;
  } | null>(null);

  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  const handleExport = async () => { setExporting(true);
    try { const year = parseInt(selectedYear);
      const { data, error } = await supabase.functions.invoke('export-sie4', { body: { companyId,
          fiscalYearStart: `${year}-01-01`,
          fiscalYearEnd: `${year}-12-31`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const blob = new Blob([data.content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.fileName || `${sieFormat}_${selectedYear}.se`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLastExport({ verifications: data.summary?.verifications || 0,
        accounts: data.summary?.accounts || 0,
        fileName: data.fileName,
      });

      toast.success(`${sieFormat}-fil exporterad: ${data.summary?.verifications || 0} verifikationer`);
    } catch (err: any) { console.error('SIE export error:', err);
      toast.error(err.message || 'Kunde inte exportera SIE-fil');
    } finally { setExporting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Config panel */}
      <Card className="rounded-2xl shadow-md">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-[#0F1F3D]">
              <FileCode className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">SIE-export</h3>
              <p className="text-xs text-muted-foreground">Exportera bokföringsdata i SIE-format</p>
            </div>
          </div>

          {/* Format selector */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Format</label>
            <TooltipProvider>
              <div className="grid grid-cols-4 gap-1.5">
                {SIE_FORMATS.map((f) => (
                  <Tooltip key={f.value}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setSieFormat(f.value)}
                        className={`rounded-xl px-3 py-2 text-sm font-medium border transition-all ${ sieFormat === f.value
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-card text-foreground border-border hover:border-indigo-300 hover:text-indigo-600"
                        }`}
                      >
                        {f.label}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="text-xs">{f.desc}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          </div>

          {/* Year */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Räkenskapsår</label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="rounded-xl border-border focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y}>{y} (jan–dec)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Zero balance toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="sie-zero" className="text-sm text-muted-foreground">Inkludera nollsaldokonton</Label>
            <Switch id="sie-zero" checked={includeZero} onCheckedChange={setIncludeZero} />
          </div>

          {/* Export button */}
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="w-full h-12 text-base font-semibold rounded-xl bg-[#0F1F3D] hover:from-indigo-700 hover:to-violet-700"
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporterar...
              </>
            ) : (
              <>
                <Download className="h-5 w-5 mr-2" />
                Ladda ned {sieFormat}-fil
              </>
            )}
          </Button>

          {lastExport && (
            <div className="flex items-center gap-2 text-sm text-[#085041] bg-[#E1F5EE] rounded-xl p-3">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>
                <strong>{lastExport.fileName}</strong> — {lastExport.accounts} konton, {lastExport.verifications} verifikationer
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview panel */}
      <Card className="rounded-2xl shadow-md">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Förhandsvisning ({sieFormat})</h3>
          </div>
          <pre className="font-mono text-xs bg-slate-900 text-[#1D9E75] p-4 rounded-xl overflow-x-auto leading-relaxed max-h-80">
            {PREVIEW_LINES}
          </pre>
          <div className="bg-muted/30 rounded-xl p-3 space-y-1">
            <p className="text-xs font-medium text-foreground">Vad ingår?</p>
            <ul className="text-xs text-muted-foreground space-y-0.5 list-disc ml-4">
              <li>Kontoplan (alla aktiva konton)</li>
              <li>Ingående & utgående balanser</li>
              <li>Resultaträkningskonton</li>
              {sieFormat === "SIE4" && <li>Alla godkända verifikationer med konteringsrader</li>}
              {sieFormat === "SIE3" && <li>Periodsaldon per månad</li>}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
