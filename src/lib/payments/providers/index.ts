import type { PaymentProvider, PaymentProviderName } from "./types";
import { fileExportProvider } from "./fileExport";

// Phase 3 stubs — currently throw to make accidental usage explicit.
const notImplemented = (name: PaymentProviderName): PaymentProvider => ({
  type: "open_banking",
  name,
  displayName: name,
  async preparePayment() {
    throw new Error(`Provider ${name} är inte aktiverad ännu — kommer i Phase 3`);
  },
});

const registry: Record<PaymentProviderName, PaymentProvider> = {
  manual_file_export: fileExportProvider,
  salt_edge: notImplemented("salt_edge"),
  tink: notImplemented("tink"),
  truelayer: notImplemented("truelayer"),
  yapily: notImplemented("yapily"),
};

export function getPaymentProvider(name: PaymentProviderName): PaymentProvider {
  return registry[name];
}

export const OPEN_BANKING_CATALOG: Array<{
  name: PaymentProviderName;
  displayName: string;
  region: string;
  description: string;
}> = [
  {
    name: "tink",
    displayName: "Tink",
    region: "Norden / EU",
    description: "Ledande nordisk Open Banking-leverantör med stark BankID-integration.",
  },
  {
    name: "salt_edge",
    displayName: "Salt Edge",
    region: "Global",
    description: "Bred bankanslutning över EU/UK och Nordamerika.",
  },
  {
    name: "truelayer",
    displayName: "TrueLayer",
    region: "EU / UK",
    description: "PIS-flöden med snabb genomslag i UK och växande EU-täckning.",
  },
  {
    name: "yapily",
    displayName: "Yapily",
    region: "EU / UK",
    description: "API-only Open Banking-infrastruktur utan eget UI.",
  },
];

export type { PaymentProvider, PaymentProviderName, PaymentProviderType, PaymentProviderStatus, PaymentProviderConfig } from "./types";

// Phase 3 — PIS (Payment Initiation Service)
export {
  PIS_PROVIDER_REGISTRY,
  getActivePISProvider,
  type PISProviderId,
  type InitiatePaymentInput,
  type InitiatePaymentResult,
} from "./pis";
