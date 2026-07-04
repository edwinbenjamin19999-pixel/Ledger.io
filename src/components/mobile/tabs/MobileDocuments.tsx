import { useRef } from "react";
import { Camera, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getStoredActiveCompanyId } from "@/lib/company-selection";
import { EmailInboxAddressCard } from "@/components/documents/EmailInboxAddressCard";
import { EmailInboxLog } from "@/components/documents/EmailInboxLog";

export const MobileDocuments = () => {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const companyId = getStoredActiveCompanyId();

  const handleFiles = async (files: File[]) => {
    if (!companyId || files.length === 0) return;
    toast.info(files.length === 1 ? "Laddar upp underlag..." : `Laddar upp ${files.length} filer...`);
    let ok = 0; let fail = 0;
    await Promise.all(files.map(async (file) => {
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${companyId}/${crypto.randomUUID()}-${safeName}`;
      const { error } = await supabase.storage.from("documents").upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (error) fail++; else ok++;
    }));
    if (ok > 0) toast.success(`${ok} underlag uppladdat${ok > 1 ? "a" : ""} — AI analyserar`);
    if (fail > 0) toast.error(`${fail} fil${fail > 1 ? "er" : ""} misslyckades`);
  };

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) handleFiles(files);
    e.target.value = "";
  };

  return (
    <div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={onInput} />
      <input ref={fileRef} type="file" multiple className="hidden" onChange={onInput} />

      <div className="px-5 pt-5">
        <h2 className="text-foreground font-bold text-xl tracking-tight">AI Dokumentanalys</h2>
        <p className="text-muted-foreground text-sm mt-1">Ladda upp underlag — AI bokför automatiskt</p>
      </div>

      <div className="mx-5 mt-5 space-y-3">
        {/* Camera */}
        <button
          onClick={() => cameraRef.current?.click()}
          className="w-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 flex items-center gap-4 active:scale-[0.97] transition-all duration-200 min-h-[44px] shadow-lg shadow-slate-900/10"
        >
          <div className="rounded-xl bg-gradient-to-br from-[#3b82f6] to-blue-500 p-3 shadow-lg shadow-[#3b82f6]/20"><Camera className="h-6 w-6 text-white" /></div>
          <div className="text-left">
            <p className="text-white font-bold text-base">Fota dokument</p>
            <p className="text-slate-400 text-sm">Snabbast — direkt från mobilen</p>
          </div>
        </button>

        {/* File */}
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full bg-card border border-border rounded-2xl p-5 flex items-center gap-4 active:scale-[0.97] transition-all duration-200 min-h-[44px] shadow-sm"
        >
          <div className="rounded-xl bg-violet-500/10 p-3"><Upload className="h-6 w-6 text-violet-600" /></div>
          <div className="text-left">
            <p className="text-foreground font-semibold">Välj från telefonen</p>
            <p className="text-muted-foreground text-sm">Flera filer · alla format</p>
          </div>
        </button>

        {/* Email inbox card */}
        <EmailInboxAddressCard companyId={companyId} variant="mobile" />

        {/* Recent inbox log */}
        <div className="pt-2">
          <h3 className="text-foreground font-semibold text-sm mb-2 px-1">Senaste mejl</h3>
          <EmailInboxLog companyId={companyId} />
        </div>
      </div>
    </div>
  );
};

