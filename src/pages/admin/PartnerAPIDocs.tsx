import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const BASE_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.functions.supabase.co`;

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-muted text-foreground rounded-md p-4 text-xs overflow-x-auto font-mono">
      <code>{children}</code>
    </pre>
  );
}

export default function PartnerAPIDocs() {
  const { isPlatformAdmin, loading } = usePlatformAdmin();
  if (loading) return <div className="p-8">Laddar...</div>;
  if (!isPlatformAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/partners"><ArrowLeft className="h-4 w-4 mr-2" /> Tillbaka</Link>
        </Button>
      </div>
      <div>
        <h1 className="text-3xl font-bold">Partner API V1</h1>
        <p className="text-muted-foreground mt-1">
          Minimal partner-API för accounting firms och banker att embedda NorthLedger-intelligens i sina egna system.
        </p>
      </div>

      <Card className="p-6 space-y-3">
        <h2 className="text-xl font-semibold">Autentisering</h2>
        <p className="text-sm">
          Alla anrop kräver en API-nyckel som skickas via <code className="bg-muted px-1 rounded">Authorization: Bearer</code>-header.
        </p>
        <div className="flex gap-2">
          <Badge variant="secondary">pk_test_… → sandbox</Badge>
          <Badge>pk_live_… → production</Badge>
        </div>
        <CodeBlock>{`Authorization: Bearer pk_live_a3f9k2lm…`}</CodeBlock>
      </Card>

      <Card className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Badge>GET</Badge>
          <code className="font-mono text-sm">/v1/health</code>
        </div>
        <p className="text-sm text-muted-foreground">Verifiera nyckel och hämta partner-info.</p>
        <CodeBlock>{`curl -H "Authorization: Bearer pk_live_xxx" \\
  ${BASE_URL}/partner-api-health`}</CodeBlock>
        <CodeBlock>{`{
  "status": "ok",
  "partner": "Acme Redovisning",
  "environment": "production",
  "scopes": ["transactions:write", "insights:read"],
  "request_id": "uuid…"
}`}</CodeBlock>
      </Card>

      <Card className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Badge>POST</Badge>
          <code className="font-mono text-sm">/v1/transactions</code>
        </div>
        <p className="text-sm text-muted-foreground">
          Skicka transaktioner för en mappad klient. Idempotent via <code className="bg-muted px-1 rounded">external_id</code>.
        </p>
        <CodeBlock>{`curl -X POST \\
  -H "Authorization: Bearer pk_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "external_client_ref": "acme-client-001",
    "transactions": [
      {
        "external_id": "tx-2026-04-19-001",
        "date": "2026-04-19",
        "amount": -1250.50,
        "currency": "SEK",
        "description": "AWS October bill",
        "counterparty": "Amazon Web Services"
      }
    ]
  }' \\
  ${BASE_URL}/partner-api-transactions`}</CodeBlock>
        <CodeBlock>{`{
  "status": "ok",
  "accepted": 1,
  "duplicates": 0,
  "company_id": "uuid…",
  "request_id": "uuid…"
}`}</CodeBlock>
      </Card>

      <Card className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Badge>GET</Badge>
          <code className="font-mono text-sm">/v1/insights</code>
        </div>
        <p className="text-sm text-muted-foreground">
          Hämta AI-genererade insikter för en klient. Type: <code>anomalies</code> | <code>suggestions</code> | <code>cfo</code>.
        </p>
        <CodeBlock>{`curl -H "Authorization: Bearer pk_live_xxx" \\
  "${BASE_URL}/partner-api-insights?client_ref=acme-client-001&type=anomalies"`}</CodeBlock>
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="text-xl font-semibold">Rate limits & felkoder</h2>
        <ul className="text-sm space-y-1 list-disc pl-5">
          <li><strong>100 requests/min</strong> per partner — överskrid → <code>429</code></li>
          <li><code>401</code> — invalid_key | key_revoked | key_expired</li>
          <li><code>403</code> — partner_suspended | env_mismatch | missing_scope | ip_not_allowed</li>
          <li><code>404</code> — client_not_mapped (kontakta admin)</li>
          <li><code>400</code> — invalid_body | missing_param</li>
        </ul>
      </Card>

      <Card className="p-6 space-y-3 border-warning/30 bg-warning/5">
        <h3 className="font-semibold">Beta — endast för utvalda partners</h3>
        <p className="text-sm text-muted-foreground">
          Partner API V1 är en strategisk grund. Public developer portal, SDKs och webhooks tillkommer i V2 baserat på partner-feedback.
        </p>
      </Card>
    </div>
  );
}
