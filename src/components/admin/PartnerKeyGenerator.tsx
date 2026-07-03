import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, AlertTriangle } from "lucide-react";

interface Props {
  partnerId: string;
  onCreated: () => void;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateRawKey(env: "sandbox" | "production"): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const random = btoa(String.fromCharCode(...bytes))
    .replace(/[+/=]/g, "")
    .slice(0, 32);
  return `${env === "production" ? "pk_live_" : "pk_test_"}${random}`;
}

export function PartnerKeyGenerator({ partnerId, onCreated }: Props) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [env, setEnv] = useState<"sandbox" | "production">("sandbox");
  const [generated, setGenerated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const rawKey = generateRawKey(env);
      const keyHash = await sha256Hex(rawKey);
      const keyPrefix = rawKey.slice(0, 16) + "…";

      const { error } = await supabase.from("partner_api_keys").insert({
        partner_id: partnerId,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        environment: env,
        name: name || `${env} key`,
        scopes: ["transactions:write", "insights:read"],
      });
      if (error) throw error;

      setGenerated(rawKey);
      onCreated();
      toast({ title: "API-nyckel skapad", description: "Kopiera nyckeln nu — den visas bara en gång." });
    } catch (err) {
      toast({
        title: "Fel",
        description: err instanceof Error ? err.message : "Kunde inte skapa nyckel",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = () => {
    if (!generated) return;
    navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (generated) {
    return (
      <Card className="p-4 space-y-3 border-warning/30 bg-warning/5">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Spara denna nyckel nu</p>
            <p className="text-muted-foreground">Den visas bara en gång och kan inte återskapas.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-muted rounded-md font-mono text-sm break-all">
          <span className="flex-1">{generated}</span>
          <Button size="sm" variant="outline" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <Button onClick={() => setGenerated(null)} variant="outline" className="w-full">
          Klart
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="space-y-2">
        <Label>Nyckelnamn</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="t.ex. Production – integration" />
      </div>
      <div className="space-y-2">
        <Label>Miljö</Label>
        <Select value={env} onValueChange={(v) => setEnv(v as "sandbox" | "production")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sandbox">Sandbox (pk_test_)</SelectItem>
            <SelectItem value="production">Production (pk_live_)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleCreate} disabled={creating} className="w-full">
        {creating ? "Skapar..." : "Generera API-nyckel"}
      </Button>
    </Card>
  );
}
