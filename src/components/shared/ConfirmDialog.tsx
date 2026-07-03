/**
 * Reusable confirmation dialog for destructive or irreversible actions.
 */
import { AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface ConfirmDialogProps { open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "warning";
  onConfirm: () => Promise<void> | void;
}

export function ConfirmDialog({ open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Bekräfta",
  cancelLabel = "Avbryt",
  variant = "destructive",
  onConfirm,
}: ConfirmDialogProps) { const [loading, setLoading] = useState(false);

  const handleConfirm = async () => { setLoading(true);
    try { await onConfirm();
      onOpenChange(false);
    } finally { setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={variant === "destructive" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
