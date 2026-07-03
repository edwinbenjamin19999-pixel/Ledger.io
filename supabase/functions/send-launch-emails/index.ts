import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Missing config' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Verify caller is authenticated
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Verify caller is authenticated
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Use the same admin source as the rest of the admin UI
  const { data: isPlatformAdmin, error: adminError } = await supabase.rpc('is_platform_admin', {
    _user_id: user.id,
  })

  if (adminError) {
    console.error('Platform admin check failed', adminError)
    return new Response(JSON.stringify({ error: 'Admin check failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!isPlatformAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Fetch all waitlist entries
  const { data: waitlist, error: waitlistError } = await supabase
    .from('waitlist')
    .select('id, email, name')

  if (waitlistError) {
    return new Response(JSON.stringify({ error: waitlistError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!waitlist?.length) {
    return new Response(JSON.stringify({ sent: 0, message: 'No waitlist entries' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const results: Array<{ email: string; success: boolean; error?: string }> = []

  for (const entry of waitlist) {
    try {
      const { error } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'launch-announcement',
          recipientEmail: entry.email,
          idempotencyKey: `launch-announce-${entry.id}`,
          replyTo: 'info@northledger.se',
          templateData: { name: entry.name || undefined },
        },
      })

      results.push({ email: entry.email, success: !error, error: error?.message })
    } catch (err) {
      results.push({ email: entry.email, success: false, error: err instanceof Error ? err.message : String(err) })
    }
  }

  const sent = results.filter((r) => r.success).length
  return new Response(
    JSON.stringify({ sent, total: waitlist.length, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
