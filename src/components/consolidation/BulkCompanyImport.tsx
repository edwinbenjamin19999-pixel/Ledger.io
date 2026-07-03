import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BulkCompanyImportProps { groupId: string;
  groupName: string;
  onComplete: () => void;
}

export const BulkCompanyImport = ({ groupId, groupName, onComplete }: BulkCompanyImportProps) => { const [isOpen, setIsOpen] = useState(false);
  const [companiesList, setCompaniesList] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImport = async () => { const lines = companiesList.split("\n").filter(line => line.trim());
    
    if (lines.length === 0) { toast.error("Inga företag att importera");
      return;
    }

    setIsProcessing(true);
    let successCount = 0;
    let errorCount = 0;

    try { // Get all existing companies to check org numbers
      const { data: existingCompanies } = await supabase
        .from("companies")
        .select("org_number")
        .is("group_id", null);

      const existingOrgNumbers = new Set(existingCompanies?.map(c => c.org_number) || []);

      for (const line of lines) { // Parse line: Format should be "org_number,name" or just "name"
        const parts = line.split(",").map(p => p.trim());
        let orgNumber = "";
        let name = "";

        if (parts.length >= 2) { orgNumber = parts[0];
          name = parts.slice(1).join(", ");
        } else { name = parts[0];
          // Generate dummy org number if not provided
          orgNumber = `TEMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }

        // Check if company with this org number already exists
        const matchingCompany = existingOrgNumbers.has(orgNumber);

        if (matchingCompany) { // Update existing company to link it to the group
          const { error } = await supabase
            .from("companies")
            .update({ group_id: groupId })
            .eq("org_number", orgNumber)
            .is("group_id", null);

          if (error) { console.error(`Failed to link ${name}:`, error);
            errorCount++;
          } else { successCount++;
          }
        } else { // Skip if no org number and no matching company
          if (orgNumber.startsWith("TEMP-")) { console.warn(`Skipping ${name} - no org number provided and no existing match`);
            errorCount++;
            continue;
          }
        }
      }

      if (successCount > 0) { toast.success(`${successCount} företag kopplade till koncern!`);
        onComplete();
        setIsOpen(false);
        setCompaniesList("");
      }

      if (errorCount > 0) { toast.error(`${errorCount} företag kunde inte kopplas. Kolla att org.nummer är korrekta och att företagen redan finns i systemet.`);
      }

    } catch (error: any) { console.error("Bulk import error:", error);
      toast.error("Ett fel uppstod vid import");
    } finally { setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Bulk-import bolag
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Bulk-import företag till {groupName}</DialogTitle>
          <DialogDescription>
            Importera flera företag samtidigt genom att ange organisationsnummer och namn
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="companies">Lista över företag</Label>
            <Textarea
              id="companies"
              value={companiesList}
              onChange={(e) => setCompaniesList(e.target.value)}
              placeholder="Ett företag per rad&#10;Format: organisationsnummer,företagsnamn&#10;&#10;Exempel:&#10;556123-4567,Företag AB&#10;556987-6543,Dotterbolag AB&#10;559876-5432,Tredje Bolaget AB"
              className="font-mono text-sm"
              rows={10}
            />
            <p className="text-xs text-muted-foreground">
              Ett företag per rad. Format: organisationsnummer,företagsnamn
            </p>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <div className="flex gap-2 text-sm">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Tips:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Företagen måste redan finnas i systemet</li>
                  <li>• Ange org.nummer för att matcha mot befintliga företag</li>
                  <li>• Om företaget redan finns men ej kopplat kommer det att länkas till denna koncern</li>
                  <li>• Du kan klistra in från Excel/CSV</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Avbryt
            </Button>
            <Button
              onClick={handleImport}
              disabled={isProcessing || !companiesList.trim()}
            >
              {isProcessing ? "Importerar..." : "Importera företag"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
