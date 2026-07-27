import { createClient } from 'jsr:@supabase/supabase-js@2'

// Bridges this app's custom phone+password auth to a REAL Supabase Auth
// session, so auth.uid() resolves for RLS. No JWT is required to call this
// function (verify_jwt=false) since callers don't have one yet -- this
// function IS the login step. All authorization happens internally via the
// existing db_sign_in RPC before any session is minted.
//
// The password travels here as plaintext (over HTTPS, same as any ordinary
// login form) and is verified/hashed server-side by db_sign_in via pgcrypto
// bcrypt -- the client never computes or transmits a hash itself, so a
// leaked password_hash row can no longer be replayed directly as a
// credential the way the old client-side-SHA-256 scheme allowed.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: corsHeaders })
    }

    const { phone, password } = await req.json()
    if (!phone || !password) {
      return new Response(JSON.stringify({ error: 'phone and password required' }), { status: 400, headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const admin = createClient(supabaseUrl, serviceRoleKey)

    // 1. Verify credentials via the existing db_sign_in RPC (service role bypasses RLS,
    //    reuses the same verification logic already in production, no duplication).
    //    NOTE: db_sign_in's return columns are fixed (id, phone, role, unit_id, status,
    //    can_view_all) and do NOT include auth_user_id -- must look that up separately.
    const { data: rows, error: rpcError } = await admin.rpc('db_sign_in', {
      p_phone: phone,
      p_password: password,
    })
    if (rpcError) {
      return new Response(JSON.stringify({ error: rpcError.message }), { status: 500, headers: corsHeaders })
    }
    const profile = rows?.[0]
    if (!profile) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, headers: corsHeaders })
    }
    if (profile.status !== 'approved') {
      return new Response(JSON.stringify({ error: 'Account not approved' }), { status: 403, headers: corsHeaders })
    }

    const { data: linkRow, error: linkLookupError } = await admin
      .from('profiles')
      .select('auth_user_id')
      .eq('id', profile.id)
      .single()
    if (linkLookupError) {
      return new Response(JSON.stringify({ error: linkLookupError.message }), { status: 500, headers: corsHeaders })
    }

    // 2. Ensure a real Supabase Auth user exists for this profile, linked via
    //    profiles.auth_user_id. Uses a placeholder internal email (never sent to,
    //    never delivered anywhere real) since Admin generateLink requires email,
    //    and we deliberately avoid real phone/SMS-based auth here.
    const internalEmail = `profile-${profile.id}@bumdes.internal`
    let authUserId: string | null = linkRow?.auth_user_id ?? null

    if (!authUserId) {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: internalEmail,
        email_confirm: true,
        user_metadata: { profile_id: profile.id },
      })

      if (created?.user) {
        authUserId = created.user.id
      } else if (createError?.message?.toLowerCase().includes('already been registered')) {
        // A prior login created the auth user but the write that links it back
        // to profiles.auth_user_id was interrupted (crash, timeout, etc). Find
        // the orphaned auth user by its deterministic placeholder email and
        // re-link it instead of failing this login forever.
        const { data: existingId, error: findError } = await admin.rpc('find_auth_user_by_email', {
          p_email: internalEmail,
        })
        if (findError || !existingId) {
          return new Response(JSON.stringify({ error: findError?.message || 'Could not recover existing auth user' }), { status: 500, headers: corsHeaders })
        }
        authUserId = existingId
      } else {
        return new Response(JSON.stringify({ error: createError?.message || 'Failed to create auth user' }), { status: 500, headers: corsHeaders })
      }

      const { error: updateLinkError } = await admin
        .from('profiles')
        .update({ auth_user_id: authUserId })
        .eq('id', profile.id)
      if (updateLinkError) {
        return new Response(JSON.stringify({ error: updateLinkError.message }), { status: 500, headers: corsHeaders })
      }
    }

    // 3. Mint a real session: generate a magic-link token server-side (never emailed
    //    anywhere -- generateLink only returns the token, it does not send anything),
    //    then immediately redeem it for a real access_token/refresh_token pair.
    //    verifyOtp with token_hash must NOT be given email/phone alongside it.
    const { data: linkData, error: linkGenError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: internalEmail,
    })
    if (linkGenError || !linkData) {
      return new Response(JSON.stringify({ error: linkGenError?.message || 'Failed to generate session link' }), { status: 500, headers: corsHeaders })
    }

    const anon = createClient(supabaseUrl, anonKey)
    const { data: sessionData, error: verifyError } = await anon.auth.verifyOtp({
      type: 'magiclink',
      token_hash: linkData.properties.hashed_token,
    })
    if (verifyError || !sessionData?.session) {
      return new Response(JSON.stringify({ error: verifyError?.message || 'Failed to mint session' }), { status: 500, headers: corsHeaders })
    }

    return new Response(
      JSON.stringify({
        profile,
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_at: sessionData.session.expires_at,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders })
  }
})
