import { z } from "zod";

export const companySchema = z.object({
  name: z.string().trim().min(1, "Företagsnamn krävs").max(200, "Namnet är för långt"),
  orgNumber: z.string().trim().min(1, "Organisationsnummer krävs").max(50, "Organisationsnumret är för långt"),
  country: z.enum(["SE", "NO", "DK", "FI"], { required_error: "Land krävs" }),
  currency: z.string().trim().min(3, "Valuta krävs").max(3, "Valuta måste vara 3 tecken").default("SEK"),
  vatNumber: z.string().trim().max(50, "Momsnumret är för långt").optional(),
  address: z.string().trim().max(500, "Adressen är för lång").optional(),
});

export type CompanyData = z.infer<typeof companySchema>;
