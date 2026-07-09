import { sbSelect, sbInsert, sbPatch, sbRpc } from './api';
import { SUPABASE_KEY } from './supabase';

async function hashPassword(password) {
  const enc = new TextEncoder();
  const data = enc.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function dbSignUp({ fullName, phone, password, requested_unit_id = null, requested_unit_name = null, requested_unit_type = null }) {
  const existing = await sbSelect('profiles', { query: `phone=eq.${encodeURIComponent(phone)}` });
  if (existing && existing.length) throw new Error('Phone already registered');

  const password_hash = await hashPassword(password);
  const rows = await sbInsert('profiles', [{
    phone,
    full_name: fullName,
    role: 'staff',
    status: 'pending',
    password_hash,
    requested_unit_id,
    requested_unit_name,
    requested_unit_type,
  }]);
  const profile = rows?.[0] ?? null;
  if (!profile) throw new Error('Failed create profile');

  return { user: profile, access_token: SUPABASE_KEY };
}

export async function updateOwnProfile({ profileId, currentPhone, fullName, phone, currentPassword, newPassword }) {
  const patch = {};
  if (fullName !== undefined && fullName !== null) patch.full_name = fullName;
  if (phone !== undefined && phone !== null && phone !== currentPhone) patch.phone = phone;

  if (newPassword) {
    if (!currentPassword) throw new Error('Masukkan password saat ini untuk mengganti password.');
    const currentHash = await hashPassword(currentPassword);
    const verifyRows = await sbRpc('db_sign_in', { p_phone: currentPhone, p_password_hash: currentHash });
    const verified = verifyRows?.[0];
    if (!verified || verified.id !== profileId) throw new Error('Password saat ini salah.');
    patch.password_hash = await hashPassword(newPassword);
  }

  if (Object.keys(patch).length === 0) return null;

  const rows = await sbPatch('profiles', profileId, patch, { select: 'id,full_name,phone,role,unit_id,status,can_view_all' });
  return rows?.[0] ?? null;
}

export async function dbSignIn({ phone, password }) {
  const password_hash = await hashPassword(password);
  const rows = await sbRpc('db_sign_in', { p_phone: phone, p_password_hash: password_hash });
  const profile = rows?.[0] ?? null;

  if (!profile) throw new Error('No account for that phone or invalid credentials');
  if (profile.status !== 'approved') throw new Error('Account not approved');

  return { user: profile, access_token: SUPABASE_KEY };
}
