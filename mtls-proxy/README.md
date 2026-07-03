# NorthLedger mTLS Proxy

En enkel Express-proxy som hanterar mTLS-handskakningar mot Skatteverkets API:er.
Krävs eftersom Supabase Edge Runtime (Deno) inte skickar klientcertifikat.

## Viktigt: rotorsaken till `Admin policy denied access`

Den tidigare guiden exporterade **testcertifikatet** via `export-test-cert-pem` och bakade in det i proxyn.
Det gör att produktionsanrop kan skicka fel organisationslegitimation mot `sysorgoauth2.skatteverket.se`, vilket ofta slutar med:

```json
{"error":"access_denied","error_description":"Admin policy denied access."}
```

Proxyservern stöder nu att backend skickar rätt certifikat **per request**. Då hålls test och produktion synkade med samma certifikatkälla som backend använder.

## Deploy till Google Cloud Run

### 1. Installera Google Cloud CLI
```bash
brew install google-cloud-sdk
```

### 2. Logga in & skapa projekt
```bash
gcloud auth login
gcloud projects create northledger-mtls --name="NorthLedger mTLS Proxy"
gcloud config set project northledger-mtls

gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### 3. Deploy
```bash
cd mtls-proxy
export PROXY_SECRET=$(openssl rand -hex 32)

gcloud run deploy northledger-mtls-proxy \
  --source . \
  --region europe-north1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "PROXY_SECRET=$PROXY_SECRET" \
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 1
```

### 4. Notera URL:en
Cloud Run ger dig en URL typ:
```bash
https://northledger-mtls-proxy-xxxxx-lz.a.run.app
```

### 5. Konfigurera i Lovable
Lägg till dessa som secrets i backend:
- `MTLS_PROXY_URL` = URL:en från steg 4
- `MTLS_PROXY_SECRET` = värdet av `$PROXY_SECRET`

### 6. Testa
```bash
curl https://northledger-mtls-proxy-xxxxx-lz.a.run.app/health
```

## Hur certifikat används nu

Vid vanliga backend-anrop skickar backend rätt PEM-certifikat och privat nyckel till proxyn i varje request.
Det betyder att proxyn **inte längre behöver** ha produktions- eller testcertifikat inbakade som miljövariabler för att fungera.

### Valfritt: statiska certifikat för fristående tester
Om du vill använda proxyn helt fristående utanför backend-flödet kan du fortfarande sätta:
- `SKV_PROD_CERT_PEM` + `SKV_PROD_KEY_PEM`
- `SKV_TEST_CERT_PEM` + `SKV_TEST_KEY_PEM`
- eller legacy: `SKV_CERT_PEM` + `SKV_KEY_PEM`

## Gratisnivå

Google Cloud Run Free Tier:
- 2 miljoner requests/månad
- 360 000 GB-sekunder/månad
- 180 000 vCPU-sekunder/månad
- Ingen kostnad om du håller dig under dessa gränser

## Endpoints

- `GET /health` — Hälsokontroll
- `POST /skv/oauth/token` — OAuth2 token med mTLS
- `POST /skv/api` — Generisk mTLS-proxy mot valfri SKV-endpoint

Alla POST-endpoints kräver `x-proxy-secret` header.
