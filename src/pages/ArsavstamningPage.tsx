import { useState } from "react";
import { CheckCircle2, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { WizardProgress } from "@/components/arsavstamning/WizardProgress";
import { Phase1Upload } from "@/components/arsavstamning/Phase1Upload";
import { Phase2BankMatch } from "@/components/arsavstamning/Phase2BankMatch";
import { Phase3Deductions } from "@/components/arsavstamning/Phase3Deductions";
import { Phase4Summary } from "@/components/arsavstamning/Phase4Summary";
import { Phase5Export } from "@/components/arsavstamning/Phase5Export";

export type ProcessedReceipt = { id: string;
  fileName: string;
  date: string;
  amount: number;
  supplier: string;
  category: string;
  confidence: number;
  status: "ok" | "review" | "error";
};

export type BankTransaction = { id: string;
  date: string;
  description: string;
  amount: number;
  matchedReceiptId: string | null;
  status: "matched" | "unmatched" | "private" | "income";
};

export type Deduction = { id: string;
  category: string;
  description: string;
  amount: number;
  taxImpact: number;
  accepted: boolean;
};

const PHASES = [
  "Ladda upp kvitton",
  "Koppla bank",
  "Avdrag",
  "Sammanfattning",
  "Exportera",
];

const closingYear = new Date().getFullYear() - 1;

export default function ArsavstamningPage() { const [phase, setPhase] = useState(0);
  const [receipts, setReceipts] = useState<ProcessedReceipt[]>([]);
  const [bankTx, setBankTx] = useState<BankTransaction[]>([]);
  const [deductions, setDeductions] = useState<Deduction[]>([]);

  return (
    <div>
      <PageHeader
        icon={ClipboardList}
        title={`Årsavstämning ${closingYear}`}
        subtitle="Stäng dina böcker steg för steg — ingen bokföringskunskap krävs"
      />
      <div className="px-8 space-y-6">
        <WizardProgress steps={PHASES} current={phase} />

        {phase === 0 && (
          <Phase1Upload year={closingYear} receipts={receipts} setReceipts={setReceipts} onNext={() => setPhase(1)} />
        )}
        {phase === 1 && (
          <Phase2BankMatch year={closingYear} receipts={receipts} bankTx={bankTx} setBankTx={setBankTx} onNext={() => setPhase(2)} onBack={() => setPhase(0)} />
        )}
        {phase === 2 && (
          <Phase3Deductions receipts={receipts} deductions={deductions} setDeductions={setDeductions} onNext={() => setPhase(3)} onBack={() => setPhase(1)} />
        )}
        {phase === 3 && (
          <Phase4Summary year={closingYear} receipts={receipts} deductions={deductions} onNext={() => setPhase(4)} onBack={() => setPhase(2)} />
        )}
        {phase === 4 && (
          <Phase5Export year={closingYear} onBack={() => setPhase(3)} />
        )}
      </div>
    </div>
  );
}
