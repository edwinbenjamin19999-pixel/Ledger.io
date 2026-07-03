// SIE Import 2.0 — action-based pipeline.
// Actions: parse | commit | remap
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, handleCors, corsError, corsJson } from "../_shared/cors.ts";
import { decodeSIEBytes, parseSIE, sha256Hex, type SIEDocument } from "../_shared/sieParser.ts";
import { validateSIE, type ValidationReport } from "../_shared/sieValidator.ts";

function sieToISO(d: string): string {
  if (d?.length === 8 && !d.includes("-")) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  return d;
}

interface MappingRow {
  account_number: string;
  account_name: string;
  mapped_row_code: string | null;
  mapped_row_id: string | null;
  confidence: number;
  source: "rule" | "sru" | "history" | "ai" | "user" | "unmapped";
  reason: string;
}

type ImportLinePayload = {
  account_id: string;
  debit: number;
  credit: number;
  vat_code: string | null;
  vat_amount: number;
  dimension: string | null;
  description: string | null;
};

function dimensionsToText(dimensions?: Record<string, string>): string | null {
  if (!dimensions || Object.keys(dimensions).length === 0) return null;
  return JSON.stringify(dimensions);
}

function numericVerificationNumber(value: string): number | null {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDbError(prefix: string, error: { message?: string; code?: string; details?: string; hint?: string }): string {
  const parts = [error.message, error.code ? `kod ${error.code}` : null, error.details, error.hint].filter(Boolean);
  return `${prefix}: ${parts.join(" · ")}`;
}

async function actionParse(req: Request, supabaseUrl: string, anonKey: string, serviceKey: string) {
  const auth = req.headers.get("Authorization");
  if (!auth) return corsError("Unauthorized", 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return corsError("Inte inloggad", 401);

  const body = await req.json();
  const companyId: string = body.companyId;
  const fileName: string = body.fileName ?? "import.sie";
  const fileContentBase64: string | undefined = body.fileContentBase64;
  const fileContent: string | undefined = body.fileContent;

  if (!companyId) return corsError("companyId krävs", 400);
  if (!fileContentBase64 && !fileContent) return corsError("Filinnehåll saknas", 400);

  // Decode bytes
  let bytes: Uint8Array;
  if (fileContentBase64) {
    const bin = atob(fileContentBase64);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } else {
    bytes = new TextEncoder().encode(fileContent!);
  }

  const fileHash = await sha256Hex(bytes);
  const { text, encoding } = decodeSIEBytes(bytes);
  const doc = parseSIE(text, encoding);

  // Look up company org-nr for validation
  const admin = createClient(supabaseUrl, serviceKey);
  const { data: memberCheck } = await admin.rpc("is_company_member", {
    _user_id: user.id, _company_id: companyId,
  });
  if (!memberCheck) return corsError("Åtkomst nekad till valt bolag", 403);

  const { data: company } = await admin
    .from("companies")
    .select("org_number, name")
    .eq("id", companyId)
    .maybeSingle();

  const validation: ValidationReport = validateSIE(doc, { orgNumber: company?.org_number ?? null });

  const status = validation.blockers.length > 0 ? "blocked" : "previewed";

  // Dedup check: existing session with same hash?
  const { data: existingRaw } = await admin
    .from("sie_import_sessions")
    .select("id, status, created_at, error_message")
    .eq("company_id", companyId)
    .eq("file_hash", fileHash)
    .maybeSingle();
  let existing = existingRaw as any;

  // If a previous session was marked "committed" but recorded errors, it actually
  // failed mid-import (legacy/stale). Wipe orphaned rows and reset to previewed so
  // the user can re-import cleanly instead of getting "already imported".
  if (existing && existing.status === "committed" && existing.error_message) {
    await admin.from("journal_entries").delete().eq("import_session_id", existing.id);
    await admin
      .from("sie_import_sessions")
      .update({ status: "previewed", error_message: null, committed_at: null })
      .eq("id", existing.id);
    existing = { ...existing, status: "previewed", error_message: null };
  }

  const fy0 = doc.header.fiscalYears?.find((y) => y.index === 0);
  const parsedSummary = {
    accounts: doc.accounts.length,
    verifications: doc.verifications.length,
    transactions: validation.stats.totalTransactions,
    fiscalYears: doc.header.fiscalYears ?? [],
    program: doc.header.program?.name,
    sieType: doc.header.sieType,
    encoding: doc.encoding,
    stats: validation.stats,
  };

  if (existing && existing.status === "committed" && !existing.error_message) {
    return corsJson({
      success: true,
      sessionId: existing.id,
      status: "committed",
      alreadyImported: true,
      duplicate: { previousImportAt: existing.created_at },
      company: { fileOrgNumber: doc.header.orgNumber, fileCompanyName: doc.header.companyName, expectedOrgNumber: company?.org_number, expectedCompanyName: company?.name },
      parsedSummary,
      validation,
      mappings: [],
      mappingSummary: { total: doc.accounts.length, auto: 0, review: 0, manual: doc.accounts.length },
      message: "Filen är redan importerad.",
    });
  }

  // Run AI mapping in same call (async invoke to ai-map-sie-accounts)
  let mappings: MappingRow[] = [];
  let mappingSummary: any = { total: 0, auto: 0, review: 0, manual: 0 };
  if (status !== "blocked") {
    try {
      // Build sample transaction texts per account
      const sampleByAcc = new Map<string, string[]>();
      for (const ver of doc.verifications) {
        for (const t of ver.transactions) {
          if (!sampleByAcc.has(t.accountNumber)) sampleByAcc.set(t.accountNumber, []);
          const arr = sampleByAcc.get(t.accountNumber)!;
          if (arr.length < 3 && t.text) arr.push(t.text);
        }
      }
      const accountInputs = doc.accounts.map((a) => ({
        number: a.number,
        name: a.name,
        sruCode: a.sruCode,
        sampleTexts: sampleByAcc.get(a.number) ?? [],
      }));

      const aiResp = await fetch(`${supabaseUrl}/functions/v1/ai-map-sie-accounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: auth,
          apikey: anonKey,
        },
        body: JSON.stringify({ companyId, accounts: accountInputs }),
      });
      if (aiResp.ok) {
        const j = await aiResp.json();
        mappings = j.mappings ?? [];
        mappingSummary = j.summary ?? mappingSummary;
      } else {
        console.warn("AI mapping returned non-OK:", aiResp.status);
      }
    } catch (e) {
      console.error("AI mapping invocation failed:", e);
    }
  }

  // UPSERT session row (unique on company+hash)
  const { data: session, error: sessionErr } = await admin
    .from("sie_import_sessions")
    .upsert(
      {
        company_id: companyId,
        file_hash: fileHash,
        file_name: fileName,
        file_size_bytes: bytes.length,
        sie_type: doc.header.sieType ? `SIE${doc.header.sieType}` : null,
        org_number: doc.header.orgNumber ?? null,
        company_name: doc.header.companyName ?? null,
        fiscal_year_start: fy0 ? sieToISO(fy0.start) : null,
        fiscal_year_end: fy0 ? sieToISO(fy0.end) : null,
        status,
        parsed_summary: parsedSummary,
        mapping_summary: { ...mappingSummary, mappings },
        validation_report: {
          blockers: validation.blockers,
          warnings: validation.warnings,
          info: validation.info,
        },
        created_by: user.id,
      },
      { onConflict: "company_id,file_hash" },
    )
    .select("id")
    .maybeSingle();

  if (sessionErr) {
    console.error("Session upsert failed:", sessionErr);
    return corsError(`Kunde inte spara import-session: ${sessionErr.message}`, 500);
  }

  return corsJson({
    success: true,
    sessionId: session?.id,
    status,
    duplicate: existing && existing.status === "committed" ? { previousImportAt: existing.created_at } : null,
    company: { fileOrgNumber: doc.header.orgNumber, fileCompanyName: doc.header.companyName, expectedOrgNumber: company?.org_number, expectedCompanyName: company?.name },
    parsedSummary,
    validation,
    mappings,
    mappingSummary,
  });
}

async function actionRemap(req: Request, supabaseUrl: string, anonKey: string, serviceKey: string) {
  const auth = req.headers.get("Authorization");
  if (!auth) return corsError("Unauthorized", 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return corsError("Inte inloggad", 401);

  const body = await req.json();
  const sessionId: string = body.sessionId;
  const accountNumber: string = body.accountNumber;
  const mappedRowCode: string = body.mappedRowCode;

  if (!sessionId || !accountNumber || !mappedRowCode) {
    return corsError("sessionId, accountNumber och mappedRowCode krävs", 400);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: session } = await admin
    .from("sie_import_sessions")
    .select("id, company_id, mapping_summary")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return corsError("Session hittades inte", 404);

  const { data: memberCheck } = await admin.rpc("is_company_member", {
    _user_id: user.id, _company_id: session.company_id,
  });
  if (!memberCheck) return corsError("Åtkomst nekad", 403);

  const { data: row } = await admin
    .from("report_rows")
    .select("id, code, label")
    .eq("code", mappedRowCode)
    .maybeSingle();

  const summary = (session.mapping_summary as any) ?? { mappings: [] };
  const mappings: MappingRow[] = Array.isArray(summary.mappings) ? summary.mappings : [];
  const idx = mappings.findIndex((m) => m.account_number === accountNumber);
  const accountName = idx >= 0 ? mappings[idx].account_name : "";

  const updated: MappingRow = {
    account_number: accountNumber,
    account_name: accountName,
    mapped_row_code: mappedRowCode,
    mapped_row_id: row?.id ?? null,
    confidence: 1,
    source: "user",
    reason: "Manuell mappning",
  };
  if (idx >= 0) mappings[idx] = updated;
  else mappings.push(updated);

  // Recompute summary counts
  const newSummary = {
    total: mappings.length,
    auto: mappings.filter((m) => m.confidence >= 0.9).length,
    review: mappings.filter((m) => m.confidence > 0 && m.confidence < 0.9).length,
    manual: mappings.filter((m) => m.confidence === 0).length,
    mappings,
  };

  await admin
    .from("sie_import_sessions")
    .update({ mapping_summary: newSummary })
    .eq("id", sessionId);

  await admin.from("sie_account_mapping_history").insert({
    company_id: session.company_id,
    account_number: accountNumber,
    account_name: accountName,
    mapped_row_code: mappedRowCode,
    mapped_row_id: row?.id ?? null,
    confidence: 1,
    source: "user",
    reason: "Manuell mappning via preview",
    session_id: sessionId,
    created_by: user.id,
  });

  return corsJson({ success: true, mapping: updated });
}

async function actionCommit(req: Request, supabaseUrl: string, anonKey: string, serviceKey: string) {
  const auth = req.headers.get("Authorization");
  if (!auth) return corsError("Unauthorized", 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return corsError("Inte inloggad", 401);

  const body = await req.json();
  const sessionId: string = body.sessionId;
  const fileContentBase64: string | undefined = body.fileContentBase64;
  const fileContent: string | undefined = body.fileContent;

  if (!sessionId) return corsError("sessionId krävs", 400);
  if (!fileContentBase64 && !fileContent) return corsError("Filinnehåll krävs för commit", 400);

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: session } = await admin
    .from("sie_import_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return corsError("Session hittades inte", 404);
  if (session.status === "committed" && !session.error_message) {
    return corsJson({
      success: true,
      sessionId: session.id,
      alreadyImported: true,
      message: "Filen är redan importerad.",
      summary: { accounts: 0, verifications: 0, transactionLines: 0, balances: 0, mappings: 0, skipped: true },
    });
  }
  if (!["previewed", "failed"].includes(session.status)) {
    return corsError(`Session måste vara 'previewed' för commit (status: ${session.status})`, 400);
  }

  const { data: memberCheck } = await admin.rpc("is_company_member", {
    _user_id: user.id, _company_id: session.company_id,
  });
  if (!memberCheck) return corsError("Åtkomst nekad", 403);

  // Re-parse to get full doc (avoid storing huge file in DB)
  let bytes: Uint8Array;
  if (fileContentBase64) {
    const bin = atob(fileContentBase64);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } else {
    bytes = new TextEncoder().encode(fileContent!);
  }
  const reHash = await sha256Hex(bytes);
  if (reHash !== session.file_hash) {
    return corsError("Filen matchar inte session-hash — ladda upp samma fil igen.", 400);
  }
  const { text, encoding } = decodeSIEBytes(bytes);
  const doc = parseSIE(text, encoding);

  const errors: string[] = [];
  let importedAccounts = 0;
  let importedTransactions = 0;
  let importedBalances = 0;
  let importedVerifications = 0;
  let skippedVerifications = 0;

  const { error: cleanupErr } = await admin.rpc("cleanup_orphaned_sie_import_entries", {
    _company_id: session.company_id,
  });
  if (cleanupErr) {
    const message = formatDbError("Kunde inte städa tidigare misslyckade SIE-importer", cleanupErr);
    return corsJson({ success: false, error: message, summary: { errors: [message], failedRows: 1, succeededRows: 0 } });
  }

  // 1) Insert chart of accounts
  if (doc.accounts.length > 0) {
    const rows = doc.accounts.map((a) => {
      const n = parseInt(a.number, 10);
      let type = "other";
      if (n >= 1000 && n < 2000) type = "assets";
      else if (n >= 2000 && n < 3000) type = "liabilities";
      else if (n >= 3000 && n < 4000) type = "revenue";
      else if (n >= 4000 && n < 8000) type = "expenses";
      else if (n >= 8000 && n < 9000) type = "financial";
      return {
        company_id: session.company_id,
        account_number: a.number,
        account_name: a.name || `Konto ${a.number}`,
        account_type: type,
        is_active: true,
      };
    });
    for (let i = 0; i < rows.length; i += 200) {
      const batch = rows.slice(i, i + 200);
      const { error } = await admin.from("chart_of_accounts").upsert(batch, {
        onConflict: "company_id,account_number",
        ignoreDuplicates: false,
      });
      if (error && !error.message.includes("duplicate")) errors.push(`Kontofel: ${error.message}`);
      else importedAccounts += batch.length;
    }
  }

  // 2) Build account lookup
  const { data: accountRows } = await admin
    .from("chart_of_accounts")
    .select("id, account_number")
    .eq("company_id", session.company_id);
  const accountMap = new Map<string, string>();
  for (const a of (accountRows ?? []) as any[]) accountMap.set(a.account_number, a.id);

  // 3) Current year IB — persist as opening balances, not as extra journal entries.
  const fy0 = doc.header.fiscalYears?.find((y) => y.index === 0);
  const currentYearIB = doc.balances.ib.filter((b) => b.yearIndex === 0);
  if (currentYearIB.length > 0) {
    const fyStart = fy0 ? sieToISO(fy0.start) : `${new Date().getFullYear()}-01-01`;
    const accountNames = new Map(doc.accounts.map((a) => [a.number, a.name]));
    const ibRows = currentYearIB.map((b) => ({
      company_id: session.company_id,
      transition_date: fyStart,
      account_code: b.accountNumber,
      account_name: accountNames.get(b.accountNumber) ?? `Konto ${b.accountNumber}`,
      balance: Math.abs(b.amount),
      balance_type: b.amount >= 0 ? "debit" : "credit",
    }));
    for (let i = 0; i < ibRows.length; i += 200) {
      const batch = ibRows.slice(i, i + 200);
      const { error } = await admin.from("opening_balances").upsert(batch, {
        onConflict: "company_id,transition_date,account_code",
        ignoreDuplicates: false,
      });
      if (error) errors.push(formatDbError("IB-rader", error));
      else importedBalances += batch.length;
    }
  }

  // 4) Verifications — header + lines are committed atomically by DB RPC.
  for (const ver of doc.verifications) {
    const totalDebit = ver.transactions.reduce((s, l) => s + (l.amount >= 0 ? l.amount : 0), 0);
    const totalCredit = ver.transactions.reduce((s, l) => s + (l.amount < 0 ? Math.abs(l.amount) : 0), 0);
    const balanced = Math.abs(totalDebit - totalCredit) < 0.01;
    const entryDate = sieToISO(ver.date);
    const desc = (ver.text ?? `Verifikation ${ver.series}${ver.number}`).substring(0, 255);

    const missingAccounts = ver.transactions
      .map((l) => l.accountNumber)
      .filter((accountNumber) => !accountMap.has(accountNumber));
    if (missingAccounts.length > 0) {
      errors.push(`VER ${ver.series}${ver.number}: saknar konto ${Array.from(new Set(missingAccounts)).join(", ")}`);
      break;
    }

    const entryLines: ImportLinePayload[] = ver.transactions.map((l) => ({
      account_id: accountMap.get(l.accountNumber)!,
      debit: l.amount >= 0 ? Math.abs(l.amount) : 0,
      credit: l.amount < 0 ? Math.abs(l.amount) : 0,
      vat_code: null,
      vat_amount: 0,
      dimension: dimensionsToText(l.dimensions),
      description: (l.text ?? desc ?? null)?.substring(0, 255) ?? null,
    }));


    if (entryLines.length < 2) {
      errors.push(`VER ${ver.series}${ver.number}: saknar tillräckligt många konteringsrader (${entryLines.length})`);
      break;
    }

    const journalNumber = `${ver.series || ""}${ver.number || ""}` || null;
    const { data: rpcResult, error: rpcErr } = await admin.rpc("import_sie_journal_entry", {
      _company_id: session.company_id,
      _entry_date: entryDate,
      _description: desc,
      _created_by: user.id,
      _series_code: ver.series || "A",
      _series_number: numericVerificationNumber(ver.number),
      _journal_number: journalNumber,
      _session_id: session.id,
      _lines: entryLines,
      _approved: balanced,
    });
    if (rpcErr) {
      errors.push(formatDbError(`VER ${ver.series}${ver.number} rader`, rpcErr));
      break;
    }

    const result = rpcResult as { status?: string; line_count?: number } | null;
    if (result?.status === "skipped") skippedVerifications++;
    else {
      importedVerifications++;
      importedTransactions += result?.line_count ?? entryLines.length;
    }
  }

  if (errors.length > 0) {
    await admin.from("journal_entries").delete().eq("import_session_id", session.id);
    await admin
      .from("sie_import_sessions")
      .update({ status: "failed", error_message: errors.slice(0, 20).join("; ") })
      .eq("id", session.id);
    return corsJson({
      success: false,
      sessionId: session.id,
      error: `Importen avbröts: ${errors[0]}`,
      summary: {
        accounts: importedAccounts,
        verifications: importedVerifications,
        transactionLines: importedTransactions,
        balances: importedBalances,
        failedRows: errors.length,
        succeededRows: importedTransactions + importedBalances,
        errors: errors.slice(0, 10),
      },
    });
  }

  // 5) UPSERT account_mappings (Phase 1) from previewed mapping_summary
  const summary = (session.mapping_summary as any) ?? {};
  const mappings: MappingRow[] = Array.isArray(summary.mappings) ? summary.mappings : [];
  let mappingsWritten = 0;
  for (const m of mappings) {
    if (!m.mapped_row_id || !m.mapped_row_code) continue;
    const { error } = await admin.from("account_mappings").upsert(
      {
        row_id: m.mapped_row_id,
        account_from: m.account_number,
        account_to: m.account_number,
        company_scope: "company",
        tenant_id: session.company_id,
        mapping_type: "actual",
        is_active: true,
      },
      { onConflict: "row_id,account_from,account_to,tenant_id" },
    );
    if (!error) mappingsWritten++;

    // Persist to history
    await admin.from("sie_account_mapping_history").insert({
      company_id: session.company_id,
      account_number: m.account_number,
      account_name: m.account_name,
      mapped_row_code: m.mapped_row_code,
      mapped_row_id: m.mapped_row_id,
      confidence: m.confidence,
      source: m.source === "unmapped" ? "ai" : (m.source as any),
      reason: m.reason,
      session_id: session.id,
      created_by: user.id,
    });
  }

  // 6) Mark committed
  await admin
    .from("sie_import_sessions")
    .update({
      status: "committed",
      committed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", session.id);

  // 7) Trigger materialization (best-effort, async)
  try {
    await fetch(`${supabaseUrl}/functions/v1/materialize-financial-values`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
        apikey: anonKey,
      },
      body: JSON.stringify({
        companyId: session.company_id,
        periodId: session.fiscal_year_start ?? new Date().toISOString().slice(0, 10),
        templateId: "RR_K2",
        force: true,
      }),
    });
  } catch (e) {
    console.warn("Materialize trigger failed (non-blocking):", e);
  }

  return corsJson({
    success: true,
    sessionId: session.id,
    summary: {
      accounts: importedAccounts,
      verifications: importedVerifications,
      transactionLines: importedTransactions,
      balances: importedBalances,
      mappings: mappingsWritten,
      skippedVerifications,
      alreadyImported: importedVerifications === 0 && skippedVerifications === doc.verifications.length,
      message: importedVerifications === 0 && skippedVerifications === doc.verifications.length ? "Filen är redan importerad." : undefined,
    },
  });
}

serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Allow ?action=… or body.action
    const url = new URL(req.url);
    const queryAction = url.searchParams.get("action");
    let action = queryAction ?? "";

    // Need to peek body without consuming twice — clone
    const bodyText = await req.text();
    let bodyJson: any = {};
    try { bodyJson = bodyText ? JSON.parse(bodyText) : {}; } catch { bodyJson = {}; }
    if (!action) action = bodyJson.action ?? "parse";

    // Re-create request with body for downstream
    const newReq = new Request(req.url, {
      method: req.method,
      headers: req.headers,
      body: bodyText,
    });

    if (action === "parse") return await actionParse(newReq, supabaseUrl, anonKey, serviceKey);
    if (action === "commit") return await actionCommit(newReq, supabaseUrl, anonKey, serviceKey);
    if (action === "remap") return await actionRemap(newReq, supabaseUrl, anonKey, serviceKey);

    return corsError(`Okänd action: ${action}`, 400);
  } catch (error) {
    console.error("import-sie4 error:", error);
    return corsError(error instanceof Error ? error.message : "Import misslyckades", 500);
  }
});
