import { z } from "zod";

export const passwordRequirementsText =
  "Minst 12 tecken, en stor bokstav, en siffra och ett specialtecken";

export const strongPasswordSchema = z
  .string()
  .min(12, "Lösenordet måste vara minst 12 tecken")
  .max(100, "Lösenordet är för långt")
  .regex(/[A-ZÅÄÖ]/, "Lösenordet måste innehålla minst en stor bokstav")
  .regex(/[0-9]/, "Lösenordet måste innehålla minst en siffra")
  .regex(/[^A-Za-zÅÄÖåäö0-9\s]/, "Lösenordet måste innehålla minst ett specialtecken");

export const signUpSchema = z.object({
  email: z.string().email("Ogiltig e-postadress").max(255, "E-postadressen är för lång"),
  password: strongPasswordSchema,
});

export const signInSchema = z.object({
  email: z.string().email("Ogiltig e-postadress"),
  password: z.string().min(1, "Lösenord krävs"),
});

export type SignUpData = z.infer<typeof signUpSchema>;
export type SignInData = z.infer<typeof signInSchema>;
