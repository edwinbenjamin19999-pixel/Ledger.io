import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Loader2, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { readFileAsCSV } from "@/lib/csv-utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

interface ColumnMapping { sourceColumn: string;
  targetField: string;
  confidence: number;
  transformation?: string;
  example?: string;
}

interface MappingResult { mappings: ColumnMapping[];
  unmappedColumns: string[];
  missingRequired: string[];
  warnings: string[];
  suggestions?: string[];
}

interface SmartFileUploadProps { dataType: 'accounts' | 'customers' | 'suppliers' | 'employees';
  companyId: string;
  onImportComplete: () => void;
}

export const SmartFileUpload = ({ dataType, companyId, onImportComplete }: SmartFileUploadProps) => { const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileData, setFileData] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<MappingResult | null>(null);
  const [selectedMappings, setSelectedMappings] = useState<Set<number>>(new Set());

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => { const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setMapping(null);
    setSelectedMappings(new Set());

    try { const jsonData = await readFileAsCSV(selectedFile);
      setFileData(jsonData);
      toast.success(`Fil inläst: ${jsonData.length} rader`);
    } catch (error) { toast.error("Kunde inte läsa filen. Kontrollera att det är en giltig CSV/TSV-fil.");
      console.error(error);
    }
  };

  const handleAnalyze = async () => { if (fileData.length === 0) { toast.error("Ingen data att analysera");
      return;
    }

    setAnalyzing(true);
    try { const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-import-file`,
        { method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileData: fileData.slice(0, 100),
            dataType,
            companyId
          })
        }
      );

      if (!response.ok) { const error = await response.json();
        throw new Error(error.error || 'Analysis failed');
      }

      const result = await response.json();
      setMapping(result.mapping);
      
      const highConfidence = new Set<number>(
        result.mapping.mappings
          .map((m: ColumnMapping, idx: number) => m.confidence >= 0.8 ? idx : -1)
          .filter((idx: number) => idx >= 0)
      );
      setSelectedMappings(highConfidence);
      
      toast.success("AI-analys klar!");
    } catch (error: any) { toast.error(error.message || "Kunde inte analysera fil");
      console.error(error);
    } finally { setAnalyzing(false);
    }
  };

  const toggleMapping = (index: number) => { const newSelected = new Set(selectedMappings);
    if (newSelected.has(index)) { newSelected.delete(index);
    } else { newSelected.add(index);
    }
    setSelectedMappings(newSelected);
  };

  const handleImport = async () => { if (!mapping || selectedMappings.size === 0) { toast.error("Välj minst en mappning att importera");
      return;
    }

    setImporting(true);
    try { const selectedMappingList = mapping.mappings.filter((_, idx) => selectedMappings.has(idx));
      
      const transformedData = fileData.map(row => { const transformed: any = {};
        selectedMappingList.forEach(m => { let value: any = row[m.sourceColumn];
          
          if (m.transformation && value) { const strValue = value.toString().trim();
            
            switch (m.transformation) { case 'uppercase':
                value = strValue.toUpperCase();
                break;
              case 'lowercase':
                value = strValue.toLowerCase();
                break;
              case 'trim':
                value = strValue;
                break;
              case 'parse_number':
                value = parseFloat(strValue.replace(/[\s,]/g, '').replace(',', '.'));
                break;
              case 'parse_date':
                try { const dateStr = strValue.replace(/\./g, '-').replace(/\//g, '-');
                  const parts = dateStr.split('-');
                  
                  if (parts.length === 3) { if (parts[0].length === 4) { value = dateStr;
                    } else { value = `${parts[2]}-${parts[1]}-${parts[0]}`;
                    }
                  } else { value = strValue;
                  }
                } catch { value = strValue;
                }
                break;
              case 'split_name':
                const nameParts = strValue.split(' ');
                if (m.targetField === 'first_name') { value = nameParts[0];
                } else if (m.targetField === 'last_name') { value = nameParts.slice(1).join(' ');
                }
                break;
              default:
                value = strValue;
            }
          }
          
          transformed[m.targetField] = value;
        });
        
        transformed.company_id = companyId;
        
        return transformed;
      });

      let tableName: string;
      if (dataType === 'accounts') { tableName = 'chart_of_accounts';
      } else { tableName = dataType;
      }
      
      const batchSize = 100;
      let successCount = 0;
      
      for (let i = 0; i < transformedData.length; i += batchSize) { const batch = transformedData.slice(i, i + batchSize);
        const { error } = await (supabase as any)
          .from(tableName)
          .insert(batch);

        if (error) { toast.error(`Fel vid import av rad ${i + 1}-${i + batch.length}: ${error.message}`);
          throw error;
        }
        successCount += batch.length;
      }

      toast.success(`${successCount} rader importerade!`);
      onImportComplete();
      
      setFile(null);
      setFileData([]);
      setMapping(null);
      setSelectedMappings(new Set());
    } catch (error: any) { toast.error(error.message || "Import misslyckades");
      console.error(error);
    } finally { setImporting(false);
    }
  };

  const getConfidenceBadge = (confidence: number) => { if (confidence >= 0.8) return <Badge className="bg-green-600">Hög säkerhet</Badge>;
    if (confidence >= 0.6) return <Badge variant="outline" className="border-yellow-600 text-[#7A5417]">Medel säkerhet</Badge>;
    return <Badge variant="destructive">Låg säkerhet</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>AI-driven filimport</CardTitle>
        </div>
        <CardDescription>
          Ladda upp en CSV/TSV-fil — AI:n känner automatiskt igen kolumner
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="file">Välj CSV/TSV-fil</Label>
          <div className="flex gap-2">
            <Input
              id="file"
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleFileSelect}
              disabled={analyzing || importing}
            />
            {file && (
              <Button
                onClick={handleAnalyze}
                disabled={analyzing || fileData.length === 0}
              >
                {analyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyserar...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Analysera med AI
                  </>
                )}
              </Button>
            )}
          </div>
          {file && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              {file.name} ({fileData.length} rader)
            </p>
          )}
        </div>

        {mapping && (
          <div className="space-y-4">
            <Separator />
            
            <div>
              <h3 className="font-semibold mb-3">AI-föreslagna mappningar</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Välj vilka kolumner som ska importeras. Högkonfidenta mappningar är förbockade.
              </p>
              
              <div className="space-y-3">
                {mapping.mappings.map((m, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedMappings.has(idx)}
                      onCheckedChange={() => toggleMapping(idx)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                            {m.sourceColumn}
                          </code>
                          <span className="text-muted-foreground">→</span>
                          <code className="text-sm font-mono bg-primary/10 px-2 py-1 rounded">
                            {m.targetField}
                          </code>
                        </div>
                        {getConfidenceBadge(m.confidence)}
                      </div>
                      {m.transformation && (
                        <p className="text-xs text-muted-foreground">
                          Transformation: {m.transformation}
                        </p>
                      )}
                      {m.example && (
                        <p className="text-xs text-muted-foreground">
                          Exempel: {m.example}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {mapping.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Varningar:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {mapping.warnings.map((w, idx) => (
                      <li key={idx} className="text-sm">{w}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {mapping.missingRequired.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Obligatoriska fält saknas:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {mapping.missingRequired.map((f, idx) => (
                      <li key={idx} className="text-sm">{f}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {mapping.unmappedColumns.length > 0 && (
              <Alert>
                <AlertDescription>
                  <strong>Ej mappade kolumner:</strong> {mapping.unmappedColumns.join(', ')}
                </AlertDescription>
              </Alert>
            )}

            {mapping.suggestions && mapping.suggestions.length > 0 && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <strong>Förslag:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {mapping.suggestions.map((s, idx) => (
                      <li key={idx} className="text-sm">{s}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleImport}
              disabled={importing || selectedMappings.size === 0 || mapping.missingRequired.length > 0}
              className="w-full"
            >
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importerar...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Importera {selectedMappings.size} av {mapping.mappings.length} mappningar
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};