import { createClient } from 'jsr:@supabase/supabase-js@2'

// Verifies the 6-digit code sent by request-password-reset and, on match,
// sets a new password_hash directly. No JWT required -- the user has no
// session yet, the OTP itself is the authorization.
//
// The OTP *code* is still hashed with plain SHA-256 here -- that's fine, it's
// a short-lived 6-digit numeric code with attempt-limiting and an expiry, not
// a long-term credential, so a slow/salted KDF buys nothing. The *password*
// itself is now hashed via the hash_password_bcrypt RPC (pgcrypto bcrypt,
// service-role only) instead of the same SHA-256 helper -- previously this
// function wrote a raw sha256 hex digest as password_hash, which is exactly
// the weak scheme the rest of the app has moved off of.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const GENERIC_ERROR = 'Kode salah, kadaluarsa, atau sudah terlalu banyak percobaan. Minta kode baru.'
const MAX_ATTEMPTS = 5

async function hashText(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Same live-session lookup as request-password-reset -- the session_id changes
// on every reconnect, so the stable device name has to be resolved fresh here too.
async function resolveLiveSessionId(deviceName: string, token: string): Promise<string | null> {
  const response = await fetch(`https://scan.flowkirim.com/api/whatsapp/sessions/${encodeURIComponent(deviceName)}`, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
  })
  if (!response.ok) return null
  const body = await response.json().catch(() => null)
  return body?.data?.session_id ?? null
}

// Best-effort security notice -- failure here must never block the password
// change itself, which has already succeeded by the time this runs.
async function notifyPasswordChanged(normalizedPhone: string): Promise<void> {
  const flowkirimToken = Deno.env.get('FLOWKIRIM_API_TOKEN')
  const flowkirimDeviceId = Deno.env.get('FLOWKIRIM_DEVICE_ID')
  if (!flowkirimToken || !flowkirimDeviceId) return

  const liveSessionId = await resolveLiveSessionId(flowkirimDeviceId, flowkirimToken)
  if (!liveSessionId) return

  const message =
    `*BUMDes Mulyoarjo*\nPassword akun Anda baru saja berhasil diubah.\n\n` +
    `Jika ini bukan Anda, segera hubungi admin BUMDes.`

  try {
    const response = await fetch('https://scan.flowkirim.com/api/whatsapp/messages/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${flowkirimToken}`,
      },
      body: JSON.stringify({ session_id: liveSessionId, to: normalizedPhone.replace('+', ''), message }),
    })
    if (!response.ok) {
      console.error('Password-changed notification did not send:', response.status, (await response.text()).slice(0, 500))
    }
  } catch (e) {
    console.error('Password-changed notification failed:', e)
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const fail = () =>
    new Response(JSON.stringify({ error: GENERIC_ERROR }), { status: 400, headers: corsHeaders })

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: corsHeaders })
    }

    const { phone, code, new_password } = await req.json()
    if (!phone || !code || !new_password) {
      return new Response(JSON.stringify({ error: 'phone, code, and new_password required' }), { status: 400, headers: corsHeaders })
    }
    if (String(new_password).length < 6) {
      return new Response(JSON.stringify({ error: 'Password minimal 6 karakter' }), { status: 400, headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceRoleKey)

    const { data: profileRows } = await admin.rpc('find_profile_by_phone', { p_phone: phone })
    const profile = profileRows?.[0]
    if (!profile) return fail()

    const { data: otpRow, error: otpError } = await admin
      .from('password_reset_otps')
      .select('id, code_hash, attempts, expires_at, consumed_at')
      .eq('profile_id', profile.id)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (otpError || !otpRow) return fail()
    if (new Date(otpRow.expires_at).getTime() < Date.now()) return fail()
    if (otpRow.attempts >= MAX_ATTEMPTS) return fail()

    const codeHash = await hashText(String(code))
    if (codeHash !== otpRow.code_hash) {
      await admin.from('password_reset_otps').update({ attempts: otpRow.attempts + 1 }).eq('id', otpRow.id)
      return fail()
    }

    const { data: newPasswordHash, error: hashError } = await admin.rpc('hash_password_bcrypt', {
      p_password: String(new_password),
    })
    if (hashError || !newPasswordHash) {
      console.error('Failed to hash new password:', hashError?.message)
      return new Response(JSON.stringify({ error: 'Gagal menyimpan password baru.' }), { status: 500, headers: corsHeaders })
    }

    const { error: updateError } = await admin
      .from('profiles')
      .update({ password_hash: newPasswordHash })
      .eq('id', profile.id)
    if (updateError) {
      console.error('Failed to update password:', updateError.message)
      return new Response(JSON.stringify({ error: 'Gagal menyimpan password baru.' }), { status: 500, headers: corsHeaders })
    }

    await admin.from('password_reset_otps').update({ consumed_at: new Date().toISOString() }).eq('id', otpRow.id)

    await notifyPasswordChanged(profile.normalized_phone as string)

    return new Response(
      JSON.stringify({ message: 'Password berhasil diubah. Silakan login dengan password baru.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders })
  }
})
