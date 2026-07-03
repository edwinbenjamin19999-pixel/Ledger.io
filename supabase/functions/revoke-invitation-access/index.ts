/**
 * revoke-invitation-access
 * Tar bort en användares åtkomst till ett bolag (raderar user_roles-rad)
 * och markerar tillhörande inbjudan som 'revoked'.
 *
 * Body: { invitationId: string }
 * Auth: caller måste vara owner i samma company.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, handleCors, corsError, corsJson } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return corsError("Missing authorization", 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return corsError("Not authenticated", 401);

    const body = await req.json().catch(() => ({}));
    const invitationId = body?.invitationId;
    if (!invitationId || typeof invitationId !== "string") {
      return corsError("invitationId krävs", 400);
    }

    // Hämta inbjudan
    const { data: invitation, error: invErr } = await admin
      .from("user_invitations")
      .select("id, company_id, accepted_by, role, email, status")
      .eq("id", invitationId)
      .maybeSingle();

    if (invErr) return corsError(invErr.message, 500);
    if (!invitation) return corsError("Inbjudan hittades inte", 404);

    // Verifiera att caller är owner i bolaget
    const { data: callerRole } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("company_id", invitation.company_id)
      .eq("role", "owner")
      .maybeSingle();

    if (!callerRole) {
      return corsError("Du saknar behörighet att återkalla åtkomst i detta bolag", 403);
    }

    if (!invitation.accepted_by) {
      return corsError("Inbjudan har inte accepterats — använd 'Avbryt' istället", 400);
    }

    // Skydd: kan inte ta bort sig själv
    if (invitation.accepted_by === user.id) {
      return corsError("Du kan inte ta bort din egen åtkomst", 400);
    }

    // Radera user_roles-raden
    const { error: roleDelErr } = await admin
      .from("user_roles")
      .delete()
      .eq("user_id", invitation.accepted_by)
      .eq("company_id", invitation.company_id);

    if (roleDelErr) return corsError(`Kunde inte ta bort åtkomst: ${roleDelErr.message}`, 500);

    // Markera inbjudan som revoked
    await admin
      .from("user_invitations")
      .update({ status: "revoked" })
      .eq("id", invitationId);

    // Audit (best-effort)
    try {
      await admin.from("audit_events").insert({
        company_id: invitation.company_id,
        user_id: user.id,
        action: "access_revoked",
        entity_type: "user_invitation",
        entity_id: invitationId,
        metadata: {
          revoked_user_id: invitation.accepted_by,
          email: invitation.email,
          role: invitation.role,
        },
      });
    } catch (_) { /* ignore */ }

    return corsJson({ success: true });
  } catch (e: any) {
    console.error("revoke-invitation-access error:", e);
    return corsError(e?.message || "Internal error", 500);
  }
});
