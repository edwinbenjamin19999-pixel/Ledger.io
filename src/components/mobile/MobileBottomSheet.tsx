import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface MobileBottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export const MobileBottomSheet = ({ open, onClose, children, className }: MobileBottomSheetProps) => {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={sheetRef}
        className={cn(
          "relative w-full bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300",
          className
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex justify-center pt-3 pb-4">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>
        {children}
      </div>
    </div>
  );
};
