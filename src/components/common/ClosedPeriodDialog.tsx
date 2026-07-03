import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmAdjustment?: () => void;
}

/**
 * Shown when a user attempts to post to a locked period.
 */
export const ClosedPeriodDialog = ({ open, onOpenChange, onConfirmAdjustment }: Props) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Perioden är stängd</AlertDialogTitle>
          <AlertDialogDescription>
            Vill du skapa en justeringsverifikation istället? Den bokförs i nästa öppna
            period och bevarar revisionsspåret.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmAdjustment}>
            Skapa justeringsverifikation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
