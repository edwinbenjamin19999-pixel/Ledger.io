export type BankConnectionEventLike = {
  event_type: string;
  created_at?: string;
  metadata?: Record<string, unknown> | null;
};

export type BankConnectionIssue = {
  title: string;
  message: string;
  severity: "warning" | "error";
};

export function deriveBankConnectionIssue(
  events: BankConnectionEventLike[],
): BankConnectionIssue | null {
  if (!events.length) return null;

  const latestSessionFailure = events.find((event) => {
    if (event.event_type !== "session_created") return false;
    const metadata = event.metadata ?? {};
    const accountsPersisted = Number(metadata.accounts_persisted ?? 0);
    const accountsReturned = Number(metadata.accounts_returned ?? 0);
    return accountsPersisted === 0 && accountsReturned > 0;
  });

  if (latestSessionFailure) {
    const metadata = latestSessionFailure.metadata ?? {};
    const accountsReturned = Number(metadata.accounts_returned ?? 0);
    const sandboxRejectedCount = events.filter(
      (event) => event.event_type === "sandbox_account_rejected",
    ).length;

    if (sandboxRejectedCount >= accountsReturned && accountsReturned > 0) {
      return {
        severity: "warning",
        title: "Bankkopplingen gav bara testkonton",
        message:
          "Anslutningen gick igenom, men banken returnerade bara testkonton och därför sparades inga riktiga konton i systemet.",
      };
    }

    return {
      severity: "error",
      title: "Bankkopplingen gav inga användbara konton",
      message:
        "Anslutningen gick igenom, men inga konton kunde sparas. Öppna bankkopplingen igen och välj ett riktigt företagskonto.",
    };
  }

  const latestPersistFailure = events.find(
    (event) => event.event_type === "account_persist_failed",
  );

  if (latestPersistFailure) {
    return {
      severity: "error",
      title: "Kontona kunde inte sparas",
      message:
        "Banken svarade, men kontoinformationen kunde inte sparas i databasen. Försök igen om en stund.",
    };
  }

  const latestBalanceFailure = events.find(
    (event) => event.event_type === "balance_fetch_failed",
  );

  if (latestBalanceFailure) {
    return {
      severity: "warning",
      title: "Kontot är kopplat men saldo saknas",
      message:
        "Kontot finns, men banken returnerade inget tillgängligt saldo ännu. Testa att synka igen om en stund.",
    };
  }

  return null;
}
