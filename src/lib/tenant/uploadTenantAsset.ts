import { supabase } from "@/integrations/supabase/client";

export type TenantAssetKind = "logo" | "logo_dark" | "favicon";

/**
 * Upload a tenant asset (logo / favicon) to the tenant-assets bucket.
 * Returns the public URL.
 */
export async function uploadTenantAsset(
  tenantId: string,
  kind: TenantAssetKind,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${tenantId}/${kind}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("tenant-assets")
    .upload(path, file, { upsert: true, cacheControl: "3600" });
  if (error) throw error;

  const { data } = supabase.storage.from("tenant-assets").getPublicUrl(path);
  return data.publicUrl;
}
