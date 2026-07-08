// Approve profile via Supabase REST.
// Usage: SUPABASE_SERVICE_ROLE_KEY=<service_role_key> node scripts/approve_profile_rest.js "+62882009759102"
const fetch = global.fetch || require('node-fetch');
(async () => {
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jqxwsffybmcdmsepufjs.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  const phone = process.argv[2] || '+62882009759102';

  if (!SUPABASE_KEY) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY in environment.');
    process.exit(1);
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
      body: JSON.stringify({ status: 'approved', role: 'staff' }),
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
