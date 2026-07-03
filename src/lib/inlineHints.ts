// Pre-wired hint factories — typed helpers for every documented trigger.
// Each returns props ready to spread into <InlineHint {...} />.

import type { InlineHintProps } from "@/components/shared/InlineHint";
const formatSEK = (n: number) =>
  `${new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(n))} kr`;

const isWithinFirst30Days = (createdAt?: string | Date | null): boolean => {
  if (!createdAt) return true; // assume new if unknown
  const d = createdAt instanceof Date ? createdAt : new Date(createdAt);
  return Date.now() - d.getTime() < 30 * 24 * 60 * 60 * 1000;
};

export const hints = {
  // ─── Invoice ───
  missingAccountOnLine: (opts: {
    invoiceId: string;
    hasMissingAccount: boolean;
    onSuggest: () => void;
  }): InlineHintProps => ({
    id: `invoice:${opts.invoiceId}:missing-account`,
    when: opts.hasMissingAccount,
    message: "Du behöver välja konto innan fakturan kan bokföras. Vill du att AI föreslår konto?",
    actionLabel: "Ja, föreslå konto",
    onAction: opts.onSuggest,
    priority: 10,
  }),

  unbalancedJournal: (opts: {
    journalId: string;
    debit: number;
    credit: number;
    onAutoBalance: () => void;
  }): InlineHintProps => {
    const diff = Math.abs(opts.debit - opts.credit);
    const side = opts.debit > opts.credit ? "kredit" : "debet";
    return {
      id: `journal:${opts.journalId}:unbalanced`,
      when: diff > 0.005,
      message: `Verifikationen är inte i balans — det saknas ${formatSEK(diff)} på ${side}-sidan.`,
      actionLabel: "Lägg till motpost automatiskt",
      onAction: opts.onAutoBalance,
      tone: "warning",
      priority: 20,
    };
  },

  supplierMissingPaymentDetails: (opts: {
    supplierId: string;
    hasBgOrIban: boolean;
    onUpdateSupplier: () => void;
  }): InlineHintProps => ({
    id: `supplier:${opts.supplierId}:no-payment-details`,
    when: !opts.hasBgOrIban,
    message: "Den här leverantören saknar betalningsuppgifter. Lägg till bankgiro eller IBAN för att kunna betala direkt.",
    actionLabel: "Uppdatera leverantör",
    onAction: opts.onUpdateSupplier,
    tone: "warning",
    priority: 8,
  }),

  invoiceDueToday: (opts: {
    invoiceId: string;
    dueDate: string | Date;
    isPaid: boolean;
    onMarkPaid: () => void;
    onSendReminder: () => void;
  }): InlineHintProps => {
    const d = new Date(opts.dueDate);
    const today = new Date();
    const sameDay =
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate();
    return {
      id: `invoice:${opts.invoiceId}:due-today`,
      when: sameDay && !opts.isPaid,
      message: "Den här fakturan förfaller idag. Har betalning kommit in?",
      actionLabel: "Markera som betald",
      onAction: opts.onMarkPaid,
      secondaryLabel: "Skicka påminnelse",
      onSecondary: opts.onSendReminder,
      priority: 15,
    };
  },

  // ─── Accounting ───
  unusualAccountForType: (opts: {
    accountNumber: string;
    transactionType: "revenue" | "cost";
    onConfirm: () => void;
    onPickOther: () => void;
  }): InlineHintProps => {
    const accountIsCost = opts.accountNumber.startsWith("4") || opts.accountNumber.startsWith("5") || opts.accountNumber.startsWith("6") || opts.accountNumber.startsWith("7");
    const accountIsRevenue = opts.accountNumber.startsWith("3");
    const conflict =
      (opts.transactionType === "revenue" && accountIsCost) ||
      (opts.transactionType === "cost" && accountIsRevenue);
    return {
      id: `account-conflict:${opts.accountNumber}:${opts.transactionType}`,
      when: conflict,
      message: opts.transactionType === "revenue"
        ? "Det här kontot används normalt för kostnader — stämmer det att du vill bokföra en intäkt här?"
        : "Det här kontot används normalt för intäkter — stämmer det att du vill bokföra en kostnad här?",
      actionLabel: "Ja, det stämmer",
      onAction: opts.onConfirm,
      secondaryLabel: "Välj annat konto",
      onSecondary: opts.onPickOther,
      tone: "warning",
      priority: 12,
    };
  },

  largeJournalNoDescription: (opts: {
    journalId: string;
    amount: number;
    description: string;
    onFocusDescription: () => void;
  }): InlineHintProps => ({
    id: `journal:${opts.journalId}:no-description`,
    when: opts.amount > 10000 && opts.description.trim().length === 0,
    message: "Lägg till en beskrivning — det gör det enklare att spåra posten vid en framtida revision.",
    actionLabel: "Lägg till beskrivning",
    onAction: opts.onFocusDescription,
    priority: 5,
  }),

  periodizationCandidate: (opts: {
    journalId: string;
    isCandidate: boolean;
    onPeriodize: () => void;
  }): InlineHintProps => ({
    id: `journal:${opts.journalId}:periodization-candidate`,
    when: opts.isCandidate,
    message: "Den här kostnaden verkar avse en period längre än innevarande månad. Vill du periodisera den?",
    actionLabel: "Periodisera automatiskt",
    onAction: opts.onPeriodize,
    priority: 7,
  }),

  // ─── Period close ───
  unmatchedBankTxBlocking: (opts: {
    count: number;
    onShowUnmatched: () => void;
  }): InlineHintProps => ({
    id: `period-close:unmatched-bank`,
    when: opts.count > 0,
    message: `${opts.count} banktransaktion${opts.count === 1 ? "" : "er"} är omatchade och blockerar stängningen. Matcha ${opts.count === 1 ? "den" : "dem"} för att fortsätta.`,
    actionLabel: "Visa omatchade",
    onAction: opts.onShowUnmatched,
    tone: "warning",
    priority: 25,
  }),

  unpostedInvoicesInPeriod: (opts: {
    count: number;
    onShowInvoices: () => void;
  }): InlineHintProps => ({
    id: `period-close:unposted-invoices`,
    when: opts.count > 0,
    message: `${opts.count} faktur${opts.count === 1 ? "a" : "or"} i den här perioden är inte bokförd${opts.count === 1 ? "" : "a"}. Bokför ${opts.count === 1 ? "den" : "dem"} innan du stänger perioden.`,
    actionLabel: "Visa fakturor",
    onAction: opts.onShowInvoices,
    tone: "warning",
    priority: 22,
  }),

  // ─── Onboarding (first 30 days) ───
  emptyBankConnection: (opts: {
    accountCreatedAt?: string | Date | null;
    bankConnected: boolean;
    onConnectBank: () => void;
  }): InlineHintProps => ({
    id: `onboarding:no-bank`,
    when: !opts.bankConnected && isWithinFirst30Days(opts.accountCreatedAt),
    message: "Utan en ansluten bank kan jag inte hämta transaktioner automatiskt. Det tar under 2 minuter att ansluta.",
    actionLabel: "Anslut bank",
    onAction: opts.onConnectBank,
    priority: 6,
  }),

  draftInvoiceReminder: (opts: {
    invoiceId: string;
    customerName: string;
    accountCreatedAt?: string | Date | null;
    isDraft: boolean;
    onSend: () => void;
    onLater: () => void;
  }): InlineHintProps => ({
    id: `onboarding:draft-invoice:${opts.invoiceId}`,
    when: opts.isDraft && isWithinFirst30Days(opts.accountCreatedAt),
    message: `Du har en faktura i utkast till ${opts.customerName}. Vill du skicka den nu?`,
    actionLabel: "Skicka faktura",
    onAction: opts.onSend,
    secondaryLabel: "Påminn mig senare",
    onSecondary: opts.onLater,
    priority: 4,
  }),
};
