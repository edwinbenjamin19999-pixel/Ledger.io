/**
 * useVATSettlement — posts settlement & payment journal entries via the existing
 * journal_entries / journal_entry_lines tables, then writes to vat_settlements.
 *
 * Pattern: Draft → Lines → Approve (per architecture/ai-booking-transaction-sequence-sv).
 */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SettlementProposal } from "@/lib/vat/buildSettlementEntry";

interface PostArgs {
  companyId: string;
  proposal: SettlementProposal;
  entryDate: string;        // ISO YYYY-MM-DD
  description: string;
  periodLabel: string;
  vatDeclarationId?: string | null;
  /** When set, links to an existing settlement row (payment registration). */
  vatSettlementId?: string | null;
  /** "settlement" creates clearing JE; "payment" creates payment JE. */
  kind: "settlement" | "payment";
}

export function useVATSettlement() {
  const [posting, setPosting] = useState(false);

  const post = useCallback(async ({
    companyId, proposal, entryDate, description, periodLabel,
    vatDeclarationId, vatSettlementId, kind,
  }: PostArgs): Promise<{ journalEntryId: string; settlementId: string } | null> => {
    if (!proposal.isBalanced) {
      toast.error("Verifikat ej i balans — kan ej bokföra");
      return null;
    }
    setPosting(true);
    try {
      const { data: userResp } = await supabase.auth.getUser();
      const userId = userResp.user?.id;

      // 1) Create draft journal entry
      const { data: je, error: jeErr } = await supabase
        .from("journal_entries")
        .insert({
          company_id: companyId,
          entry_date: entryDate,
          description,
          status: "draft",
          created_by: userId,
        } as any)
        .select("id")
        .single();
      if (jeErr || !je) throw jeErr || new Error("Kunde inte skapa verifikat");

      // 2) Insert lines (resolve chart_of_accounts ids)
      const acctNumbers = Array.from(new Set(proposal.lines.map(l => l.accountNumber)));
      const { data: accounts, error: acctErr } = await supabase
        .from("chart_of_accounts")
        .select("id, account_number")
        .eq("company_id", companyId)
        .in("account_number", acctNumbers);
      if (acctErr) throw acctErr;

      const acctMap = new Map<string, string>();
      (accounts || []).forEach(a => acctMap.set(a.account_number, a.id));

      // Verify all accounts exist; if not, surface a clear error
      const missing = acctNumbers.filter(n => !acctMap.has(n));
      if (missing.length > 0) {
        throw new Error(`Saknade konton i kontoplanen: ${missing.join(", ")}. Lägg till dem och försök igen.`);
      }

      const linesPayload = proposal.lines.map(l => ({
        journal_entry_id: je.id,
        account_id: acctMap.get(l.accountNumber)!,
        debit: l.debit,
        credit: l.credit,
        description: `${l.accountNumber} ${l.accountName}`,
      }));

      const { error: linesErr } = await supabase.from("journal_entry_lines").insert(linesPayload as any);
      if (linesErr) throw linesErr;

      // 3) Approve (triggers balance enforcement)
      const { error: approveErr } = await supabase
        .from("journal_entries")
        .update({ status: "approved", approved_by: userId, approved_at: new Date().toISOString() } as any)
        .eq("id", je.id);
      if (approveErr) throw approveErr;

      // 4) Upsert vat_settlements row
      let settlementId = vatSettlementId || null;
      if (kind === "settlement") {
        const { data: settle, error: settleErr } = await supabase
          .from("vat_settlements" as any)
          .insert({
            company_id: companyId,
            vat_declaration_id: vatDeclarationId || null,
            settlement_journal_entry_id: je.id,
            net_amount: proposal.netAmount,
            direction: proposal.direction,
            status: "settled",
            period_label: periodLabel,
            approved_by: userId,
            approved_at: new Date().toISOString(),
          } as any)
          .select("id")
          .single();
        if (settleErr) throw settleErr;
        settlementId = (settle as any).id;
      } else {
        // Payment: update existing settlement row
        if (!vatSettlementId) {
          // Create one if none exists
          const { data: settle, error: settleErr } = await supabase
            .from("vat_settlements" as any)
            .insert({
              company_id: companyId,
              vat_declaration_id: vatDeclarationId || null,
              payment_journal_entry_id: je.id,
              net_amount: proposal.netAmount,
              direction: proposal.direction,
              status: proposal.direction === "payable" ? "paid" : "refunded",
              period_label: periodLabel,
              approved_by: userId,
              approved_at: new Date().toISOString(),
              paid_at: new Date().toISOString(),
            } as any)
            .select("id")
            .single();
          if (settleErr) throw settleErr;
          settlementId = (settle as any).id;
        } else {
          const { error: updErr } = await supabase
            .from("vat_settlements" as any)
            .update({
              payment_journal_entry_id: je.id,
              status: proposal.direction === "payable" ? "paid" : "refunded",
              paid_at: new Date().toISOString(),
            } as any)
            .eq("id", vatSettlementId);
          if (updErr) throw updErr;
        }
      }

      toast.success(kind === "settlement" ? "Momsavräkning bokförd" : "Betalning registrerad");
      return { journalEntryId: je.id, settlementId: settlementId! };
    } catch (e: any) {
      console.error("[useVATSettlement]", e);
      toast.error(e?.message || "Bokföring misslyckades");
      return null;
    } finally {
      setPosting(false);
    }
  }, []);

  return { post, posting };
}
