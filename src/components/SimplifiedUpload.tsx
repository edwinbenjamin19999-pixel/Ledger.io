import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Mail, Camera, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SimplifiedUploadProps {
  companyId: string;
  onUploadComplete?: (files: File[]) => void;
}

/** Fallback MIME type from file extension when file.type is empty (common on mobile cameras) */
function resolveMimeType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    webp: 'image/webp', heic: 'image/heic', pdf: 'application/pdf',
  };
  return map[ext || ''] || 'application/octet-stream';
}

export const SimplifiedUpload = ({ companyId, onUploadComplete }: SimplifiedUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [emailAddress, setEmailAddress] = useState<string>("");

  useEffect(() => {
    loadCompanyEmail();
  }, [companyId]);

  const loadCompanyEmail = async () => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("email_inbox_address")
        .eq("id", companyId)
        .maybeSingle();

      if (error) throw error;
      if (data?.email_inbox_address) {
        setEmailAddress(data.email_inbox_address);
      } else {
        const uniqueId = companyId.slice(0, 8);
        const generatedEmail = `bokföring-${uniqueId}@bokfy.se`;
        await supabase
          .from("companies")
          .update({ email_inbox_address: generatedEmail })
          .eq("id", companyId);
        setEmailAddress(generatedEmail);
      }
    } catch (error: any) {
      console.error("Error loading email:", error);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  }, [companyId]);

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;

    const toastId = toast.loading(`Laddar upp ${files.length} fil(er)...`);

    try {
      let successCount = 0;

      for (const file of files) {
        const mimeType = resolveMimeType(file);
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${companyId}/${fileName}`;

        // 1. Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file, {
            contentType: mimeType,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // 2. Create document record (use storage path, not public URL)
        const { data: { user } } = await supabase.auth.getUser();
        const { data: document, error: docError } = await supabase
          .from('documents')
          .insert({
            company_id: companyId,
            document_type: 'receipt',
            file_url: filePath,
            file_name: file.name,
            file_size: file.size,
            mime_type: mimeType,
            processing_status: 'pending',
            uploaded_by: user?.id,
          })
          .select()
          .maybeSingle();

        if (docError) throw docError;
        if (!document) throw new Error('Failed to create document record');

        // 3. Trigger AI processing and handle result
        toast.loading(`Analyserar ${file.name}...`, { id: toastId });

        const { data: invokeData, error: invokeError } = await supabase.functions.invoke('ai-process-document', {
          body: {
            documentId: document.id,
            companyId: companyId,
            source: 'upload',
          },
        });

        if (invokeError) {
          console.error("AI processing invoke error:", invokeError);
          toast.error(`AI-analys misslyckades för ${file.name}: ${invokeError.message}`, { id: toastId });
          continue;
        }

        if (invokeData && !invokeData.success) {
          console.error("AI processing failed:", invokeData.error || invokeData.message);
          toast.error(`Kunde inte bokföra ${file.name}: ${invokeData.error || invokeData.message}`, { id: toastId });
          continue;
        }

        successCount++;

        // Show status-specific feedback
        const status = invokeData?.journalEntry?.status;
        if (status === 'approved') {
          console.log(`✅ Auto-bokförd: ${file.name}`);
        } else if (status === 'pending_approval') {
          console.log(`⏳ Väntar på godkännande: ${file.name}`);
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} fil(er) uppladdade och bokförda! ✓`, { id: toastId });
      }

      if (onUploadComplete) {
        onUploadComplete(files);
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(`Uppladdning misslyckades: ${error.message}`, { id: toastId });
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const copyEmailToClipboard = () => {
    navigator.clipboard.writeText(emailAddress);
    toast.success("Email-adress kopierad!");
  };

  return (
    <div className="space-y-4">
      {/* Mobile-First Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button
          variant="default"
          className="h-auto py-6 flex-col gap-3 text-base shadow-lg"
          size="lg"
          asChild
        >
          <label htmlFor="camera-upload">
            <Camera className="w-8 h-8" />
            <span className="font-semibold">Fota kvitto</span>
            <span className="text-xs opacity-80">Snabbast från mobilen</span>
            <input
              type="file"
              id="camera-upload"
              className="hidden"
              accept="image/*"
              capture="environment"
              onChange={handleFileInput}
            />
          </label>
        </Button>

        <Button
          variant="outline"
          className="h-auto py-6 flex-col gap-3 text-base border-2"
          size="lg"
          asChild
        >
          <label htmlFor="file-upload-quick">
            <Upload className="w-8 h-8" />
            <span className="font-semibold">Välj fil</span>
            <span className="text-xs opacity-70">PDF, JPG, PNG</span>
            <input
              type="file"
              id="file-upload-quick"
              className="hidden"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFileInput}
            />
          </label>
        </Button>
      </div>

      {/* Email Upload Info */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            <CardTitle className="text-base sm:text-lg">Maila dina kvitton</CardTitle>
          </div>
          <CardDescription className="text-sm">
            Fota och maila - vi bokför automatiskt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-card rounded-lg border">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground mb-1">Din bokförings-email:</div>
              <div className="font-mono text-sm sm:text-base font-semibold text-primary break-all">
                {emailAddress || "Genererar..."}
              </div>
            </div>
            <Button onClick={copyEmailToClipboard} variant="outline" size="sm" className="self-end sm:self-auto">
              Kopiera
            </Button>
          </div>
          <div className="p-3 bg-muted/50 rounded-md">
            <p className="text-xs sm:text-sm text-muted-foreground">
              💡 <strong>Spara i kontakter:</strong> Fota kvittot → Maila till denna adress → AI bokför direkt!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Desktop Drag & Drop Area */}
      <Card className="hidden sm:block">
        <CardHeader>
          <CardTitle className="text-lg">Dra och släpp</CardTitle>
          <CardDescription>För desktop: dra filer hit eller klicka</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center transition-all
              ${isDragging
                ? 'border-primary bg-primary/5 scale-105'
                : 'border-border hover:border-primary/50 hover:bg-accent/5'
              }
            `}
          >
            <input
              type="file"
              id="file-upload-desktop"
              className="hidden"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFileInput}
            />
            <label htmlFor="file-upload-desktop" className="cursor-pointer">
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 rounded-full bg-primary/10">
                  <Upload className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <div className="text-lg font-semibold mb-1">Släpp filer här</div>
                  <div className="text-sm text-muted-foreground">PDF, JPG, PNG • Max 20MB</div>
                </div>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
