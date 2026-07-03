import { z } from "zod";

export const taxMandateSchema = z.object({
  companyId: z.string().uuid("Ogiltigt företags-ID"),
  mandateType: z.enum(['agi', 'vat', 'full'], {
    required_error: "Fullmaktstyp krävs"
  }),
  consentText: z.string().min(100, "Fullmaktstexten måste vara minst 100 tecken"),
  consentIpAddress: z.string().ip({ version: "v4" }).optional(),
  validUntil: z.date().optional(),
});

export type TaxMandateData = z.infer<typeof taxMandateSchema>;

export const mandateRevocationSchema = z.object({
  mandateId: z.string().uuid("Ogiltigt fullmakts-ID"),
  revocationReason: z.string().min(10, "Ange anledning till återkallelse (minst 10 tecken)").max(500, "Anledningen är för lång"),
});

export type MandateRevocationData = z.infer<typeof mandateRevocationSchema>;
