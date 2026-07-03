import { z } from "zod";

export const consentSchema = z.object({
  consent_type: z.enum(['necessary', 'analytics', 'marketing', 'data_processing']),
  consent_given: z.boolean(),
});

export const dataExportRequestSchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
});

export const accountDeletionRequestSchema = z.object({
  action: z.enum(['request', 'cancel', 'execute']),
  confirmation: z.boolean().refine(val => val === true, {
    message: "Du måste bekräfta att du förstår konsekvenserna"
  }).optional(),
});

export type ConsentData = z.infer<typeof consentSchema>;
export type DataExportRequest = z.infer<typeof dataExportRequestSchema>;
export type AccountDeletionRequest = z.infer<typeof accountDeletionRequestSchema>;
