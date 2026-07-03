import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";

interface Props { budgetId: string;
  budgetName: string;
  onDeleted: () => void;
}

export const BudgetDeleteDialog = ({ budgetId, budgetName, onDeleted }: Props) => { const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  const handleDelete = async () => { setDeleting(true);
    try { // Delete rows first
      await supabase.from("budget_rows").delete().eq("budget_id", budgetId);
      // Delete scenarios
      await supabase.from("budget_scenarios").delete().eq("budget_id", budgetId);
      // Delete AI sessions
      await supabase.from("budget_ai_sessions").delete().eq("budget_id", budgetId);
      // Delete forecasts
      await supabase.from("budget_forecasts").delete().eq("budget_id", budgetId);
      // Delete budget plan
      const { error } = await supabase.from("budget_plans").delete().eq("id", budgetId);
      if (error) throw error;

      toast.success(`Budget "${budgetName}" har raderats`);
      setOpen(false);
      onDeleted();
    } catch (e: any) { toast.error(e.message || "Kunde inte radera budgeten");
    } finally { setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-[#7A1A1A] hover:text-[#7A1A1A] hover:bg-[#FCE8E8] gap-1.5">
          <Trash2 className="w-3.5 h-3.5" />
          Radera
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Radera budget?</AlertDialogTitle>
          <AlertDialogDescription>
            Du ar pa vag att radera <strong>"{budgetName}"</strong>. Alla budgetrader, scenarios och prognoser kopplade till denna budget kommer att tas bort permanent. Denna atgard kan inte angras.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Avbryt</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Radera permanent
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
