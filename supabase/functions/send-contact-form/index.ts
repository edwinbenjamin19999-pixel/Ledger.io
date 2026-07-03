import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, company, message } = await req.json();

    console.log('Contact form submission received:', { name, email, company });

    // Validate required fields
    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name, email, and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email via Resend
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      console.error('RESEND_API_KEY not configured');
      throw new Error('Email service not configured');
    }

    const resend = new Resend(resendKey);

    const emailResponse = await resend.emails.send({
      from: 'NorthLedger Kontakt <noreply@northledger.se>',
      to: ['info@northledger.se'],
      reply_to: email,
      subject: `Kontaktförfrågan från ${name}${company ? ` (${company})` : ''}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a1a; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">
            Ny kontaktförfrågan
          </h2>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #666; width: 120px;">Namn:</td>
              <td style="padding: 10px 0; color: #1a1a1a;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #666;">E-post:</td>
              <td style="padding: 10px 0; color: #1a1a1a;">
                <a href="mailto:${email}" style="color: #6366f1;">${email}</a>
              </td>
            </tr>
            ${company ? `
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #666;">Företag:</td>
              <td style="padding: 10px 0; color: #1a1a1a;">${company}</td>
            </tr>
            ` : ''}
          </table>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #1a1a1a;">Meddelande:</h3>
            <p style="margin: 0; color: #333; white-space: pre-wrap; line-height: 1.6;">${message}</p>
          </div>
          
          <p style="color: #888; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
            Detta meddelande skickades via kontaktformuläret på northledger.se<br>
            Tidpunkt: ${new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' })}
          </p>
        </div>
      `,
    });

    console.log('✅ Contact email sent successfully:', emailResponse);

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Contact form submitted successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error processing contact form:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to process contact form' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});