#!/usr/bin/env node
// Usage: node scripts/set_profile_password.js "+62882009759102" "newpassword"
// Reads SUPABASE_URL and SUPABASE_KEY from environment or falls back to src/lib/supabase.js defaults.

const crypto = require('crypto');
const fetch = require('node-fetch');
const path = require('path');

const phone = process.argv[2];
const password = process.argv[3];

if (!phone || !password) {
  console.error('Usage: node set_profile_password.js "+628..." "newpassword"');
  process.exit(1);
}

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

async function main() {
  const repoSupabase = require('../src/lib/supabase');
  const SUPABASE_URL = process.env.SUPABASE_URL || repoSupabase.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || repoSupabase.SUPABASE_KEY;
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
  console.log('Updated profiles:', json);
}

main().catch((err) => { console.error(err); process.exit(1); });
