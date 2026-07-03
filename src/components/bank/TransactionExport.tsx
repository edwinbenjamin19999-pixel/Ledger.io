import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

interface Transaction { id: string;
  booking_date: string;
  amount: number;
  currency: string;
  counterparty_name: string | null;
  reference: string | null;
  description: string | null;
  status: string;
  chart_of_accounts: { account_number: string;
    account_name: string;
  } | null;
}

interface TransactionExportProps { transactions: Transaction[];
  accountName: string;
}

export function TransactionExport({ transactions, accountName }: TransactionExportProps) { const exportToCSV = () => { const headers = [
      "Datum",
      "Belopp",
      "Valuta",
      "Motpart",
      "Beskrivning",
      "Referens",
      "Konto",
      "Status",
    ];

    const rows = transactions.map((t) => [
      format(new Date(t.booking_date), "yyyy-MM-dd"),
      t.amount.toString(),
      t.currency,
      t.counterparty_name || "",
      t.description || "",
      t.reference || "",
      t.chart_of_accounts
        ? `${t.chart_of_accounts.account_number} - ${t.chart_of_accounts.account_name}`
        : "",
      t.status,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${accountName}_transaktioner_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const exportToExcel = () => { // Use CSV with .xls extension as a safe alternative to the vulnerable xlsx package
    const headers = [
      "Datum",
      "Belopp",
      "Valuta",
      "Motpart",
      "Beskrivning",
      "Referens",
      "Konto",
      "Status",
    ];

    const rows = transactions.map((t) => [
      format(new Date(t.booking_date), "yyyy-MM-dd"),
      t.amount.toString(),
      t.currency,
      t.counterparty_name || "",
      t.description || "",
      t.reference || "",
      t.chart_of_accounts
        ? `${t.chart_of_accounts.account_number} - ${t.chart_of_accounts.account_name}`
        : "",
      t.status,
    ]);

    // Tab-separated values open natively in Excel
    const tsvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join("\t"))
      .join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + tsvContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${accountName}_transaktioner_${format(new Date(), "yyyy-MM-dd")}.xls`;
    link.click();
  };

  const exportToPDF = () => { // Create a printable HTML version
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Transaktioner - ${accountName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; font-size: 24px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .amount-positive { color: green; }
          .amount-negative { color: red; }
          @media print { body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <h1>Transaktioner - ${accountName}</h1>
        <p>Exporterat: ${format(new Date(), "PPP", { locale: sv })}</p>
        <table>
          <thead>
            <tr>
              <th>Datum</th>
              <th>Motpart</th>
              <th>Beskrivning</th>
              <th>Konto</th>
              <th>Belopp</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${transactions
              .map(
                (t) => `
              <tr>
                <td>${format(new Date(t.booking_date), "PPP", { locale: sv })}</td>
                <td>${t.counterparty_name || "—"}</td>
                <td>${t.description || t.reference || "—"}</td>
                <td>${ t.chart_of_accounts
                    ? `${t.chart_of_accounts.account_number} - ${t.chart_of_accounts.account_name}`
                    : "—"
                }</td>
                <td class="${t.amount > 0 ? "amount-positive" : "amount-negative"}">
                  ${t.amount > 0 ? "+" : ""}${t.amount.toLocaleString("sv-SE")} ${t.currency}
                </td>
                <td>${t.status}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => { printWindow.print();
    }, 250);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Exportera
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV} className="gap-2">
          <FileText className="h-4 w-4" />
          Exportera som CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel} className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Exportera som Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF} className="gap-2">
          <FileText className="h-4 w-4" />
          Skriv ut / PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
