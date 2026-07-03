import { z } from "zod";

export const documentUploadSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 20 * 1024 * 1024, "Filen får max vara 20MB")
    .refine(
      (file) => ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type),
      "Endast PDF, JPG, PNG och WEBP tillåts"
    ),
  companyId: z.string().uuid("Ogiltigt företags-ID"),
  documentType: z.enum(["invoice_incoming", "invoice_outgoing", "receipt", "bank_statement", "peppol", "other"]),
});

export type DocumentUploadData = z.infer<typeof documentUploadSchema>;
