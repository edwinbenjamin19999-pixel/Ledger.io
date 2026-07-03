import { useUnbilledSummary, formatKr } from "@/hooks/useTimeTracking";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { BillReviewDialog } from "./BillReviewDialog";

export function UnbilledBanner() { const { unbilled } = useUnbilledSummary();
  const [reviewClient, setReviewClient] = useState<string | null>(null);

  if (unbilled.length === 0) return null;

  // Show the largest unbilled client
  const top = unbilled.sort((a, b) => b.value - a.value)[0];

  return (
    <>
      <div className="rounded-lg border border-[#3b82f6]/30 bg-[#3b82f6]/5 p-4 flex items-center justify-between gap-4">
        <p className="text-sm">
          Du har{" "}
          <span className="font-bold">{top.hours.toFixed(1).replace(".", ",")} ofakturerade timmar</span>{" "}
          till <span className="font-semibold">{top.client}</span> — värde{" "}
          <span className="font-bold">{formatKr(top.value)}</span>.
          {unbilled.length > 1 && (
            <span className="text-muted-foreground"> (+{unbilled.length - 1} kunder till)</span>
          )}
        </p>
        <Button
          size="sm"
          className="bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white flex-shrink-0 gap-1"
          onClick={() => setReviewClient(top.client)}
        >
          Fakturera nu
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <BillReviewDialog
        open={!!reviewClient}
        onOpenChange={(open) => !open && setReviewClient(null)}
        clientName={reviewClient || ""}
      />
    </>
  );
}
