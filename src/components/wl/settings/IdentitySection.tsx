import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { BrandDraft } from "@/hooks/useTenantBrandDraft";
import { uploadTenantAsset, TenantAssetKind } from "@/lib/tenant/uploadTenantAsset";
import { toast } from "sonner";

interface Props {
  tenantId: string;
  draft: BrandDraft;
  update: <K extends keyof BrandDraft>(k: K, v: BrandDraft[K]) => void;
}

export function IdentitySection({ tenantId, draft, update }: Props) {
  const [uploading, setUploading] = useState<TenantAssetKind | null>(null);

  const handleUpload = async (kind: TenantAssetKind, file: File) => {
    setUploading(kind);
    try {
      const url = await uploadTenantAsset(tenantId, kind, file);
      const key = kind === "logo" ? "logo_url" : kind === "logo_dark" ? "logo_dark_url" : "favicon_url";
      update(key as keyof BrandDraft, url as never);
      toast.success("Uppladdad");
    } catch (e: any) {
      toast.error(e.message || "Uppladdning misslyckades");
    } finally {
      setUploading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Identitet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Visningsnamn</Label>
          <Input value={draft.name} onChange={(e) => update("name", e.target.value)} disabled />
          <p className="text-xs text-muted-foreground">Visningsnamnet ändras via tenant-administration.</p>
        </div>

        {(["logo", "logo_dark", "favicon"] as TenantAssetKind[]).map((kind) => {
          const key = kind === "logo" ? "logo_url" : kind === "logo_dark" ? "logo_dark_url" : "favicon_url";
          const label = kind === "logo" ? "Logotyp (ljus)" : kind === "logo_dark" ? "Logotyp (mörk)" : "Favicon";
          const url = draft[key as keyof BrandDraft] as string | null;
          return (
            <div key={kind} className="space-y-2">
              <Label>{label}</Label>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-md border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {url ? <img src={url} alt={label} className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-muted-foreground">—</span>}
                </div>
                <label className="inline-flex">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleUpload(kind, e.target.files[0])}
                  />
                  <Button asChild variant="outline" size="sm" disabled={uploading === kind}>
                    <span className="cursor-pointer">
                      {uploading === kind ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                      Ladda upp
                    </span>
                  </Button>
                </label>
                {url && (
                  <Button variant="ghost" size="sm" onClick={() => update(key as keyof BrandDraft, null as never)}>Ta bort</Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
