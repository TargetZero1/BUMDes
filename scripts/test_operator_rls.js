/*
  Test script: attempt forbidden write as operator user.
  Usage: set env VARS or edit below, then run `node scripts/test_operator_rls.js`

  It will:
  - sign in the operator via Supabase Auth (phone+password)
  - attempt to INSERT into `kas_umum_debit` via PostgREST with that access token
  - print response status and body
*/

const fetch = global.fetch || require('node-fetch');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jqxwsffybmcdmsepufjs.supabase.co';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_zWO6W0YibcWTVjgytmv5nw_oiUhjCSV';
const OPERATOR_PHONE = process.env.OPERATOR_PHONE || '+62882009759102';
const OPERATOR_PASSWORD = process.env.OPERATOR_PASSWORD || 'Vijay123';

async function main(){
  // Sign in
  const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ phone: OPERATOR_PHONE, password: OPERATOR_PASSWORD }),
  });
  const tokenJson = await tokenRes.json();
  console.log('Sign-in status', tokenRes.status);
  if (!tokenJson.access_token){
    console.error('Failed to sign in:', tokenJson);
    process.exit(1);
  }

  const accessToken = tokenJson.access_token;
  console.log('Got access token. Attempting forbidden INSERT...');

  // Replace <UNIT_ID> with a unit id the operator does NOT belong to.
  const UNIT_ID = process.env.TEST_UNIT_ID || '';
  if (!UNIT_ID){
    console.error('Please set TEST_UNIT_ID env var to a target unit id the operator does NOT belong to.');
    process.exit(1);
  }

  const payload = [{
    tanggal: new Date().toISOString().slice(0,10),
    uraian: 'RLS operator forbidden test',
    sumber: 'e2e-test',
    jumlah: 1000,
    unit_id: UNIT_ID,
    created_by: null
  }];

  const res = await fetch(`${SUPABASE_URL}/rest/v1/kas_umum_debit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(payload),
  });

  console.log('Insert status', res.status);
  const body = await res.text();
  console.log('Response body:', body);
}

main().catch(err => { console.error(err); process.exit(1); });
