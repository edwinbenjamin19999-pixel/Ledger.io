import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface InvitationRequest {
  email: string;
  companyId: string;
  role: 'owner' | 'accountant' | 'auditor' | 'cfo';
  permissions?: Record<string, string>;
  resend?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Ägare",
  accountant: "Redovisare",
  auditor: "Revisor",
  cfo: "CFO",
};

async function sendInvitationEmail(params: {
  to: string;
  inviterName: string;
  companyName: string;
  role: string;
  inviteUrl: string;
  expiresAt: string;
}): Promise<{ ok: boolean; error?: string }> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.warn("[send-invitation] RESEND_API_KEY missing — email not sent");
    return { ok: false, error: "RESEND_API_KEY missing" };
  }

  const roleLabel = ROLE_LABELS[params.role] || params.role;
  const subject = `Du har bjudits in till ${params.companyName} på NorthLedger`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 24px; color: #0F2137;">
      <div style="font-size: 24px; font-weight: 700; margin-bottom: 24px; letter-spacing: -0.5px;">
        <span style="color: #0891b2;">Conto</span><span style="color: #0F2137;">AI</span>
      </div>
      <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 16px;">Du har bjudits in</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #444; margin: 0 0 16px;">
        Hej!<br/>
        ${params.inviterName ? `<strong>${params.inviterName}</strong>` : "En ägare"} har bjudit in dig till
        <strong>${params.companyName}</strong> på NorthLedger som <strong>${roleLabel}</strong>.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${params.inviteUrl}"
           style="display: inline-block; background: #0F2137; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">
          Acceptera inbjudan
        </a>
      </div>
      <p style="font-size: 13px; color: #666; line-height: 1.6; margin: 0 0 8px;">
        Eller kopiera denna länk i din webbläsare:<br/>
        <a href="${params.inviteUrl}" style="color: #0891b2; word-break: break-all;">${params.inviteUrl}</a>
      </p>
      <p style="font-size: 13px; color: #888; margin: 16px 0 0;">
        Inbjudan upphör att gälla ${new Date(params.expiresAt).toLocaleDateString("sv-SE")}.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
      <p style="font-size: 12px; color: #999; margin: 0;">
        Om du inte väntat dig denna inbjudan kan du ignorera mejlet.
      </p>
      <p style="font-size: 11px; color: #bbb; margin: 8px 0 0;">
        NorthLedger – AI-driven bokföring för svenska företag
      </p>
    </div>
  `;
  const text = `Du har bjudits in till ${params.companyName} på NorthLedger som ${roleLabel}.\n\nAcceptera här: ${params.inviteUrl}\n\nInbjudan upphör att gälla ${new Date(params.expiresAt).toLocaleDateString("sv-SE")}.`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "NorthLedger <noreply@northledger.se>",
        to: [params.to],
        subject,
        html,
        text,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      console.error("[send-invitation] Resend error:", res.status, body);
      return { ok: false, error: `Resend ${res.status}: ${JSON.stringify(body)}` };
    }
    console.log("[send-invitation] Email sent:", body.id);
    return { ok: true };
  } catch (err) {
    console.error("[send-invitation] Resend fetch failed:", err);
    return { ok: false, error: String(err) };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, companyId, role, permissions, resend: isResend }: InvitationRequest = await req.json();

    // Validate input
    if (!email || !companyId || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is owner of the company
    const { data: roleCheck, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("company_id", companyId)
      .eq("role", "owner")
      .maybeSingle();

    if (roleError || !roleCheck) {
      return new Response(JSON.stringify({ error: "Only owners can invite users" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get company info
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError || !company) {
      return new Response(JSON.stringify({ error: "Company not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get inviter profile
    const { data: inviterProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", user.id)
      .maybeSingle();

    // Check if invitation already exists (skip when resending)
    const { data: existingInvite } = await supabase
      .from("user_invitations")
      .select("id, token, status, expires_at")
      .eq("company_id", companyId)
      .eq("email", email.toLowerCase())
      .eq("status", "pending")
      .maybeSingle();

    if (existingInvite && !isResend) {
      return new Response(JSON.stringify({ error: "Inbjudan har redan skickats till denna e-post" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already has access
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (existingUser) {
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", existingUser.id)
        .eq("company_id", companyId)
        .maybeSingle();

      if (existingRole) {
        // Friendly response for resend on already-member
        if (isResend) {
          return new Response(
            JSON.stringify({
              success: true,
              alreadyMember: true,
              message: "Användaren har redan accepterat inbjudan och har åtkomst — ingen ny inbjudan behövs.",
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(JSON.stringify({ error: "Användaren har redan åtkomst till företaget" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Create or reuse invitation
    let invitation: { id: string; token: string; expires_at?: string } | null = null;
    if (existingInvite && isResend) {
      // Renew token + expiry so the new email link is valid
      const { data: renewed, error: renewError } = await supabase
        .from("user_invitations")
        .update({
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          token: crypto.randomUUID(),
        })
        .eq("id", existingInvite.id)
        .select("id, token, expires_at")
        .maybeSingle();

      if (renewError || !renewed) {
        console.error("Error renewing invitation:", renewError);
        return new Response(JSON.stringify({ error: "Kunde inte förnya inbjudan" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      invitation = renewed as any;
    } else {
      const { data: newInvite, error: inviteError } = await supabase
        .from("user_invitations")
        .insert({
          company_id: companyId,
          email: email.toLowerCase(),
          role: role,
          invited_by: user.id,
        })
        .select("id, token, expires_at")
        .maybeSingle();

      if (inviteError || !newInvite) {
        console.error("Error creating invitation:", inviteError);
        return new Response(JSON.stringify({ error: "Failed to create invitation" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      invitation = newInvite as any;
    }

    const origin = req.headers.get("origin") || "https://northledger.se";
    const inviteUrl = `${origin}/accept-invitation?token=${invitation!.token}`;
    const expiresAt = invitation!.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const inviterName = [inviterProfile?.first_name, inviterProfile?.last_name].filter(Boolean).join(" ").trim();

    // Send the email
    const emailResult = await sendInvitationEmail({
      to: email.toLowerCase(),
      inviterName,
      companyName: company.name,
      role,
      inviteUrl,
      expiresAt,
    });

    // Create audit event
    await supabase.from("audit_events").insert({
      user_id: user.id,
      company_id: companyId,
      entity_type: "user_invitation",
      entity_id: invitation!.id,
      event_type: isResend ? "resend" : "create",
      new_data: { email, role, emailSent: emailResult.ok },
      processing_purpose: "User invitation",
      legal_basis: "legitimate_interest",
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: emailResult.ok
          ? `Inbjudan skickad till ${email}`
          : `Inbjudan skapad — men mejl kunde inte skickas (${emailResult.error}). Kopiera länken manuellt.`,
        invitationId: invitation!.id,
        emailSent: emailResult.ok,
        emailError: emailResult.ok ? undefined : emailResult.error,
        inviteUrl,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-invitation:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
