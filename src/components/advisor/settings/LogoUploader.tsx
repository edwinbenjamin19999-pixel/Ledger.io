import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UploadCloud, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  firmId: string;
  value: string | null;
  onChange: (url: string | null) => void;
  prefix?: string; // e.g. "logo" or "portal"
  label?: string;
}

const ACCEPTED = ["image/svg+xml", "image/png", "image/jpeg"];
const MAX_BYTES = 2 * 1024 * 1024;

export function LogoUploader({ firmId, value, onChange, prefix = "logo", label = "Ladda upp logotyp" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files[0]) return;
    const file = files[0];
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Filtyp måste vara SVG, PNG eller JPG");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Max filstorlek är 2 MB");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${firmId}/${prefix}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("firm-branding")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("firm-branding").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Logotyp uppladdad");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Uppladdning misslyckades");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition ${
          dragOver ? "border-[#1D4ED8] bg-[#1D4ED8]/5" : "border-[#CBD5E1] hover:border-[#94A3B8] bg-[#F8FAFC]"
        }`}
      >
        {busy ? (
          <Loader2 className="h-6 w-6 mx-auto animate-spin text-[#64748B]" />
        ) : value ? (
          <div className="flex items-center justify-center gap-3">
            <img src={value} alt="" className="h-12 max-w-[140px] object-contain" />
            <span className="text-xs text-[#64748B]">Klicka för att byta</span>
          </div>
        ) : (
          <>
            <UploadCloud className="h-6 w-6 mx-auto text-[#94A3B8] mb-2" />
            <div className="text-sm font-medium text-[#0F172A]">{label}</div>
            <div className="text-[11px] text-[#94A3B8] mt-1">SVG, PNG, JPG · max 2 MB</div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".svg,.png,.jpg,.jpeg"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {value && !busy && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(null)}
          className="text-[#DC2626] hover:text-[#B91C1C] hover:bg-[#FEE2E2] h-7 text-xs"
        >
          <Trash2 className="h-3 w-3 mr-1" /> Ta bort logotyp
        </Button>
      )}
    </div>
  );
}
