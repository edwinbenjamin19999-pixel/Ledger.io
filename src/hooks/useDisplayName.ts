import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toDisplayName } from "@/lib/format/displayName";

/**
 * Returns the user's preferred display name.
 * Priority: profiles.first_name → user_metadata.first_name/full_name → email local-part (cleaned).
 *
 * Email local-parts containing digits (e.g. "edwinbenjamin19999") are stripped
 * of trailing digits and capitalized, so we never show raw usernames in the UI.
 */
export function useDisplayName(): string {
  const { user } = useAuth();

  const { data: profileFirstName } = useQuery({
    queryKey: ["profile-first-name", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user!.id)
        .maybeSingle();
      return data?.first_name?.trim() || null;
    },
  });

  if (profileFirstName) return toDisplayName(profileFirstName);

  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const metaFirst = (meta.first_name as string) || (meta.given_name as string);
  if (metaFirst) return toDisplayName(metaFirst);
  const metaFull = (meta.full_name as string) || (meta.name as string);
  if (metaFull) return toDisplayName(metaFull.split(/\s+/)[0]);

  const email = user?.email || "";
  if (!email) return "";
  const local = email.split("@")[0] || "";
  // Strip trailing digits, split on separators, take first chunk
  const cleaned = local.replace(/\d+$/g, "").split(/[._-]/)[0] || local;
  return toDisplayName(cleaned);
}
