import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type MtlsEnvironment = "production" | "test";

export interface MtlsCredentials {
  certPem: string;
  keyPem: string;
  source: string;
  environment: MtlsEnvironment;
}

function normalizeMtlsEnvironment(environment?: string): MtlsEnvironment {
  return environment === "test" ? "test" : "production";
}

function getFirstDefinedEnv(names: string[]): string | null {
  for (const name of names) {
    const value = Deno.env.get(name);
    if (value) return value;
  }
  return null;
}

function getPemSecretCandidates(environment: MtlsEnvironment) {
  if (environment === "test") {
    return {
      cert: ["SKV_TEST_CERT", "SKATTEVERKET_TEST_CERT_PEM_B64", "SKV_TEST_CERT_PEM"],
      key: ["SKV_TEST_KEY", "SKATTEVERKET_TEST_KEY_PEM_B64", "SKV_TEST_KEY_PEM"],
    };
  }

  return {
    cert: ["SKV_CERT", "SKATTEVERKET_CERT_PEM_B64_V2", "SKATTEVERKET_CERT_PEM_B64"],
    key: ["SKV_KEY", "SKATTEVERKET_KEY_PEM_B64_V2", "SKATTEVERKET_KEY_PEM_B64"],
  };
}

function getP12Config(environment: MtlsEnvironment) {
  if (environment === "test") {
    return {
      passwordEnvName: "SKV_TEST_CERT_PASSWORD",
      storagePath: "skatteverket/test-cert.p12",
    };
  }

  return {
    passwordEnvName: "SKATTEVERKET_CERT_PASSWORD",
    storagePath: "skatteverket/cert.p12",
  };
}

function decodePemValue(raw: string, expectedType: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith(`-----BEGIN ${expectedType}-----`)) return trimmed;
  try {
    const decoded = atob(trimmed);
    if (decoded.startsWith(`-----BEGIN ${expectedType}-----`)) return decoded;
  } catch {
    /* ignore */
  }
  try {
    const cleaned = trimmed.replace(/[^A-Za-z0-9+/=]/g, "");
    const decoded = atob(cleaned);
    if (decoded.startsWith(`-----BEGIN ${expectedType}-----`)) return decoded;
  } catch {
    /* ignore */
  }
  throw new Error(
    `Secret is not valid ${expectedType} PEM. Got ${trimmed.length} chars starting with "${trimmed.substring(0, 24)}..."`,
  );
}

async function convertP12ToPem(
  p12Bytes: Uint8Array,
  password: string,
): Promise<{ certPem: string; keyPem: string }> {
  const forge = (await import("https://esm.sh/node-forge@1.3.1")).default;

  let binaryStr = "";
  for (let i = 0; i < p12Bytes.length; i++) {
    binaryStr += String.fromCharCode(p12Bytes[i]);
  }

  const p12Asn1 = forge.asn1.fromDer(binaryStr);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certs = certBags[forge.pki.oids.certBag] || [];
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const keys = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag] || [];

  if (certs.length === 0) throw new Error("No certificates found in P12");
  if (keys.length === 0) throw new Error("No private keys found in P12");

  const certPemParts: string[] = [];
  for (const bag of certs) {
    if (bag.cert) certPemParts.push(forge.pki.certificateToPem(bag.cert));
  }

  return {
    certPem: certPemParts.join("\n"),
    keyPem: forge.pki.privateKeyToPem(keys[0].key),
  };
}

/**
 * Resolve mTLS credentials for the requested environment.
 * Priority:
 * 1. Environment-specific PEM secrets
 * 2. P12 file from storage + matching password secret
 */
export async function resolveMtlsCredentials(environment?: string): Promise<MtlsCredentials> {
  const normalizedEnvironment = normalizeMtlsEnvironment(environment);
  const pemCandidates = getPemSecretCandidates(normalizedEnvironment);

  const certRaw = getFirstDefinedEnv(pemCandidates.cert);
  const keyRaw = getFirstDefinedEnv(pemCandidates.key);

  if (certRaw && keyRaw) {
    try {
      return {
        certPem: decodePemValue(certRaw, "CERTIFICATE"),
        keyPem: decodePemValue(keyRaw, "PRIVATE KEY"),
        source: `pem-secrets-${normalizedEnvironment}`,
        environment: normalizedEnvironment,
      };
    } catch (e) {
      console.warn(`PEM secrets invalid for ${normalizedEnvironment}, trying P12 fallback:`, e);
    }
  }

  const p12Config = getP12Config(normalizedEnvironment);
  const password = Deno.env.get(p12Config.passwordEnvName);
  if (!password) {
    throw new Error(`${p12Config.passwordEnvName} not set`);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: fileData, error: fileError } = await supabase.storage
    .from("certificates")
    .download(p12Config.storagePath);

  if (fileError || !fileData) {
    throw new Error(
      `Could not download P12 from storage (${p12Config.storagePath}): ${fileError?.message || "no data"}`,
    );
  }

  console.log(`Downloaded ${normalizedEnvironment} P12 from storage, size:`, fileData.size);
  const p12Bytes = new Uint8Array(await fileData.arrayBuffer());
  const { certPem, keyPem } = await convertP12ToPem(p12Bytes, password);
  console.log(`P12 converted successfully from storage for ${normalizedEnvironment}`);

  return {
    certPem,
    keyPem,
    source: `storage-p12-${normalizedEnvironment}`,
    environment: normalizedEnvironment,
  };
}

/**
 * Create Deno HTTP client with mTLS.
 * NOTE: Deno Edge Runtime may not actually send the client cert.
 * Use requestMtlsToken() / requestMtlsApi() via the external proxy instead.
 */
export async function createMtlsHttpClient(environment?: string) {
  const credentials = await resolveMtlsCredentials(environment);
  const client = Deno.createHttpClient({
    cert: credentials.certPem,
    key: credentials.keyPem,
  });
  return { client, credentials };
}

/**
 * Request an OAuth token via the external mTLS proxy.
 * The proxy now receives the resolved certificate per request, which keeps
 * test and production certificates aligned with backend storage/secrets.
 */
export async function requestMtlsToken(params: {
  client_id: string;
  client_secret: string;
  scope?: string;
  environment?: string;
}): Promise<{ access_token: string; expires_in: number; [key: string]: unknown }> {
  const proxyUrl = Deno.env.get("MTLS_PROXY_URL");
  const proxySecret = Deno.env.get("MTLS_PROXY_SECRET");

  if (!proxyUrl || !proxySecret) {
    throw new Error(
      "MTLS_PROXY_URL and MTLS_PROXY_SECRET must be configured. " +
        "Deploy the mTLS proxy (see mtls-proxy/README.md) and add these secrets.",
    );
  }

  const environment = normalizeMtlsEnvironment(params.environment);
  const credentials = await resolveMtlsCredentials(environment);

  const response = await fetch(`${proxyUrl}/skv/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-proxy-secret": proxySecret,
    },
    body: JSON.stringify({
      client_id: params.client_id,
      client_secret: params.client_secret,
      scope: params.scope || "agd agdredovisningperiod",
      environment,
      certPem: credentials.certPem,
      keyPem: credentials.keyPem,
      certSource: credentials.source,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`mTLS proxy error (${response.status}): ${error}`);
  }

  return await response.json();
}

function inferMtlsEnvironmentFromUrl(url: string): MtlsEnvironment {
  return url.includes("api-test.skatteverket.se") || url.includes("sysorgoauth2.test.skatteverket.se")
    ? "test"
    : "production";
}

/**
 * Make an arbitrary mTLS API call via the external proxy.
 */
export async function requestMtlsApi(params: {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string | Record<string, unknown>;
  environment?: string;
}): Promise<{ status: number; data: unknown }> {
  const proxyUrl = Deno.env.get("MTLS_PROXY_URL");
  const proxySecret = Deno.env.get("MTLS_PROXY_SECRET");

  if (!proxyUrl || !proxySecret) {
    throw new Error("MTLS_PROXY_URL and MTLS_PROXY_SECRET must be configured.");
  }

  const environment = normalizeMtlsEnvironment(params.environment || inferMtlsEnvironmentFromUrl(params.url));
  const credentials = await resolveMtlsCredentials(environment);

  const response = await fetch(`${proxyUrl}/skv/api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-proxy-secret": proxySecret,
    },
    body: JSON.stringify({
      ...params,
      environment,
      certPem: credentials.certPem,
      keyPem: credentials.keyPem,
      certSource: credentials.source,
    }),
  });

  return {
    status: response.status,
    data: await response.json(),
  };
}
