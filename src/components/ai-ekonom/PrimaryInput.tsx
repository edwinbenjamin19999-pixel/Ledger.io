import { useRef, useState, KeyboardEvent } from "react";
import { Paperclip, Camera, ArrowUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onSend: (text: string) => void;
  onFiles: (files: File[]) => void;
  loading?: boolean;
  placeholder?: string;
}

export const PrimaryInput = ({ onSend, onFiles, loading, placeholder }: Props) => {
  const [value, setValue] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setValue("");
    if (taRef.current) taRef.current.style.height = "auto";
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  };

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData?.items || []);
    const files = items
      .filter(i => i.kind === "file")
      .map(i => i.getAsFile())
      .filter((f): f is File => !!f);
    if (files.length > 0) {
      e.preventDefault();
      onFiles(files);
    }
  };

  return (
    <div className="px-4 pb-4 pt-2 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
      <div className={cn(
        "max-w-3xl mx-auto rounded-2xl border bg-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] transition-all",
        loading ? "border-[hsl(var(--brand-primary)/0.4)]" : "border-slate-200 hover:border-slate-300"
      )}>
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); autoGrow(e.target); }}
          onKeyDown={onKey}
          onPaste={onPaste}
          rows={1}
          placeholder={placeholder ?? "Skriv vad som hänt eller fråga något om ditt företag…"}
          className="w-full resize-none bg-transparent px-5 pt-4 pb-2 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="p-2 rounded-lg text-slate-500 hover:text-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary)/0.06)] transition-colors"
              title="Ladda upp underlag"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => cameraInput.current?.click()}
              className="p-2 rounded-lg text-slate-500 hover:text-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary)/0.06)] transition-colors md:hidden"
              title="Fota kvitto"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={loading || !value.trim()}
            style={
              value.trim() && !loading
                ? { background: "hsl(var(--brand-primary))", color: "var(--brand-on-primary)" }
                : undefined
            }
            className={cn(
              "inline-flex items-center justify-center w-9 h-9 rounded-xl transition-all",
              value.trim() && !loading ? "shadow-sm hover:opacity-90" : "bg-slate-100 text-slate-300"
            )}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept="image/*,application/pdf,.csv,.xml"
          className="hidden"
          onChange={(e) => { const f = Array.from(e.target.files || []); if (f.length) onFiles(f); e.target.value = ""; }}
        />
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => { const f = Array.from(e.target.files || []); if (f.length) onFiles(f); e.target.value = ""; }}
        />
      </div>
      <p className="text-center text-[10px] text-slate-400 mt-2">
        AI Ekonom kan göra misstag — verifiera viktiga belopp innan godkännande.
      </p>
    </div>
  );
};
