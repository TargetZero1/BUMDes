import { sbInsert, sbPatch, sbRpc } from './api';
import { SUPABASE_KEY, SUPABASE_URL } from './supabase';

async function hashPassword(password) {
  const enc = new TextEncoder();
  const data = enc.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function dbSignUp({ fullName, phone, password, requested_unit_id = null, requested_unit_name = null, requested_unit_type = null }) {
  const phoneTaken = await sbRpc('phone_taken', { p_phone: phone });
  if (phoneTaken) throw new Error('Phone already registered');

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
  }], { select: 'id,full_name,phone,role,unit_id,status,can_view_all,requested_unit_id,requested_unit_name,requested_unit_type' });
  const profile = rows?.[0] ?? null;
  if (!profile) throw new Error('Failed create profile');

  return { user: profile, access_token: SUPABASE_KEY };
}

export async function updateOwnProfile({ profileId, currentPhone, fullName, phone, currentPassword, newPassword, accessToken }) {
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

  // profiles' RLS UPDATE policy only allows a caller to touch their own row
  // (matched via auth_user_id = auth.uid()) -- without the real per-user
  // access_token here, this call runs as anon, matches zero rows, and
  // PostgREST returns [] rather than an error, silently no-opping the save.
  const rows = await sbPatch('profiles', profileId, patch, { accessToken, select: 'id,full_name,phone,role,unit_id,status,can_view_all' });
  if (!rows?.length) throw new Error('Gagal menyimpan perubahan (sesi kedaluwarsa atau tidak diizinkan).');
  return rows[0];
}

// db-sign-in Edge Function bridges this app's custom phone+password_hash auth to a
// REAL Supabase Auth session (access_token/refresh_token), so auth.uid() resolves
// server-side for RLS. Without this, every request used the same static public key
// and no row-level policy tied to a specific user could ever match. See
// wiki/Projects/BUMDES/Conventions.md "Auth is custom..." section for full context.
export async function dbSignIn({ phone, password }) {
  const password_hash = await hashPassword(password);

  const response = await fetch(`${SUPABASE_URL}/functions/v1/db-sign-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ phone, password_hash }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error || 'No account for that phone or invalid credentials');
  }

  const { profile, access_token, refresh_token, expires_at } = body;
  if (!profile || !access_token) throw new Error('Sign-in did not return a valid session');

  return { user: profile, access_token, refresh_token, expires_at };
}

export async function requestPasswordResetOtp(phone) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/request-password-reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    body: JSON.stringify({ phone }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || 'Gagal mengirim kode OTP');
  return body;
}

export async function verifyPasswordResetOtp({ phone, code, newPassword }) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-password-reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    body: JSON.stringify({ phone, code, new_password: newPassword }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || 'Gagal reset password');
  return body;
}

// Exchanges a stored refresh_token for a new access_token when the current one has
// expired (real Supabase access tokens are short-lived, ~1hr, unlike the old static
// key). Not yet wired into automatic session-loading -- see BUMDES Conventions for
// the follow-up needed to call this proactively on app load / on a 401.
export async function refreshSession(refresh_token) {
  if (!refresh_token) throw new Error('No refresh_token to refresh with');

  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
    },
    body: JSON.stringify({ refresh_token }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error_description || body?.msg || 'Failed to refresh session');

  return {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: body.expires_at,
  };
}
