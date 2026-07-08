// Approve profile via Supabase REST and optionally set the DB auth password.
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=<service_role_key> node scripts/approve_profile_rest.js "+62882009759102"
//   SUPABASE_SERVICE_ROLE_KEY=<service_role_key> node scripts/approve_profile_rest.js "+62882009759102" "NewPassword"
import crypto from 'crypto';
const fetch = global.fetch || (await import('node-fetch')).default;

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

(async () => {
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jqxwsffybmcdmsepufjs.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  const phone = process.argv[2];
  const password = process.argv[3];

  if (!SUPABASE_KEY) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY in environment.');
    process.exit(1);
  }

  if (!phone) {
    console.error('Usage: SUPABASE_SERVICE_ROLE_KEY=<service_role_key> node scripts/approve_profile_rest.js "+628..." [password]');
    process.exit(1);
  }

  const payload = { status: 'approved', role: 'staff' };
  if (password) {
    payload.password_hash = sha256Hex(password);
  }

  const rest = `${SUPABASE_URL}/rest/v1`;
  const patchUrl = `${rest}/profiles?phone=eq.${encodeURIComponent(phone)}`;

  try {
    const res = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    console.log('PATCH status', res.status);
    console.log(text);

    const sel = await fetch(`${rest}/profiles?phone=eq.${encodeURIComponent(phone)}&select=id,phone,full_name,role,status,password_hash`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    const json = await sel.json();
    console.log('SELECT result:', JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
})();
