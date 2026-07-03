import { Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Props {
  onExport: (kind: "pdf" | "excel" | "csv") => void;
  disabled?: boolean;
}

export function CashflowExportActions({ onExport, disabled }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2" disabled={disabled}>
          <Download className="h-4 w-4" />
          Exportera
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => onExport("pdf")}>PDF-rapport</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport("excel")}>Excel (.xlsx)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport("csv")}>CSV</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
