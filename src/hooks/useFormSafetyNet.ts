/**
 * Wrap react-hook-form med automatisk snapshot + validation tracking.
 */
import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import { saveSnapshot } from "@/lib/tech-support/actionWhitelist";
import { reportValidationError } from "@/lib/tech-support/predictiveMonitor";

export function useFormSafetyNet<T extends Record<string, unknown>>(
  formId: string,
  form: UseFormReturn<T>,
) {
  // Auto-snapshot vid varje ändring
  useEffect(() => {
    const sub = form.watch((value) => {
      saveSnapshot(`form:${formId}`, value);
    });
    return () => sub.unsubscribe();
  }, [form, formId]);

  // Rapportera valideringsfel
  useEffect(() => {
    const errs = form.formState.errors;
    Object.keys(errs).forEach((field) => reportValidationError(formId, field));
  }, [form.formState.errors, formId]);
}
