import { sbSelect, sbInsert, sbRpc } from './api';
import { SUPABASE_KEY } from './supabase';

async function hashPassword(password) {
  const enc = new TextEncoder();
  const data = enc.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function dbSignUp({ fullName, phone, password, requested_unit_id = null, requested_unit_name = null }) {
  const existing = await sbSelect('profiles', { query: `phone=eq.${encodeURIComponent(phone)}` });
  if (existing && existing.length) throw new Error('Phone already registered');

  const password_hash = await hashPassword(password);
  const rows = await sbInsert('profiles', [{ phone, full_name: fullName, role: 'staff', status: 'approved', password_hash, requested_unit_id, requested_unit_name }]);
  const profile = rows?.[0] ?? null;
  if (!profile) throw new Error('Failed create profile');

  return { user: { id: profile.id, phone: profile.phone }, access_token: SUPABASE_KEY };
}

export async function dbSignIn({ phone, password }) {
  const password_hash = await hashPassword(password);
  const rows = await sbRpc('db_sign_in', { p_phone: phone, p_password_hash: password_hash });
  const profile = rows?.[0] ?? null;

  if (!profile) throw new Error('No account for that phone or invalid credentials');
  if (profile.status !== 'approved') throw new Error('Account not approved');

  return { user: { id: profile.id, phone: profile.phone }, access_token: SUPABASE_KEY };
}
