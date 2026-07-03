// hr-events-to-agi
// Aggregates approved hr_events for a given (year, month) into AGI-ready rows
// per employee, mapping category_key → AGI fields (061 cash gross, 050 expense
// reimbursement, 051 per diem, 052 mileage, 012 other benefits) and applying
// employer fee rate based on age.
//
// Returns the same shape AGIForm consumes, so the form can simply replace its
// employees[] with the response when the user clicks "Hämta från HR Engine".

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders, handleCors, corsError, corsJson } from "../_shared/cors.ts";

interface Body {
  company_id: string;
  year: number;
  month: number; // 1-12
}

function ageBasedFeeRate(birthYear: number | null, year: number): number {
  if (!birthYear) return 0.3142;
  const age = year - birthYear;
  if (age < 18) return 0.1021;
  if (age > 65) return 0.1021;
  return 0.3142;
}

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return corsError("Unauthorized", 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimErr } = await supabase.auth.getClaims(token);
    if (claimErr || !claims?.claims) return corsError("Unauthorized", 401);

    const body = (await req.json()) as Body;
    if (!body?.company_id || !body?.year || !body?.month) {
      return corsError("Missing company_id/year/month", 400);
    }

    const periodStart = `${body.year}-${String(body.month).padStart(2, "0")}-01`;
    const endDate = new Date(body.year, body.month, 0);
    const periodEnd = `${body.year}-${String(body.month).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;

    // Categories (for mapping)
    const { data: categories } = await supabase
      .from("hr_event_categories")
      .select("category_key, group_type, multiplier, payroll_code, affects_salary");
    const catMap = new Map<string, any>();
    (categories || []).forEach((c: any) => catMap.set(c.category_key, c));

    // Employees
    const { data: employees, error: empErr } = await supabase
      .from("employees")
      .select("id, first_name, last_name, monthly_salary, birth_date, hourly_rate")
      .eq("company_id", body.company_id)
      .eq("is_active", true);
    if (empErr) return corsError(empErr.message, 500);

    // Decrypt PII per employee
    const empWithPn = await Promise.all(
      (employees || []).map(async (e: any) => {
        const { data: pii } = await supabase.rpc("get_employee_pii", { p_employee_id: e.id });
        const pn = (Array.isArray(pii) ? pii[0]?.personal_number : pii?.personal_number) || "";
        return { ...e, personal_number: pn };
      }),
    );

    // Approved events for the period
    const { data: events, error: evErr } = await supabase
      .from("hr_events")
      .select("employee_id, category_key, hours, amount, quantity, event_date, metadata")
      .eq("company_id", body.company_id)
      .eq("status", "approved")
      .gte("event_date", periodStart)
      .lte("event_date", periodEnd);
    if (evErr) return corsError(evErr.message, 500);

    if (!events || events.length === 0) {
      return corsJson({
        ok: true,
        period: { year: body.year, month: body.month },
        source: "fallback_monthly_salary",
        employees: [],
        message: "Inga godkända hr_events i perioden — använd fallback (månadslön).",
      });
    }

    // Aggregate per employee
    type Agg = {
      cashGross: number;       // 061
      taxableBenefits: number; // 012
      mileage: number;         // 052 (taxfree, capped)
      perDiem: number;         // 051
      expenseReimb: number;    // 050
      eventCount: number;
    };
    const aggByEmp = new Map<string, Agg>();
    const ensure = (id: string): Agg => {
      let a = aggByEmp.get(id);
      if (!a) {
        a = { cashGross: 0, taxableBenefits: 0, mileage: 0, perDiem: 0, expenseReimb: 0, eventCount: 0 };
        aggByEmp.set(id, a);
      }
      return a;
    };

    const empById = new Map<string, any>();
    empWithPn.forEach((e) => empById.set(e.id, e));

    for (const ev of events) {
      const emp = empById.get(ev.employee_id);
      if (!emp) continue;
      const cat = catMap.get(ev.category_key);
      if (!cat) continue;
      const a = ensure(ev.employee_id);
      a.eventCount += 1;

      const hourly = Number(emp.hourly_rate ?? (Number(emp.monthly_salary || 0) / 165)) || 0;
      const mult = Number(cat.multiplier ?? 1);

      switch (cat.category_key) {
        case "comp_mileage":
          a.mileage += Number(ev.amount ?? 0);
          break;
        case "comp_per_diem":
          a.perDiem += Number(ev.amount ?? 0);
          break;
        case "comp_expense":
          a.expenseReimb += Number(ev.amount ?? 0);
          break;
        case "comp_bonus":
          a.cashGross += Number(ev.amount ?? 0);
          break;
        default: {
          // Work / OB / overtime / vacation / sick → cash gross
          if (cat.group_type === "work" || cat.group_type === "vacation") {
            const hours = Number(ev.hours ?? 0);
            const amount = Number(ev.amount ?? 0);
            if (amount > 0) {
              a.cashGross += amount;
            } else if (hours > 0) {
              a.cashGross += Math.round(hours * hourly * mult);
            }
          } else if (cat.group_type === "absence" && cat.affects_salary) {
            // sick/vab/parental — multiplier applied (e.g. 0.8 for sick)
            const hours = Number(ev.hours ?? 0);
            if (hours > 0) {
              a.cashGross += Math.round(hours * hourly * mult);
            }
          }
        }
      }
    }

    // Build AGI rows
    const rows = empWithPn.map((emp: any) => {
      const a = aggByEmp.get(emp.id) || { cashGross: 0, taxableBenefits: 0, mileage: 0, perDiem: 0, expenseReimb: 0, eventCount: 0 };
      const birthDate = emp.birth_date ? new Date(emp.birth_date) : null;
      const birthYear = birthDate ? birthDate.getFullYear() : null;
      const cash = Math.round(a.cashGross);
      const tax = Math.round(cash * 0.30); // simple table-30 default; user can override in form
      const feeRate = ageBasedFeeRate(birthYear, body.year);
      const employerFee = Math.round(cash * feeRate);

      return {
        employeeId: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
        personalNumber: emp.personal_number || "",
        birthYear,
        eventCount: a.eventCount,
        feeRate,
        employerFee,
        fields: {
          "061": cash,
          "062": tax,
          "050": Math.round(a.expenseReimb),
          "051": Math.round(a.perDiem),
          "052": Math.round(a.mileage),
          "010": 0,
          "011": 0,
          "012": Math.round(a.taxableBenefits),
          "013": 0,
        },
        expanded: false,
      };
    }).filter((r) => r.eventCount > 0);

    const totalCash = rows.reduce((s, r) => s + r.fields["061"], 0);
    const totalTax = rows.reduce((s, r) => s + r.fields["062"], 0);
    const totalEmployerFee = rows.reduce((s, r) => s + r.employerFee, 0);

    return corsJson({
      ok: true,
      period: { year: body.year, month: body.month, periodStart, periodEnd },
      source: "hr_events",
      employees: rows,
      totals: {
        cashGross: totalCash,
        tax: totalTax,
        employerFee: totalEmployerFee,
        rowsWithEvents: rows.length,
        totalEvents: events.length,
      },
    });
  } catch (e: any) {
    return corsError(e?.message || "Internal error", 500);
  }
});
