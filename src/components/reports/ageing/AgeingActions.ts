import { toast } from "sonner";

const FOLLOWUP_KEY = (companyId: string) => `ageing_followup_queue_${companyId}`;

export const handleSendReminder = (
  counterpartyNames: string[],
  companyId: string,
  type: "AR" | "AP",
) => {
  if (counterpartyNames.length === 0) {
    toast.info("Inga mottagare valda");
    return;
  }
  const payload = {
    companyId,
    type,
    counterparties: counterpartyNames,
    sentAt: new Date().toISOString(),
  };
  // Future: hook into AR agent / Inkassogram pipeline
  console.log("[AgeingActions] sendReminder", payload);
  const word = type === "AR" ? "kunder" : "leverantörer";
  toast.success(
    `Påminnelse skickad till ${counterpartyNames.length} ${word}`,
    {
      description: counterpartyNames.slice(0, 3).join(", ") +
        (counterpartyNames.length > 3 ? "…" : ""),
    },
  );
};

export const handleMarkFollowup = (
  counterpartyNames: string[],
  companyId: string,
  type: "AR" | "AP",
) => {
  if (counterpartyNames.length === 0) {
    toast.info("Inga poster valda");
    return;
  }
  try {
    const key = FOLLOWUP_KEY(companyId);
    const existing: string[] = JSON.parse(localStorage.getItem(key) || "[]");
    const merged = Array.from(new Set([...existing, ...counterpartyNames]));
    localStorage.setItem(key, JSON.stringify(merged));
  } catch (e) {
    console.warn("[AgeingActions] followup persist failed", e);
  }
  const word = type === "AR" ? "kunder" : "leverantörer";
  toast.success(
    `${counterpartyNames.length} ${word} markerade för uppföljning`,
  );
};

export const sendInvoiceReminder = (
  invoiceNumber: string,
  counterpartyName: string,
  companyId: string,
  type: "AR" | "AP",
) => {
  console.log("[AgeingActions] sendInvoiceReminder", {
    invoiceNumber,
    counterpartyName,
    companyId,
    type,
  });
  toast.success(`Påminnelse skickad`, {
    description: `Faktura #${invoiceNumber} — ${counterpartyName}`,
  });
};
