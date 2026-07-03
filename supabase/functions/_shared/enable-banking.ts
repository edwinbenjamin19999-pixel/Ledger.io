/**
 * Enable Banking API helper.
 * 
 * Handles JWT signing for authentication with Enable Banking AISP API.
 * Reads credentials from system_secrets table first, with env var fallback.
 * 
 * API docs: https://enablebanking.com/docs/api/
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EB_API_BASE = "https://api.enablebanking.com";

/**
 * Wrap a PKCS#1 RSAPrivateKey DER buffer in a PKCS#8 PrivateKeyInfo envelope.
 * WebCrypto's importKey only accepts pkcs8, but Enable Banking distributes
 * keys in PKCS#1 format (-----BEGIN RSA PRIVATE KEY-----).
 */
function pkcs1ToPkcs8(pkcs1: Uint8Array): Uint8Array {
  // PKCS#8 PrivateKeyInfo:
  //   SEQUENCE {
  //     INTEGER 0 (version)
  //     SEQUENCE { OID rsaEncryption, NULL }   -- AlgorithmIdentifier
  //     OCTET STRING { <pkcs1 bytes> }          -- privateKey
  //   }
  const rsaOid = new Uint8Array([
    0x30, 0x0d, // SEQUENCE (13 bytes)
    0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, // OID 1.2.840.113549.1.1.1
    0x05, 0x00, // NULL
  ]);
  const version = new Uint8Array([0x02, 0x01, 0x00]); // INTEGER 0

  const encodeLength = (len: number): Uint8Array => {
    if (len < 0x80) return new Uint8Array([len]);
    if (len < 0x100) return new Uint8Array([0x81, len]);
    if (len < 0x10000) return new Uint8Array([0x82, (len >> 8) & 0xff, len & 0xff]);
    return new Uint8Array([0x83, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff]);
  };

  const octetHeader = new Uint8Array([0x04, ...encodeLength(pkcs1.length)]);
  const innerLen = version.length + rsaOid.length + octetHeader.length + pkcs1.length;
  const seqHeader = new Uint8Array([0x30, ...encodeLength(innerLen)]);

  const out = new Uint8Array(seqHeader.length + innerLen);
  let off = 0;
  out.set(seqHeader, off); off += seqHeader.length;
  out.set(version, off); off += version.length;
  out.set(rsaOid, off); off += rsaOid.length;
  out.set(octetHeader, off); off += octetHeader.length;
  out.set(pkcs1, off);
  return out;
}

function readDerLength(bytes: Uint8Array, offset: number): { length: number; nextOffset: number } {
  const first = bytes[offset];
  if (first === undefined) throw new Error("Invalid DER: missing length byte");
  if ((first & 0x80) === 0) {
    return { length: first, nextOffset: offset + 1 };
  }

  const byteCount = first & 0x7f;
  if (byteCount === 0 || byteCount > 4) {
    throw new Error(`Invalid DER: unsupported length encoding (${byteCount})`);
  }

  let length = 0;
  for (let i = 0; i < byteCount; i += 1) {
    const value = bytes[offset + 1 + i];
    if (value === undefined) throw new Error("Invalid DER: truncated length");
    length = (length << 8) | value;
  }

  return { length, nextOffset: offset + 1 + byteCount };
}

function guessPrivateKeyFormat(bytes: Uint8Array): "pkcs1" | "pkcs8" | "unknown" {
  try {
    if (bytes[0] !== 0x30) return "unknown";
    const outer = readDerLength(bytes, 1);
    let offset = outer.nextOffset;

    if (bytes[offset] !== 0x02) return "unknown";
    const version = readDerLength(bytes, offset + 1);
    offset = version.nextOffset + version.length;

    const nextTag = bytes[offset];
    if (nextTag === 0x30) return "pkcs8";
    if (nextTag === 0x02) return "pkcs1";
    return "unknown";
  } catch {
    return "unknown";
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/**
 * Import RSA private key from PEM string (PKCS#1 or PKCS#8) for signing JWTs.
 * Supports both PEM-wrapped keys and raw base64-encoded DER blobs.
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const normalized = pem.trim().replace(/\\n/g, "\n");
  const hasPemWrapper = normalized.includes("-----BEGIN");
  const hasPkcs1Header = /-----BEGIN RSA PRIVATE KEY-----/.test(normalized);
  const hasPkcs8Header = /-----BEGIN PRIVATE KEY-----/.test(normalized);

  const base64Contents = hasPemWrapper
    ? normalized
        .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/g, "")
        .replace(/-----END (RSA )?PRIVATE KEY-----/g, "")
        .replace(/\s/g, "")
    : normalized.replace(/\s/g, "");

  const binaryDer = Uint8Array.from(atob(base64Contents), (c) => c.charCodeAt(0));
  const detectedFormat = hasPkcs1Header
    ? "pkcs1"
    : hasPkcs8Header
      ? "pkcs8"
      : guessPrivateKeyFormat(binaryDer);

  const candidates: Uint8Array[] = [];
  const pushCandidate = (candidate: Uint8Array) => {
    if (!candidates.some((existing) => existing.length === candidate.length && existing.every((b, i) => b === candidate[i]))) {
      candidates.push(candidate);
    }
  };

  if (detectedFormat === "pkcs1") {
    pushCandidate(pkcs1ToPkcs8(binaryDer));
  } else if (detectedFormat === "pkcs8") {
    pushCandidate(binaryDer);
  } else {
    pushCandidate(binaryDer);
    pushCandidate(pkcs1ToPkcs8(binaryDer));
  }

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return await crypto.subtle.importKey(
        "pkcs8",
        toArrayBuffer(candidate),
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
      );
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Failed to import Enable Banking private key (detected format: ${detectedFormat}${hasPemWrapper ? ", pem" : ", base64-der"}). ${lastError instanceof Error ? lastError.message : "Unknown import error."}`
  );
}

/**
 * Create a signed JWT for Enable Banking API authentication.
 */
async function createJWT(applicationId: string, privateKey: CryptoKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT", kid: applicationId };
  const payload = {
    iss: "enablebanking.com",
    aud: "api.enablebanking.com",
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const signingInput = `${headerB64}.${payloadB64}`;

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${signingInput}.${signatureB64}`;
}

type EnableBankingCredential = {
  applicationId: string;
  privateKeyPem: string;
  source: "environment" | "system_secrets";
};

/**
 * Load the single active Enable Banking credential set.
 *
 * We intentionally use exactly one application at a time. The currently valid
 * production pair in this project lives in system_secrets, while the backend
 * environment pair is stale and returns "Wrong signature".
 */
async function loadActiveCredential(): Promise<EnableBankingCredential> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: secrets } = await supabase
      .from("system_secrets")
      .select("key, value_encrypted")
      .in("key", ["enable_banking_application_id", "enable_banking_private_key"]);

    if (secrets && secrets.length === 2) {
      const appId = secrets.find((s: any) => s.key === "enable_banking_application_id")?.value_encrypted;
      const pem = secrets.find((s: any) => s.key === "enable_banking_private_key")?.value_encrypted;

      if (appId && pem) {
        console.warn("Enable Banking credentials loaded from system_secrets");
        return { applicationId: appId, privateKeyPem: pem, source: "system_secrets" };
      }
    }
  } catch (e) {
    console.warn("Could not read system_secrets:", e);
  }

  const applicationId = Deno.env.get("ENABLE_BANKING_APPLICATION_ID");
  const privateKeyPem = Deno.env.get("ENABLE_BANKING_PRIVATE_KEY");

  if (applicationId && privateKeyPem) {
    console.log("Enable Banking credentials loaded from environment variables fallback");
    return { applicationId, privateKeyPem, source: "environment" };
  }

  throw new Error(
    "Enable Banking credentials not configured. Add ENABLE_BANKING_APPLICATION_ID and ENABLE_BANKING_PRIVATE_KEY to the backend environment."
  );
}

/**
 * Get an authenticated JWT token for Enable Banking API calls.
 */
export async function getEnableBankingToken(credentials?: Pick<EnableBankingCredential, "applicationId" | "privateKeyPem">): Promise<string> {
  const credential = credentials ?? (await loadActiveCredential());
  const privateKey = await importPrivateKey(credential.privateKeyPem);
  return await createJWT(credential.applicationId, privateKey);
}

/**
 * Make an authenticated request to the Enable Banking API.
 */
export async function ebFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const credential = await loadActiveCredential();
  const token = await getEnableBankingToken(credential);

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${EB_API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    const errorPreview = await response.clone().text();
    console.error(`Enable Banking rejected ${credential.source} credentials:`, errorPreview);
  }

  return response;
}

/**
 * Start an authorization session. Redirects user to bank login.
 */
export async function startAuth(params: {
  aspspId: string;
  aspspCountry: string;
  redirectUrl: string;
  companyId: string;
  psuType?: string;
  authMethod?: string;
}): Promise<{ url: string }> {
  const validUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const response = await ebFetch("/auth", {
    method: "POST",
    body: JSON.stringify({
      access: {
        valid_until: validUntil,
      },
      aspsp: {
        name: params.aspspId,
        country: params.aspspCountry,
      },
      state: params.companyId,
      redirect_url: params.redirectUrl,
      psu_type: params.psuType || "business",
      ...(params.authMethod ? { auth_method: params.authMethod } : {}),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Enable Banking auth error:", errorText);
    throw new Error(`Failed to start bank authorization: ${response.status}`);
  }

  return await response.json();
}

/**
 * Create a session after successful bank authorization.
 */
export async function createSession(code: string): Promise<{
  session_id: string;
  accounts: Array<{
    uid: string;
    account_id: { iban: string };
    name?: string;
    currency?: string;
    institution_name?: string;
  }>;
}> {
  const response = await ebFetch("/sessions", {
    method: "POST",
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Enable Banking session error:", errorText);
    throw new Error(`Failed to create bank session: ${response.status}`);
  }

  return await response.json();
}

/**
 * Fetch transactions for an account.
 */
export async function getTransactions(
  accountUid: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{
  transactions: Array<{
    entry_reference?: string;
    transaction_id?: string;
    booking_date: string;
    value_date?: string;
    transaction_amount: { amount: string; currency: string };
    creditor_name?: string;
    debtor_name?: string;
    creditor_account?: { iban?: string };
    debtor_account?: { iban?: string };
    remittance_information?: string[];
    additional_information?: string;
  }>;
  continuation_key?: string;
}> {
  const params = new URLSearchParams();
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo) params.set("date_to", dateTo);
  const qs = params.toString() ? `?${params.toString()}` : "";

  const response = await ebFetch(`/accounts/${accountUid}/transactions${qs}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Enable Banking transactions error:", errorText);
    throw new Error(`Failed to fetch transactions: ${response.status}`);
  }

  return await response.json();
}

/**
 * Fetch balances for an account.
 */
export async function getBalances(accountUid: string): Promise<{
  balances: Array<{
    balance_amount: { amount: string; currency: string };
    balance_type: string;
  }>;
}> {
  const response = await ebFetch(`/accounts/${accountUid}/balances`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Enable Banking balances error:", errorText);
    throw new Error(`Failed to fetch balances: ${response.status}`);
  }

  return await response.json();
}

export { EB_API_BASE };
