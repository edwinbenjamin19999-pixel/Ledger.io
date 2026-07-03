import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, handleCors } from "../_shared/cors.ts";

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
      return new Response(JSON.stringify({ error: "You must be logged in to accept an invitation" }), {
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

    const { token } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "Invitation token is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("user_invitations")
      .select(`
        id,
        company_id,
        email,
        role,
        status,
        expires_at,
        companies:company_id (name)
      `)
      .eq("token", token)
      .maybeSingle();

    if (inviteError || !invitation) {
      return new Response(JSON.stringify({ error: "Invitation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if invitation is still valid
    if (invitation.status !== "pending") {
      return new Response(JSON.stringify({ error: `Invitation has already been ${invitation.status}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      // Mark as expired
      await supabase
        .from("user_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);

      return new Response(JSON.stringify({ error: "Invitation has expired" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify email matches
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return new Response(
        JSON.stringify({ 
          error: `This invitation was sent to ${invitation.email}. Please log in with that email address.` 
        }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user already has a role for this company
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("company_id", invitation.company_id)
      .maybeSingle();

    if (existingRole) {
      // Mark invitation as accepted anyway
      await supabase
        .from("user_invitations")
        .update({ 
          status: "accepted",
          accepted_at: new Date().toISOString(),
          accepted_by: user.id
        })
        .eq("id", invitation.id);

      return new Response(JSON.stringify({ 
        success: true,
        message: "You already have access to this company",
        companyId: invitation.company_id 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add user role (this will trigger the permission creation trigger)
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: user.id,
        company_id: invitation.company_id,
        role: invitation.role,
      });

    if (roleError) {
      console.error("Error creating user role:", roleError);
      return new Response(JSON.stringify({ error: "Failed to grant access" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark invitation as accepted
    await supabase
      .from("user_invitations")
      .update({ 
        status: "accepted",
        accepted_at: new Date().toISOString(),
        accepted_by: user.id
      })
      .eq("id", invitation.id);

    // Create audit event
    await supabase.from("audit_events").insert({
      user_id: user.id,
      company_id: invitation.company_id,
      entity_type: "user_invitation",
      entity_id: invitation.id,
      event_type: "accept",
      new_data: { role: invitation.role },
      processing_purpose: "Invitation acceptance",
      legal_basis: "consent",
    });

    // Fetch company name with service role (bypasses RLS) so newly-invited user gets a real name
    let companyName = "the company";
    const { data: companyRow } = await supabase
      .from("companies")
      .select("name")
      .eq("id", invitation.company_id)
      .maybeSingle();
    if (companyRow?.name) companyName = companyRow.name;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Welcome! You now have ${invitation.role} access to ${companyName}`,
        companyId: invitation.company_id,
        companyName,
        role: invitation.role,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in accept-invitation:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
