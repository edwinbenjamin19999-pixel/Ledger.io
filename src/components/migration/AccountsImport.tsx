import { useState } from "react";
import { SmartFileUpload } from "./SmartFileUpload";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Download, FileSpreadsheet, Check, X } from "lucide-react";
import { generateCSV, downloadCSV, readFileAsCSV } from "@/lib/csv-utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface AccountsImportProps { companyId: string;
  onImportComplete: () => void;
}

interface ImportRow { account_number: string;
  account_name: string;
  account_type: string;
  vat_code?: string;
  valid: boolean;
  errors: string[];
}

export function AccountsImport({ companyId, onImportComplete }: AccountsImportProps) { const [open, setOpen] = useState(false);
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [useSmartImport, setUseSmartImport] = useState(true);
  const { toast } = useToast();

  const downloadTemplate = () => { const template = [
      { 'Kontonummer': '1910',
        'Kontonamn': 'Kassa',
        'Kontotyp': 'asset',
        'Momskod': ''
      },
      { 'Kontonummer': '3001',
        'Kontonamn': 'Försäljning varor Sverige',
        'Kontotyp': 'revenue',
        'Momskod': 'SE25'
      },
      { 'Kontonummer': '5010',
        'Kontonamn': 'Lokalhyra',
        'Kontotyp': 'expense',
        'Momskod': 'SE25'
      }
    ];

    const csv = generateCSV(template);
    downloadCSV(csv, "mall_kontoplan.csv");
    
    toast({ title: "Mall nedladdad",
      description: "CSV-mallen har laddats ner. Fyll i kontoplan.",
    });
  };

  const validateRow = (row: Record<string, string>): ImportRow => { const errors: string[] = [];
    
    if (!row['Kontonummer']) errors.push('Kontonummer saknas');
    if (!row['Kontonamn']) errors.push('Kontonamn saknas');
    if (!row['Kontotyp']) errors.push('Kontotyp saknas');

    const validTypes = ['asset', 'liability', 'equity', 'revenue', 'expense'];
    const accountType = row['Kontotyp']?.toLowerCase().trim();
    if (accountType && !validTypes.includes(accountType)) { errors.push('Ogiltig kontotyp (använd: asset, liability, equity, revenue, expense)');
    }

    return { account_number: row['Kontonummer'] || '',
      account_name: row['Kontonamn'] || '',
      account_type: accountType || 'asset',
      vat_code: row['Momskod'] || undefined,
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

      const accountsToInsert = validRows.map(row => ({ company_id: companyId,
        account_number: row.account_number,
        account_name: row.account_name,
        account_type: row.account_type,
        vat_code: row.vat_code,
        is_active: true
      }));

      const { error } = await supabase
        .from('chart_of_accounts')
        .insert(accountsToInsert);

      if (error) throw error;

      toast({ title: "Import genomförd!",
        description: `${validRows.length} konton har importerats`,
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
        Importera kontoplan
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importera kontoplan från CSV</DialogTitle>
            <DialogDescription>
              Ladda upp en CSV-fil med kontoplan från Fortnox, Visma eller annat system.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {useSmartImport ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    AI känner automatiskt igen ditt filformat
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setUseSmartImport(false)}
                  >
                    Använd traditionell import
                  </Button>
                </div>
                <SmartFileUpload 
                  dataType="accounts" 
                  companyId={companyId}
                  onImportComplete={() => { setOpen(false);
                    onImportComplete();
                  }}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Traditionell import med fast mall
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setUseSmartImport(true)}
                  >
                    Prova AI-import istället
                  </Button>
                </div>
            <div className="flex gap-4">
              <Button onClick={downloadTemplate} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Ladda ner mall
              </Button>
              
              <div className="flex-1">
                <Label htmlFor="accounts-file-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-accent">
                    <FileSpreadsheet className="w-4 h-4" />
                    Välj CSV-fil
                  </div>
                  <input
                    id="accounts-file-upload"
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
                    <strong>Förhandsgranskning:</strong> Kontrollera att kontoplanen ser korrekt ut innan import.
                  </AlertDescription>
                </Alert>

                <div className="border rounded-lg overflow-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Status</TableHead>
                        <TableHead>Kontonummer</TableHead>
                        <TableHead>Kontonamn</TableHead>
                        <TableHead>Typ</TableHead>
                        <TableHead>Momskod</TableHead>
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
                          <TableCell className="font-mono font-semibold">{row.account_number}</TableCell>
                          <TableCell>{row.account_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{row.account_type}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{row.vat_code || '-'}</TableCell>
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
                      {importing ? "Importerar..." : `Importera ${previewData.filter(r => r.valid).length} konton`}
                    </Button>
                   </div>
                 </div>
                 </>
               )}
             </div>
           )}
         </div>
       </DialogContent>
      </Dialog>
    </>
  );
}