import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      company_id,
      period_year,
      period_month,
      period_quarter,
      period_type = "monthly",
      rutor_overrides = {},
    } = await req.json();

    // Determine date range
    let startDate: string;
    let endDate: string;

    if (period_type === "monthly") {
      startDate = `${period_year}-${String(period_month).padStart(2, "0")}-01`;
      const lastDay = new Date(period_year, period_month, 0).getDate();
      endDate = `${period_year}-${String(period_month).padStart(2, "0")}-${lastDay}`;
    } else if (period_type === "quarterly") {
      const startMonth = (period_quarter - 1) * 3 + 1;
      const endMonth = period_quarter * 3;
      startDate = `${period_year}-${String(startMonth).padStart(2, "0")}-01`;
      const lastDay = new Date(period_year, endMonth, 0).getDate();
      endDate = `${period_year}-${String(endMonth).padStart(2, "0")}-${lastDay}`;
    } else {
      startDate = `${period_year}-01-01`;
      endDate = `${period_year}-12-31`;
    }

    // Fetch journal lines for the period
    const { data: entries, error: entriesError } = await supabaseAdmin
      .from("journal_entry_lines")
      .select(`
        debit, credit, vat_code,
        account:chart_of_accounts(account_number, account_type, vat_code),
        journal_entry:journal_entries!inner(entry_date, company_id, status)
      `)
      .eq("journal_entry.company_id", company_id)
      .eq("journal_entry.status", "approved")
      .gte("journal_entry.entry_date", startDate)
      .lte("journal_entry.entry_date", endDate);

    if (entriesError) throw entriesError;

    // Calculate all rutor from journal data
    let r05 = 0, r06 = 0, r07 = 0, r08 = 0;
    let r10 = 0, r11 = 0, r12 = 0;
    let r20 = 0, r21 = 0, r22 = 0, r23 = 0, r24 = 0;
    let r48 = 0;

    for (const entry of (entries || []) as any[]) {
      const accNum = entry.account?.account_number || "";
      const accInt = parseInt(accNum, 10);
      const vatCode = entry.vat_code || entry.account?.vat_code || "";
      const c = entry.credit || 0;
      const d = entry.debit || 0;
      const net = c - d;

      // Section A: Revenue (3000–3699)
      if (accInt >= 3000 && accInt <= 3699 && net > 0) {
        if (vatCode === "25") r05 += net;
        else if (vatCode === "12") r06 += net;
        else if (vatCode === "6") r07 += net;
        else r08 += net;
      }

      // Section B: Output VAT from ledger accounts
      if (["2610", "2611", "2612"].includes(accNum)) r10 += c - d;
      else if (["2620", "2621"].includes(accNum)) r11 += c - d;
      else if (["2630", "2631"].includes(accNum)) r12 += c - d;

      // Section C: Reverse charge
      if (accNum === "2615") r20 += d - c;
      if (["2645", "2646"].includes(accNum)) r21 += d - c;
      if (accNum === "2614") r23 += d - c;

      // Section E: Input VAT
      if (["2640", "2641", "2642"].includes(accNum)) r48 += d - c;
    }

    // Apply manual overrides from client
    const ov = (key: string, auto: number) =>
      rutor_overrides[key] !== undefined ? Number(rutor_overrides[key]) : auto;

    const final05 = ov("05", r05);
    const final06 = ov("06", r06);
    const final07 = ov("07", r07);
    const final08 = ov("08", r08);
    const final10 = ov("10", r10);
    const final11 = ov("11", r11);
    const final12 = ov("12", r12);
    const final20 = ov("20", r20);
    const final21 = ov("21", r21);
    const final22 = ov("22", r22);
    const final23 = ov("23", r23);
    const final24 = ov("24", r24);
    const totalRC = final20 + final21 + final22 + final23 + final24;
    const final30 = ov("30", totalRC * 0.25);
    const final31 = ov("31", 0);
    const final32 = ov("32", 0);
    const final48 = ov("48", r48);

    const totalOutputVAT = final10 + final11 + final12 + final30 + final31 + final32;
    const vatToPay = totalOutputVAT - final48;

    // Persist to vat_declarations
    const declarationData = {
      company_id,
      period_year,
      period_month: period_type === "monthly" ? period_month : null,
      period_quarter: period_type === "quarterly" ? period_quarter : null,
      period_type,
      sales_25_percent: final05,
      sales_12_percent: final06,
      sales_6_percent: final07,
      sales_0_percent: final08,
      eu_sales: 0,
      eu_purchases: final20 + final21,
      output_vat_25: final10 + final30,
      output_vat_12: final11 + final31,
      output_vat_6: final12 + final32,
      input_vat: final48,
      vat_to_pay: vatToPay,
      status: "pending_approval",
      calculated_at: new Date().toISOString(),
    };

    let declaration: any;
    const userResult = await supabaseUser
      .from("vat_declarations")
      .upsert(declarationData, {
        onConflict: "company_id,period_year,period_month,period_quarter,period_type",
      })
      .select()
      .maybeSingle();

    if (userResult.error) {
      console.warn("User upsert failed, falling back to admin:", userResult.error.message);
      const adminResult = await supabaseAdmin
        .from("vat_declarations")
        .upsert(declarationData, {
          onConflict: "company_id,period_year,period_month,period_quarter,period_type",
        })
        .select()
        .maybeSingle();
      if (adminResult.error) throw adminResult.error;
      declaration = adminResult.data;

      await supabaseAdmin.from("audit_events").insert({
        user_id: user.id,
        entity_type: "vat_declarations",
        entity_id: declaration.id,
        event_type: "UPSERT_vat_declarations",
        data_categories: ["financial", "tax_submission"],
        processing_purpose: "Skattedeklaration och rapportering",
        legal_basis: "legal_obligation",
      });
    } else {
      declaration = userResult.data;
    }

    // Create automation task
    await supabaseUser
      .from("automation_tasks")
      .upsert(
        {
          company_id,
          task_type: "vat_declaration",
          related_entity_type: "vat_declaration",
          related_entity_id: declaration.id,
          status: "ready_for_approval",
          prepared_data: {
            ...declaration,
            rutor: {
              "05": final05, "06": final06, "07": final07, "08": final08,
              "10": final10, "11": final11, "12": final12,
              "20": final20, "21": final21, "22": final22, "23": final23, "24": final24,
              "30": final30, "31": final31, "32": final32,
              "48": final48, "49": vatToPay,
            },
          },
          approval_summary: `Momsdeklaration ${
            period_type === "monthly"
              ? `${period_year}-${String(period_month).padStart(2, "0")}`
              : period_type === "quarterly"
              ? `Q${period_quarter} ${period_year}`
              : period_year
          }: Moms att ${vatToPay >= 0 ? "betala" : "få tillbaka"}: ${Math.abs(vatToPay).toLocaleString("sv-SE")} kr`,
          requires_approval: true,
        },
        { onConflict: "company_id,task_type,related_entity_id" }
      );

    return new Response(
      JSON.stringify({
        success: true,
        declaration,
        rutor: {
          "05": final05, "06": final06, "07": final07, "08": final08,
          "10": final10, "11": final11, "12": final12,
          "20": final20, "21": final21, "22": final22, "23": final23, "24": final24,
          "30": final30, "31": final31, "32": final32,
          "48": final48, "49": vatToPay,
        },
        summary: {
          period: period_type === "monthly"
            ? `${period_year}-${String(period_month).padStart(2, "0")}`
            : period_type === "quarterly"
            ? `Q${period_quarter} ${period_year}`
            : String(period_year),
          total_output_vat: totalOutputVAT,
          total_input_vat: final48,
          vat_to_pay: vatToPay,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in calculate-vat:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
