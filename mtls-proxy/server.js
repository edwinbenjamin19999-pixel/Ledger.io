const express = require('express');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const https = require('https');
const dns = require('dns');

const app = express();
app.use(express.json({ limit: '1mb' }));

const PROXY_SECRET = process.env.PROXY_SECRET;

function decodePem(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith('-----BEGIN')) return trimmed;

  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf-8');
    if (decoded.startsWith('-----BEGIN')) return decoded;
  } catch {
    /* ignore */
  }

  return trimmed;
}

function writeStaticCertFiles(prefix, certRaw, keyRaw) {
  const certPem = decodePem(certRaw);
  const keyPem = decodePem(keyRaw);

  if (!certPem || !keyPem) return null;

  const certPath = `/tmp/${prefix}-cert.pem`;
  const keyPath = `/tmp/${prefix}-key.pem`;
  fs.writeFileSync(certPath, certPem);
  fs.writeFileSync(keyPath, keyPem);

  return { certPath, keyPath, tempDir: null, source: `env:${prefix}` };
}

const PROD_CERT_FILES = writeStaticCertFiles(
  'skv-prod',
  process.env.SKV_PROD_CERT_PEM,
  process.env.SKV_PROD_KEY_PEM,
);
const TEST_CERT_FILES = writeStaticCertFiles(
  'skv-test',
  process.env.SKV_TEST_CERT_PEM,
  process.env.SKV_TEST_KEY_PEM,
);
const LEGACY_CERT_FILES = writeStaticCertFiles(
  'skv-legacy',
  process.env.SKV_CERT_PEM,
  process.env.SKV_KEY_PEM,
);

if (PROD_CERT_FILES || TEST_CERT_FILES || LEGACY_CERT_FILES) {
  console.log('Static certificates loaded', {
    production: Boolean(PROD_CERT_FILES),
    test: Boolean(TEST_CERT_FILES),
    legacy: Boolean(LEGACY_CERT_FILES),
  });
} else {
  console.log('No static certificates loaded; expecting per-request certificate forwarding');
}

function authenticate(req, res, next) {
  const auth = req.headers['x-proxy-secret'];
  if (!PROXY_SECRET || auth !== PROXY_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function createRequestCertFiles(certPemRaw, keyPemRaw) {
  const certPem = decodePem(certPemRaw);
  const keyPem = decodePem(keyPemRaw);

  if (!certPem || !keyPem) {
    throw new Error('Both certPem and keyPem are required when using request certificates');
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skv-mtls-'));
  const certPath = path.join(tempDir, 'cert.pem');
  const keyPath = path.join(tempDir, 'key.pem');

  fs.writeFileSync(certPath, certPem);
  fs.writeFileSync(keyPath, keyPem);

  return { certPath, keyPath, tempDir, source: 'request-body' };
}

function cleanupRequestCertFiles(certFiles) {
  if (certFiles?.tempDir) {
    fs.rmSync(certFiles.tempDir, { recursive: true, force: true });
  }
}

function resolveCertFiles({ environment, certPem, keyPem }) {
  if ((certPem && !keyPem) || (!certPem && keyPem)) {
    throw new Error('certPem and keyPem must be provided together');
  }

  if (certPem && keyPem) {
    return createRequestCertFiles(certPem, keyPem);
  }

  if (environment === 'test' && TEST_CERT_FILES) return TEST_CERT_FILES;
  if (environment === 'production' && PROD_CERT_FILES) return PROD_CERT_FILES;
  if (LEGACY_CERT_FILES) return LEGACY_CERT_FILES;

  return null;
}

function parseCurlResponse(output) {
  const trimmed = output.trim();
  const lines = trimmed.split('\n');
  const statusCode = parseInt(lines[lines.length - 1], 10);
  const body = lines.slice(0, -1).join('\n');

  let parsed;
  try {
    parsed = body ? JSON.parse(body) : {};
  } catch {
    parsed = { raw: body };
  }

  return {
    statusCode: Number.isFinite(statusCode) ? statusCode : 500,
    body,
    parsed,
  };
}

function runCurl(args) {
  const result = spawnSync('curl', args, {
    timeout: 30000,
    encoding: 'utf-8',
  });

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `curl exited with status ${result.status}`);
  }

  return result.stdout;
}

function performMtlsRequest({ certFiles, url, method = 'GET', headers = {}, body }) {
  const curlArgs = [
    '-s',
    '-w',
    '\\n%{http_code}',
    '--cert',
    certFiles.certPath,
    '--key',
    certFiles.keyPath,
    '-X',
    method,
  ];

  for (const [headerName, headerValue] of Object.entries(headers)) {
    curlArgs.push('-H', `${headerName}: ${headerValue}`);
  }

  if (body !== undefined && body !== null) {
    curlArgs.push('-d', typeof body === 'string' ? body : JSON.stringify(body));
  }

  curlArgs.push(url);

  return parseCurlResponse(runCurl(curlArgs));
}

function isAllowedSkatteverketUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && /(^|\.)skatteverket\.se$/i.test(parsed.hostname);
  } catch {
    return false;
  }
}

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    static_certs_loaded: {
      production: Boolean(PROD_CERT_FILES),
      test: Boolean(TEST_CERT_FILES),
      legacy: Boolean(LEGACY_CERT_FILES),
    },
    request_cert_support: true,
    timestamp: new Date().toISOString(),
  });
});

app.post('/skv/oauth/token', authenticate, async (req, res) => {
  let certFiles = null;

  try {
    const { client_id, client_secret, scope, environment = 'production', certPem, keyPem } = req.body;

    if (!client_id || !client_secret) {
      return res.status(400).json({ error: 'client_id and client_secret required' });
    }

    certFiles = resolveCertFiles({ environment, certPem, keyPem });
    if (!certFiles) {
      return res.status(500).json({ error: 'Certificates not configured' });
    }

    const tokenUrl = environment === 'test'
      ? 'https://sysorgoauth2.test.skatteverket.se/oauth2/v1/sysorg/token'
      : 'https://sysorgoauth2.skatteverket.se/oauth2/v1/sysorg/token';

    const bodyParams = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id,
      client_secret,
    });
    if (scope) bodyParams.set('scope', scope);

    const response = performMtlsRequest({
      certFiles,
      url: tokenUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: bodyParams.toString(),
    });

    res.status(response.statusCode || 200).json(response.parsed);
  } catch (error) {
    console.error('OAuth token error:', error.message);
    res.status(500).json({
      error: 'mTLS request failed',
      details: error.message,
    });
  } finally {
    cleanupRequestCertFiles(certFiles);
  }
});

// APIgw token proxy - uses curl for reliable DNS resolution (same as mTLS endpoints)
app.post('/skv/apigw/token', authenticate, async (req, res) => {
  try {
    const { client_id, client_secret, token_url } = req.body;

    if (!client_id || !client_secret) {
      return res.status(400).json({ error: 'client_id and client_secret required' });
    }

    const url = token_url || 'https://apigw.skatteverket.se/token';
    if (!url.includes('skatteverket.se')) {
      return res.status(400).json({ error: 'Invalid token URL' });
    }

    const auth = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
    const postData = new URLSearchParams({ grant_type: 'client_credentials' }).toString();

    console.log(`APIgw curl request to ${url}`);

    const curlArgs = [
      '-s',
      '-w', '\\n%{http_code}',
      '-X', 'POST',
      '-H', 'Content-Type: application/x-www-form-urlencoded',
      '-H', `Authorization: Basic ${auth}`,
      '-d', postData,
      '--max-time', '15',
      url,
    ];

    const response = parseCurlResponse(runCurl(curlArgs));
    res.status(response.statusCode || 200).json(response.parsed);
  } catch (error) {
    console.error('APIgw token proxy error:', error.message);
    res.status(500).json({ error: 'APIgw proxy failed', details: error.message });
  }
});

// DNS debug endpoint
app.get('/dns/:hostname', authenticate, async (req, res) => {
  const hostname = req.params.hostname;
  try {
    const addresses = await new Promise((resolve, reject) => {
      dns.resolve4(hostname, (err, addrs) => {
        if (err) reject(err);
        else resolve(addrs);
      });
    });
    res.json({ hostname, addresses, ok: true });
  } catch (error) {
    res.json({ hostname, error: error.message, code: error.code, ok: false });
  }
});

app.post('/skv/api', authenticate, async (req, res) => {
  let certFiles = null;

  try {
    const { url, method, headers: reqHeaders, body, environment, certPem, keyPem } = req.body;

    if (!isAllowedSkatteverketUrl(url)) {
      return res.status(400).json({ error: 'Invalid or missing URL' });
    }

    const normalizedEnvironment = environment || (url.includes('.test.') ? 'test' : 'production');
    certFiles = resolveCertFiles({ environment: normalizedEnvironment, certPem, keyPem });
    if (!certFiles) {
      return res.status(500).json({ error: 'Certificates not configured' });
    }

    const response = performMtlsRequest({
      certFiles,
      url,
      method: method || 'GET',
      headers: reqHeaders || {},
      body,
    });

    res.status(response.statusCode || 200).json(response.parsed);
  } catch (error) {
    console.error('API proxy error:', error.message);
    res.status(500).json({ error: 'mTLS request failed', details: error.message });
  } finally {
    cleanupRequestCertFiles(certFiles);
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`mTLS proxy listening on port ${PORT}`);
});
