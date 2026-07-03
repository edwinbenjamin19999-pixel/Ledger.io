import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EditableLine {
  id: string;            // existing line id, or `new-…` for new rows
  account_id: string;
  account_number?: string;
  account_name?: string;
  debit: number;
  credit: number;
  vat_code?: string | null;
}

export interface UpdateVoucherInput {
  journal_entry_id: string;
  entry_date: string;             // yyyy-MM-dd
  description: string;
  lines: EditableLine[];
  original?: {                    // for audit + AI feedback
    entry_date: string;
    description: string;
    lines: EditableLine[];
  };
  learn?: boolean;                // also write to ai_feedback
}

const TOLERANCE = 0.01;

export function useUpdateVoucher() {
  const [saving, setSaving] = useState(false);

  const validate = (input: UpdateVoucherInput): string | null => {
    const filled = input.lines.filter(l => l.account_id && (l.debit > 0 || l.credit > 0));
    if (filled.length < 2) return "Verifikationen måste ha minst 2 konteringsrader";
    const debit = filled.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const credit = filled.reduce((s, l) => s + (Number(l.credit) || 0), 0);
    if (Math.abs(debit - credit) > TOLERANCE) {
      return `Debet (${debit.toFixed(2)}) och kredit (${credit.toFixed(2)}) balanserar inte`;
    }
    return null;
  };

  const save = async (input: UpdateVoucherInput): Promise<boolean> => {
    const err = validate(input);
    if (err) {
      toast.error(err);
      return false;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Inte inloggad");

      // 1. Update header
      const { error: headerErr } = await supabase
        .from("journal_entries")
        .update({
          entry_date: input.entry_date,
          description: input.description,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.journal_entry_id);
      if (headerErr) throw headerErr;

      // 2. Replace lines (simplest correct approach for a balanced voucher)
      const { error: delErr } = await supabase
        .from("journal_entry_lines")
        .delete()
        .eq("journal_entry_id", input.journal_entry_id);
      if (delErr) throw delErr;

      const filled = input.lines.filter(l => l.account_id && (l.debit > 0 || l.credit > 0));
      const { error: insErr } = await supabase
        .from("journal_entry_lines")
        .insert(filled.map(l => ({
          journal_entry_id: input.journal_entry_id,
          account_id: l.account_id,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          vat_code: l.vat_code && l.vat_code !== "none" ? l.vat_code : null,
        })));
      if (insErr) throw insErr;

      // 3. Audit trail via existing audit_log table
      try {
        await supabase.from("audit_log").insert({
          user_id: user.id,
          action: "voucher_edit",
          entity_type: "journal_entry",
          entity_id: input.journal_entry_id,
          description: `Verifikation redigerad: ${input.description}`,
          previous_state: input.original ? (input.original as any) : null,
          new_state: {
            entry_date: input.entry_date,
            description: input.description,
            lines: filled,
          } as any,
        });
      } catch { /* audit failures should not block save */ }

      // 4. AI feedback (Spara & lär AI)
      if (input.learn && input.original) {
        try {
          await supabase.from("ai_feedback").insert({
            journal_entry_id: input.journal_entry_id,
            corrected_by: user.id,
            company_id: (await supabase.from("journal_entries").select("company_id").eq("id", input.journal_entry_id).maybeSingle()).data?.company_id,
            correction_type: "manual_edit",
            original_suggestion: input.original as any,
            corrected_data: {
              entry_date: input.entry_date,
              description: input.description,
              lines: filled,
            } as any,
          });
        } catch { /* learning failures should not block save */ }
      }

      toast.success(input.learn ? "Sparat — AI har lärt sig" : "Verifikation uppdaterad");
      return true;
    } catch (e: any) {
      toast.error(e.message || "Kunde inte spara");
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { save, saving, validate };
}
