import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generatePayrollPDF, type PayrollSlipData } from "./generate-pdf.ts";

import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const rawInput = await req.json();
    const payroll_line_id = rawInput?.payroll_line_id;

    if (!payroll_line_id || typeof payroll_line_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payroll_line_id)) {
      throw new Error('Ogiltigt lönespec-ID format');
    }

    console.log("Generating payroll slip for:", payroll_line_id);

    // Fetch payroll line with related data
    const { data: payrollLine, error: lineError } = await supabaseClient
      .from("payroll_lines")
      .select(`
        *,
        employee:employees(*),
        payroll_run:payroll_runs(
          *,
          company:companies(*)
        )
      `)
      .eq("id", payroll_line_id)
      .maybeSingle();

    if (lineError) throw lineError;
    if (!payrollLine) throw new Error('Payroll line not found');
    if (!payrollLine.employee.email) {
      throw new Error("Employee has no email address");
    }

    // Fetch adjustments
    const { data: adjustments } = await supabaseClient
      .from("payroll_adjustments")
      .select("*")
      .eq("payroll_line_id", payroll_line_id);

    const payrollData: PayrollSlipData = {
      employee: {
        first_name: payrollLine.employee.first_name,
        last_name: payrollLine.employee.last_name,
        personal_number: payrollLine.employee.personal_number,
        email: payrollLine.employee.email,
        employment_start: payrollLine.employee.employment_start,
        employment_end: payrollLine.employee.employment_end,
      },
      payroll: {
        period_start: payrollLine.payroll_run.period_start,
        period_end: payrollLine.payroll_run.period_end,
        payment_date: payrollLine.payroll_run.payment_date,
        gross_salary: payrollLine.gross_salary,
        tax_deduction: payrollLine.tax_deduction,
        net_salary: payrollLine.net_salary,
        employer_social_fees: payrollLine.employer_social_fees,
        vacation_pay: payrollLine.vacation_pay || 0,
        pension: payrollLine.pension || 0,
        worked_hours: payrollLine.worked_hours,
      },
      adjustments: (adjustments || []).map(adj => ({
        type: adj.adjustment_type,
        description: adj.description || adj.adjustment_type,
        amount: adj.amount,
      })),
      company: {
        name: payrollLine.payroll_run.company.name,
        org_number: payrollLine.payroll_run.company.org_number,
      },
    };

    // Generate PDF
    const pdfBuffer = generatePayrollPDF(payrollData);
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

    // Send email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "NorthLedger <noreply@northledger.se>",
        to: [payrollData.employee.email],
        subject: `Lönespecifikation ${new Date(payrollData.payroll.period_start).toLocaleDateString("sv-SE")}`,
        html: `
          <h2>Lönespecifikation</h2>
          <p>Hej ${payrollData.employee.first_name},</p>
          <p>Din lönespecifikation för perioden ${new Date(payrollData.payroll.period_start).toLocaleDateString("sv-SE")} - ${new Date(payrollData.payroll.period_end).toLocaleDateString("sv-SE")} finns bifogad som PDF.</p>
          <p><strong>Nettolön:</strong> ${new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK" }).format(payrollData.payroll.net_salary)}</p>
          <p><strong>Utbetalningsdatum:</strong> ${new Date(payrollData.payroll.payment_date).toLocaleDateString("sv-SE")}</p>
          <p>Med vänliga hälsningar,<br>${payrollData.company.name}</p>
        `,
        attachments: [
          {
            filename: `lonespec_${new Date(payrollData.payroll.period_start).toISOString().slice(0, 7)}_${payrollData.employee.last_name}.pdf`,
            content: pdfBase64,
          },
        ],
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const emailResult = await emailResponse.json();
    console.log("Email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Payroll slip sent successfully",
        email_id: emailResult.id 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-payroll-slip:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
