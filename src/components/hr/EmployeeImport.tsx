import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Download, FileSpreadsheet, Check, X } from "lucide-react";
import { readFileAsCSV } from "@/lib/csv-utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EmployeeImportProps { companyId: string;
  onImportComplete: () => void;
}

interface ImportRow { personal_number: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: string;
  municipality?: string;
  employment_start: string;
  employment_type: string;
  monthly_salary?: number;
  hourly_rate?: number;
  tax_table?: string;
  tax_column?: number;
  vacation_days_per_year?: number;
  bank_account?: string;
  valid: boolean;
  errors: string[];
}

export function EmployeeImport({ companyId, onImportComplete }: EmployeeImportProps) { const [open, setOpen] = useState(false);
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  const downloadTemplate = async () => { const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    
    // --- Instruktioner-flik ---
    const instrSheet = workbook.addWorksheet('Instruktioner');
    instrSheet.getColumn('A').width = 22;
    instrSheet.getColumn('B').width = 60;

    const instrTitle = instrSheet.addRow(['Importmall — Anställda']);
    instrTitle.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1A1A2E' } };
    instrSheet.mergeCells('A1:B1');
    instrSheet.addRow([]);

    const instructions = [
      ['Fält', 'Beskrivning'],
      ['Personnummer', '10 eller 12 siffror, t.ex. 199001011234'],
      ['Förnamn / Efternamn', 'Obligatoriskt'],
      ['E-post', 'Valfritt, men rekommenderas'],
      ['Telefon', 'Valfritt'],
      ['Adress', 'Valfritt'],
      ['Kommun', 'Används för automatisk skattetabell, t.ex. Stockholm'],
      ['Anställningsdatum', 'Format: ÅÅÅÅ-MM-DD'],
      ['Anställningstyp', 'full_time, part_time, temporary eller hourly'],
      ['Månadslön', 'Obligatoriskt för fast anställda (heltal utan kr)'],
      ['Timlön', 'Obligatoriskt för timanställda'],
      ['Skattetabell', 'Räknas fram automatiskt om kommun anges'],
      ['Kolumn', 'Skattekolumn (1 = utan jämkning)'],
      ['Semesterdagar/år', 'Standard: 25'],
      ['Bankkonto', 'Valfritt, clearing + kontonummer'],
    ];

    instructions.forEach((row, i) => { const r = instrSheet.addRow(row);
      if (i === 0) { r.eachCell(cell => { cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A90D9' } };
        });
      }
    });

    // --- Data-flik ---
    const dataSheet = workbook.addWorksheet('Anställda');

    const headers = [
      'Personnummer', 'Förnamn', 'Efternamn', 'E-post', 'Telefon',
      'Adress', 'Kommun', 'Anställningsdatum', 'Anställningstyp',
      'Månadslön', 'Timlön', 'Skattetabell', 'Kolumn', 'Semesterdagar/år', 'Bankkonto'
    ];

    const headerRow = dataSheet.addRow(headers);
    headerRow.eachCell((cell, colNumber) => { cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D6A4F' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { bottom: { style: 'medium', color: { argb: 'FF1B4332' } },
      };
    });
    headerRow.height = 28;

    // Exempelrad
    const exampleRow = dataSheet.addRow([
      '199001011234', 'Anna', 'Andersson', 'anna@example.com', '0701234567',
      'Storgatan 1', 'Stockholm', '2024-01-01', 'full_time',
      35000, '', '33', 1, 25, '123456789'
    ]);
    exampleRow.eachCell(cell => { cell.font = { italic: true, color: { argb: 'FF6B7280' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFDE7' } };
    });

    // Tom rad för att börja fylla i
    dataSheet.addRow([]);

    // Kolumnbredder
    const widths = [16, 14, 14, 24, 14, 22, 14, 18, 16, 12, 10, 12, 8, 16, 16];
    widths.forEach((w, i) => { dataSheet.getColumn(i + 1).width = w; });

    // Autofilter
    dataSheet.autoFilter = { from: 'A1', to: 'O1' };

    // Obligatoriska fält markerade
    ['A1', 'B1', 'C1', 'H1', 'I1'].forEach(ref => { const cell = dataSheet.getCell(ref);
      cell.value = cell.value + ' *';
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mall_anstallda.xlsx';
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: "Mall nedladdad",
      description: "Excel-mallen har laddats ner. Fyll i dina anställdas uppgifter under fliken 'Anställda'.",
    });
  };

  const validateRow = (row: Record<string, string>, index: number): ImportRow => { const errors: string[] = [];
    
    if (!row['Personnummer']) errors.push('Personnummer saknas');
    if (!row['Förnamn']) errors.push('Förnamn saknas');
    if (!row['Efternamn']) errors.push('Efternamn saknas');
    if (!row['Anställningsdatum']) errors.push('Anställningsdatum saknas');
    if (!row['Anställningstyp']) errors.push('Anställningstyp saknas');

    const validTypes = ['full_time', 'part_time', 'temporary', 'hourly'];
    const employmentType = row['Anställningstyp']?.toLowerCase().trim();
    if (employmentType && !validTypes.includes(employmentType)) { errors.push('Ogiltig anställningstyp (använd: full_time, part_time, temporary, hourly)');
    }

    if (employmentType === 'hourly' && !row['Timlön']) { errors.push('Timlön krävs för timanställda');
    }
    if (employmentType !== 'hourly' && !row['Månadslön']) { errors.push('Månadslön krävs för denna anställningstyp');
    }

    const personalNumber = row['Personnummer']?.toString().replace(/\D/g, '');
    if (personalNumber && (personalNumber.length !== 10 && personalNumber.length !== 12)) { errors.push('Ogiltigt personnummer format');
    }

    return { personal_number: row['Personnummer'] || '',
      first_name: row['Förnamn'] || '',
      last_name: row['Efternamn'] || '',
      email: row['E-post'] || undefined,
      phone: row['Telefon'] || undefined,
      address: row['Adress'] || undefined,
      municipality: row['Kommun'] || undefined,
      employment_start: row['Anställningsdatum'] || '',
      employment_type: employmentType || 'full_time',
      monthly_salary: row['Månadslön'] ? parseFloat(row['Månadslön']) : undefined,
      hourly_rate: row['Timlön'] ? parseFloat(row['Timlön']) : undefined,
      tax_table: row['Skattetabell'] || undefined,
      tax_column: row['Kolumn'] ? parseInt(row['Kolumn']) : undefined,
      vacation_days_per_year: row['Semesterdagar/år'] ? parseInt(row['Semesterdagar/år']) : 25,
      bank_account: row['Bankkonto'] || undefined,
      valid: errors.length === 0,
      errors
    };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0];
    if (!file) return;

    try { const jsonData = await readFileAsCSV(file);
      const validatedData = jsonData.map((row, index) => validateRow(row, index));
      
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

      const employeesToInsert = validRows.map(row => ({ company_id: companyId,
        personal_number: row.personal_number,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        phone: row.phone,
        address: row.address,
        municipality: row.municipality,
        employment_start: row.employment_start,
        employment_type: row.employment_type,
        monthly_salary: row.monthly_salary,
        hourly_rate: row.hourly_rate,
        tax_table: row.tax_table,
        tax_column: row.tax_column,
        vacation_days_per_year: row.vacation_days_per_year,
        bank_account: row.bank_account,
        created_by: user.id,
        is_active: true
      }));

      const { error } = await supabase
        .from('employees')
        .insert(employeesToInsert);

      if (error) throw error;

      toast({ title: "Import genomförd!",
        description: `${validRows.length} anställda har importerats`,
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
        Importera från CSV
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importera anställda från CSV</DialogTitle>
            <DialogDescription>
              Ladda upp en CSV-fil med anställduppgifter. Stöder migrering från Fortnox, Visma, och andra system.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex gap-4">
              <Button onClick={downloadTemplate} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Ladda ner mall
              </Button>
              
              <div className="flex-1">
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-accent">
                    <FileSpreadsheet className="w-4 h-4" />
                    Välj CSV-fil
                  </div>
                  <input
                    id="file-upload"
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
                    Gröna rader är giltiga, röda rader har fel som behöver åtgärdas.
                  </AlertDescription>
                </Alert>

                <div className="border rounded-lg overflow-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Status</TableHead>
                        <TableHead>Personnummer</TableHead>
                        <TableHead>Namn</TableHead>
                        <TableHead>E-post</TableHead>
                        <TableHead>Anställningstyp</TableHead>
                        <TableHead>Lön</TableHead>
                        <TableHead>Problem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((row, index) => (
                        <TableRow key={index} className={row.valid ? 'bg-[#E1F5EE]' : 'bg-[#FCE8E8]'}>
                          <TableCell>
                            {row.valid ? (
                              <Check className="w-4 h-4 text-[#085041]" />
                            ) : (
                              <X className="w-4 h-4 text-[#7A1A1A]" />
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {row.personal_number}
                          </TableCell>
                          <TableCell>
                            {row.first_name} {row.last_name}
                          </TableCell>
                          <TableCell>{row.email || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{row.employment_type}</Badge>
                          </TableCell>
                          <TableCell>
                            {row.monthly_salary 
                              ? `${row.monthly_salary.toLocaleString('sv-SE')} kr/mån`
                              : row.hourly_rate
                              ? `${row.hourly_rate.toLocaleString('sv-SE')} kr/tim`
                              : '-'}
                          </TableCell>
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
                      {importing ? "Importerar..." : `Importera ${previewData.filter(r => r.valid).length} anställda`}
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