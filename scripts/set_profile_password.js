#!/usr/bin/env node
// Usage: SUPABASE_SERVICE_ROLE_KEY=<service_role_key> node scripts/set_profile_password.js "+62882009759102" "newpassword"
// Reads SUPABASE_URL and SUPABASE_KEY from environment or falls back to src/lib/supabase.js defaults.

import crypto from 'crypto';

const fetch = global.fetch || (await import('node-fetch')).default;

const phone = process.argv[2];
const password = process.argv[3];

if (!phone || !password) {
  console.error('Usage: SUPABASE_SERVICE_ROLE_KEY=<service_role_key> node scripts/set_profile_password.js "+628..." "newpassword"');
  process.exit(1);
}

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jqxwsffybmcdmsepufjs.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const REST = `${SUPABASE_URL}/rest/v1`;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env or src/lib/supabase.js');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Warning: using a non-service-role Supabase key. Admin operations may fail.');
}

const password_hash = sha256Hex(password);
const url = `${REST}/profiles?phone=eq.${encodeURIComponent(phone)}`;

const res = await fetch(url, {
  method: 'PATCH',
  headers: {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  },
  body: JSON.stringify({ password_hash, status: 'approved', role: 'staff' }),
});

if (!res.ok) {
  console.error('Failed to update profile:', res.status, await res.text());
  process.exit(1);
}

const json = await res.json();
console.log('PATCH result:', JSON.stringify(json, null, 2));

const verifyUrl = `${REST}/profiles?phone=eq.${encodeURIComponent(phone)}&select=id,phone,status,password_hash`;
const verifyRes = await fetch(verifyUrl, {
  headers: {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  },
});

if (!verifyRes.ok) {
  console.error('Failed to verify profile:', verifyRes.status, await verifyRes.text());
  process.exit(1);
}

const verifyJson = await verifyRes.json();
console.log('Verification row:', JSON.stringify(verifyJson, null, 2));
