/**
 * update-member-role
 * Uppdaterar rollen för en accepterad medlem i ett bolag.
 * Anroparen måste vara owner i samma bolag.
 *
 * Body: { invitationId: string, newRole: 'owner' | 'accountant' | 'auditor' | 'cfo' }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, handleCors, corsError, corsJson } from "../_shared/cors.ts";

const VALID_ROLES = new Set(["owner", "accountant", "auditor", "cfo"]);

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
    const newRole = body?.newRole;

    if (!invitationId || typeof invitationId !== "string") {
      return corsError("invitationId krävs", 400);
    }
    if (!newRole || !VALID_ROLES.has(newRole)) {
      return corsError("Ogiltig roll", 400);
    }

    const { data: invitation, error: invErr } = await admin
      .from("user_invitations")
      .select("id, company_id, accepted_by, role, email, status")
      .eq("id", invitationId)
      .maybeSingle();

    if (invErr) return corsError(invErr.message, 500);
    if (!invitation) return corsError("Inbjudan hittades inte", 404);

    // Verifiera att caller är owner
    const { data: callerRole } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("company_id", invitation.company_id)
      .eq("role", "owner")
      .maybeSingle();

    if (!callerRole) {
      return corsError("Du saknar behörighet att ändra roller i detta bolag", 403);
    }

    if (!invitation.accepted_by) {
      return corsError("Inbjudan har inte accepterats än", 400);
    }

    // Kan inte degradera sig själv från owner
    if (invitation.accepted_by === user.id && invitation.role === "owner" && newRole !== "owner") {
      return corsError("Du kan inte ändra din egen ägarroll", 400);
    }

    // Uppdatera user_roles
    const { error: roleErr } = await admin
      .from("user_roles")
      .update({ role: newRole })
      .eq("user_id", invitation.accepted_by)
      .eq("company_id", invitation.company_id);

    if (roleErr) return corsError(`Kunde inte uppdatera roll: ${roleErr.message}`, 500);

    // Synka invitation.role
    await admin
      .from("user_invitations")
      .update({ role: newRole })
      .eq("id", invitationId);

    // Audit (best-effort)
    try {
      await admin.from("audit_events").insert({
        company_id: invitation.company_id,
        user_id: user.id,
        action: "member_role_updated",
        entity_type: "user_invitation",
        entity_id: invitationId,
        metadata: {
          target_user_id: invitation.accepted_by,
          email: invitation.email,
          old_role: invitation.role,
          new_role: newRole,
        },
      });
    } catch (_) { /* ignore */ }

    return corsJson({ success: true, newRole });
  } catch (e: any) {
    console.error("update-member-role error:", e);
    return corsError(e?.message || "Internal error", 500);
  }
});
