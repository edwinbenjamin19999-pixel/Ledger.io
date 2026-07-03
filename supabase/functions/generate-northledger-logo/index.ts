import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Generating NorthLedger logo...');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: "Create an image: A professional, modern logo for 'NorthLedger'. Design specifications: Swedish fintech/accounting AI company logo. Clean, minimalist design. Blue (#0066CC) and white color scheme. Square format (1024x1024px). Suitable for app icons and partner branding. Banking integration appropriate. Professional and trustworthy aesthetic. Include 'NorthLedger' text in the design."
          }
        ],
        modalities: ["image"]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('AI API error:', error);
      throw new Error('Failed to generate logo');
    }

    const data = await response.json();
    console.log('Logo generation response:', JSON.stringify(data, null, 2));

    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      console.error('No image in response. Full response:', JSON.stringify(data, null, 2));
      throw new Error('No image generated - the AI returned text instead of an image');
    }

    return new Response(
      JSON.stringify({ 
        logoUrl: imageUrl,
        message: 'NorthLedger logo generated successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error generating logo:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
