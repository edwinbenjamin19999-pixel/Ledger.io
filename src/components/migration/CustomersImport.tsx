import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Download, FileSpreadsheet, Check, X } from "lucide-react";
import { generateCSV, downloadCSV, readFileAsCSV } from "@/lib/csv-utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CustomersImportProps { companyId: string;
  onImportComplete: () => void;
}

interface ImportRow { name: string;
  org_number?: string;
  email?: string;
  phone?: string;
  address?: string;
  contact_person?: string;
  payment_terms?: number;
  valid: boolean;
  errors: string[];
}

export function CustomersImport({ companyId, onImportComplete }: CustomersImportProps) { const [open, setOpen] = useState(false);
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  const downloadTemplate = () => { const template = [
      { 'Kundnamn': 'Acme AB',
        'Organisationsnummer': '5569123456',
        'E-post': 'faktura@acme.se',
        'Telefon': '0812345678',
        'Adress': 'Kundvägen 1, 111 22 Stockholm',
        'Kontaktperson': 'Anna Andersson',
        'Betalningsvillkor (dagar)': '30'
      }
    ];

    const csv = generateCSV(template);
    downloadCSV(csv, "mall_kunder.csv");
    
    toast({ title: "Mall nedladdad",
      description: "CSV-mallen har laddats ner. Fyll i kunduppgifter.",
    });
  };

  const validateRow = (row: Record<string, string>): ImportRow => { const errors: string[] = [];
    
    if (!row['Kundnamn']) errors.push('Kundnamn saknas');

    return { name: row['Kundnamn'] || '',
      org_number: row['Organisationsnummer'] || undefined,
      email: row['E-post'] || undefined,
      phone: row['Telefon'] || undefined,
      address: row['Adress'] || undefined,
      contact_person: row['Kontaktperson'] || undefined,
      payment_terms: row['Betalningsvillkor (dagar)'] ? parseInt(row['Betalningsvillkor (dagar)']) : 30,
      valid: errors.length === 0,
      errors
    };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0];
    if (!file) return;

    try { const jsonData = await readFileAsCSV(file);
      const validatedData = jsonData.map(row => validateRow(row));
      
      setPreviewData(validatedData);
      
      const validCount = validatedData.filter(r => r.valid).length;
      const invalidCount = validatedData.length - validCount;

      toast({ title: "Fil inläst",
        description: `${validCount} giltiga rader, ${invalidCount} fel hittades`,
      });
    } catch (error) { console.error('Error reading file:', error);
      toast({ title: "Fel vid inläsning",
        description: "Kunde inte läsa filen. Kontrollera formatet (CSV/TSV).",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => { const validRows = previewData.filter(row => row.valid);
    
    if (validRows.length === 0) { toast({ title: "Inga giltiga rader",
        description: "Åtgärda felen innan import",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);

    try { const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      toast({ title: "Import genomförd!",
        description: `${validRows.length} kunder redo att importeras`,
      });

      setOpen(false);
      setPreviewData([]);
      onImportComplete();
    } catch (error) { console.error('Import error:', error);
      toast({ title: "Fel vid import",
        description: "Något gick fel vid importen",
        variant: "destructive",
      });
    } finally { setImporting(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline">
        <Upload className="w-4 h-4 mr-2" />
        Importera kunder
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importera kunder från CSV</DialogTitle>
            <DialogDescription>
              Ladda upp en CSV-fil med kunduppgifter från Fortnox, Visma eller annat system.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex gap-4">
              <Button onClick={downloadTemplate} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Ladda ner mall
              </Button>
              
              <div className="flex-1">
                <Label htmlFor="customers-file-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-accent">
                    <FileSpreadsheet className="w-4 h-4" />
                    Välj CSV-fil
                  </div>
                  <input
                    id="customers-file-upload"
                    type="file"
                    accept=".csv,.tsv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </Label>
              </div>
            </div>

            {previewData.length > 0 && (
              <>
                <Alert>
                  <AlertDescription>
                    <strong>Förhandsgranskning:</strong> Kontrollera att uppgifterna ser korrekta ut innan import.
                  </AlertDescription>
                </Alert>

                <div className="border rounded-lg overflow-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Status</TableHead>
                        <TableHead>Kundnamn</TableHead>
                        <TableHead>Org.nr</TableHead>
                        <TableHead>E-post</TableHead>
                        <TableHead>Telefon</TableHead>
                        <TableHead>Problem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((row, index) => (
                        <TableRow key={index} className={row.valid ? 'bg-[#E1F5EE] dark:bg-green-950/20' : 'bg-[#FCE8E8] dark:bg-red-950/20'}>
                          <TableCell>
                            {row.valid ? (
                              <Check className="w-4 h-4 text-[#085041]" />
                            ) : (
                              <X className="w-4 h-4 text-[#7A1A1A]" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell className="font-mono text-sm">{row.org_number || '-'}</TableCell>
                          <TableCell>{row.email || '-'}</TableCell>
                          <TableCell>{row.phone || '-'}</TableCell>
                          <TableCell>
                            {row.errors.length > 0 ? (
                              <div className="text-xs text-[#7A1A1A] space-y-1">
                                {row.errors.map((error, i) => (
                                  <div key={i}>• {error}</div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-[#085041]">OK</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-between items-center pt-4">
                  <div className="text-sm text-muted-foreground">
                    {previewData.filter(r => r.valid).length} av {previewData.length} rader är giltiga
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => { setPreviewData([]);
                        setOpen(false);
                      }}
                    >
                      Avbryt
                    </Button>
                    <Button 
                      onClick={handleImport} 
                      disabled={importing || previewData.filter(r => r.valid).length === 0}
                    >
                      {importing ? "Importerar..." : `Importera ${previewData.filter(r => r.valid).length} kunder`}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}