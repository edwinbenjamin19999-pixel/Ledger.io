import { useCallback, useRef, useState } from "react";
import { Upload, ImageIcon, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  logoUrl: string | null;
  onFile: (file: File, previewUrl: string) => void;
  onClear: () => void;
}

export function LogoDropzone({ logoUrl, onFile, onClear }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Logotypen är för stor", {
          description: "Max 2 MB. Använd PNG eller SVG för bästa kvalitet.",
        });
        return;
      }
      const url = URL.createObjectURL(file);
      onFile(file, url);
    },
    [onFile],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-slate-700">Logotyp</label>
      {logoUrl ? (
        <div className="relative group rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
            <img src={logoUrl} alt="Logo preview" className="max-h-12 max-w-12 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900">Logotyp uppladdad</div>
            <div className="text-xs text-slate-500">Klicka "Byt" för att ladda upp en annan</div>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-xs text-[#3b82f6] hover:text-[#3b82f6] font-medium px-2 py-1"
            >
              Byt
            </button>
            <button
              type="button"
              onClick={onClear}
              className="text-slate-400 hover:text-[#7A1A1A] p-1"
              aria-label="Ta bort"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
            isDragging
              ? "border-[#3b82f6] bg-cyan-50/40"
              : "border-slate-200 hover:border-[#3b82f6]/40 hover:bg-slate-50/50"
          }`}
        >
          <div className="mx-auto h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center mb-2">
            <Upload className="h-5 w-5 text-slate-500" />
          </div>
          <div className="text-sm font-medium text-slate-900">Dra & släpp logotyp</div>
          <div className="text-xs text-slate-500 mt-1">
            eller klicka — PNG, SVG, JPG (max 2 MB)
          </div>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
