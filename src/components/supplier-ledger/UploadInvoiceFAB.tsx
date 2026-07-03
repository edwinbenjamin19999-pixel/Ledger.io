import { useState } from "react";
import { Plus, Upload, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";

export function UploadInvoiceFAB() {
  const [open, setOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-[#0F1F3D] text-white shadow-[0_8px_24px_rgba(37,99,235,0.4)] hover:shadow-[0_12px_32px_rgba(37,99,235,0.5)] hover:scale-105 transition-all flex items-center justify-center group"
        aria-label="Lägg till leverantörsfaktura"
      >
        <Plus className="h-6 w-6" />
        <span className="absolute right-full mr-3 whitespace-nowrap text-xs font-medium text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Lägg till leverantörsfaktura
        </span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Lägg till leverantörsfaktura</SheetTitle>
          </SheetHeader>
          <div
            className={`mt-6 rounded-2xl border-2 border-dashed transition-all duration-200 p-10 text-center cursor-pointer
              ${dragOver ? "border-[#3b82f6]/70 bg-[#EFF6FF]" : "border-slate-200 bg-slate-50/40 hover:border-[#3b82f6]/50 hover:bg-blue-50/40"}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              toast.info("OCR-tolkning av leverantörsfakturor kommer snart");
              setOpen(false);
            }}
          >
            <Upload className="h-10 w-10 mx-auto mb-3 text-[#3b82f6]" />
            <p className="text-sm font-medium text-slate-800">Dra och släpp faktura</p>
            <p className="text-xs text-slate-500 mt-1">PDF, bild eller skannad faktura</p>
            <p className="text-[11px] text-slate-400 mt-4">AI tolkar leverantör, belopp och förfallodag automatiskt</p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
