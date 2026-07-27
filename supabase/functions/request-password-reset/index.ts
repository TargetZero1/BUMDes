import { createClient } from 'jsr:@supabase/supabase-js@2'

// Sends a 6-digit password-reset code to the user's WhatsApp via FlowKirim,
// since login here is phone-based (no email exists to send a reset link to).
// No JWT required (verify_jwt=false) -- callers don't have a session yet,
// this IS the pre-login recovery step.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const GENERIC_MESSAGE = 'Jika nomor terdaftar, kode OTP sudah dikirim ke WhatsApp nomor tersebut.'
const OTP_TTL_MINUTES = 5
const MAX_REQUESTS_PER_WINDOW = 3
const WINDOW_MINUTES = 15

async function hashText(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// crypto.getRandomValues, not Math.random -- this is a one-time security
// token gating a password change, it needs to be unguessable.
function generateOtpCode(): string {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  const code = 100000 + (array[0] % 900000)
  return String(code)
}

// FlowKirim's send-message API needs the CURRENT session_id, which carries a
// connection timestamp suffix (e.g. "device1-<uuid>_<connectedAt>") that
// changes if the device ever reconnects. FLOWKIRIM_DEVICE_ID stores the
// stable device name only; this looks up today's live session_id every
// send instead of trusting a value that can silently go stale.
async function resolveLiveSessionId(deviceName: string, token: string): Promise<string | null> {
  const response = await fetch(`https://scan.flowkirim.com/api/whatsapp/sessions/${encodeURIComponent(deviceName)}`, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
  })
  if (!response.ok) return null
  const body = await response.json().catch(() => null)
  return body?.data?.session_id ?? null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const generic = () =>
    new Response(JSON.stringify({ message: GENERIC_MESSAGE }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: corsHeaders })
    }

    const { phone } = await req.json()
    if (!phone) {
      return new Response(JSON.stringify({ error: 'phone required' }), { status: 400, headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceRoleKey)

    // Always respond identically whether or not the phone matches an
    // approved profile, is rate-limited, or the WA send fails -- otherwise
    // this endpoint becomes a phone-number enumeration oracle.
    const { data: profileRows } = await admin.rpc('find_profile_by_phone', { p_phone: phone })
    const profile = profileRows?.[0]
    if (!profile) return generic()

    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString()
    const { count } = await admin
      .from('password_reset_otps')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profile.id)
      .gte('created_at', windowStart)
    if ((count ?? 0) >= MAX_REQUESTS_PER_WINDOW) return generic()

    const code = generateOtpCode()
    const code_hash = await hashText(code)
    const expires_at = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString()

    const { error: insertError } = await admin.from('password_reset_otps').insert({
      profile_id: profile.id,
      code_hash,
      expires_at,
    })
    if (insertError) {
      console.error('Failed to store OTP:', insertError.message)
      return generic()
    }

    const flowkirimToken = Deno.env.get('FLOWKIRIM_API_TOKEN')
    const flowkirimDeviceId = Deno.env.get('FLOWKIRIM_DEVICE_ID')
    if (!flowkirimToken || !flowkirimDeviceId) {
      console.error('FlowKirim secrets not configured')
      return generic()
    }

    const liveSessionId = await resolveLiveSessionId(flowkirimDeviceId, flowkirimToken)
    if (!liveSessionId) {
      console.error('Could not resolve a live FlowKirim session_id for device:', flowkirimDeviceId)
      return generic()
    }

    const waTo = (profile.normalized_phone as string).replace('+', '')
    const message =
      `*BUMDes Mulyoarjo*\nKode verifikasi reset password Anda:\n\n*${code}*\n\n` +
      `Kode ini berlaku ${OTP_TTL_MINUTES} menit dan hanya berlaku untuk satu kali pemakaian. ` +
      `Jangan bagikan kode ini ke siapa pun, termasuk yang mengaku dari pihak BUMDes.\n\n` +
      `Jika Anda tidak meminta reset password, abaikan pesan ini.`

    const sendResponse = await fetch('https://scan.flowkirim.com/api/whatsapp/messages/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${flowkirimToken}`,
      },
      body: JSON.stringify({
        session_id: liveSessionId,
        to: waTo,
        message,
      }),
    })
    const sendBodyText = await sendResponse.text().catch(() => '')
    let sendBodyJson: any = null
    try { sendBodyJson = JSON.parse(sendBodyText) } catch { /* not JSON */ }
    if (!sendResponse.ok || sendBodyJson?.success === false) {
      console.error('FlowKirim send did not succeed:', sendResponse.status, sendBodyText.slice(0, 1000))
    }

    return generic()
  } catch (e) {
    console.error(e)
    return generic()
  }
})
