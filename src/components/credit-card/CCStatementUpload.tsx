import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CCStatementUploadProps {
  companyId: string;
  onParseComplete: (result: any) => void;
}

export function CCStatementUpload({ companyId, onParseComplete }: CCStatementUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const processFile = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("analyze-cc-statement", {
        body: {
          file_base64: base64,
          file_type: file.type || "application/octet-stream",
          company_id: companyId,
        },
      });

      if (error) throw error;

      if (!data?.is_credit_card_statement) {
        toast({
          title: "Inte ett kreditkortsutdrag",
          description: "Filen verkar inte vara ett kreditkortsutdrag. Försök med en annan fil.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Utdrag analyserat",
        description: `${data.transactions?.length || 0} transaktioner hittades.`,
      });

      onParseComplete({ ...data, file_name: file.name });
    } catch (err: any) {
      console.error("Upload error:", err);
      toast({
        title: "Fel vid analys",
        description: err.message || "Kunde inte analysera utdraget",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [companyId, onParseComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  return (
    <Card
      className={`border-2 border-dashed transition-colors cursor-pointer ${
        dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
      <CardContent className="p-8">
        <label className="flex flex-col items-center gap-3 cursor-pointer">
          {isUploading ? (
            <>
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Analyserar utdrag med AI...</p>
            </>
          ) : (
            <>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                {dragActive ? <FileText className="h-6 w-6 text-primary" /> : <Upload className="h-6 w-6 text-primary" />}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Ladda upp kreditkortsutdrag</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, CSV eller bild • Dra och släpp eller klicka</p>
              </div>
            </>
          )}
          <input type="file" className="hidden" accept=".pdf,.csv,.png,.jpg,.jpeg,.webp" onChange={handleFileSelect} disabled={isUploading} />
        </label>
      </CardContent>
    </Card>
  );
}
