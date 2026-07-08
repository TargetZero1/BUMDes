import { REST, SUPABASE_KEY } from './supabase';

export function sbHeaders(accessToken, extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${accessToken || SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

export async function sbSelect(table, { accessToken, query = 'select=*&order=tanggal.desc' } = {}) {
  const response = await fetch(`${REST}/${table}?${query}`, { headers: sbHeaders(accessToken) });
  if (!response.ok) throw new Error(`Gagal ambil data ${table}`);
  return response.json();
}

export async function sbInsert(table, rows, { accessToken } = {}) {
  if (!rows.length) return [];
  const response = await fetch(`${REST}/${table}`, {
    method: 'POST',
    headers: sbHeaders(accessToken, { Prefer: 'return=representation' }),
    body: JSON.stringify(rows),
  });
  if (!response.ok) throw new Error(`Gagal simpan ke ${table}`);
  return response.json();
}

export async function sbRpc(functionName, body, { accessToken } = {}) {
  const response = await fetch(`${REST}/rpc/${functionName}`, {
    method: 'POST',
    headers: sbHeaders(accessToken),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Gagal panggil fungsi ${functionName}`);
  return response.json();
}

export async function sbDelete(table, id, { accessToken } = {}) {
  const response = await fetch(`${REST}/${table}?id=eq.${id}`, {
    method: 'DELETE',
    headers: sbHeaders(accessToken),
  });
  if (!response.ok) throw new Error(`Gagal hapus dari ${table}`);
}

export async function sbDeleteWhere(table, query, { accessToken } = {}) {
  const response = await fetch(`${REST}/${table}?${query}`, {
    method: 'DELETE',
    headers: sbHeaders(accessToken),
  });
  if (!response.ok) throw new Error(`Gagal hapus dari ${table}`);
}

export async function sbPatch(table, id, patchBody, { accessToken } = {}) {
  const response = await fetch(`${REST}/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: sbHeaders(accessToken, { Prefer: 'return=representation' }),
    body: JSON.stringify(patchBody),
  });
  if (!response.ok) throw new Error(`Gagal update ${table}`);
  return response.json();
}

export async function sbDeleteAll(table, { accessToken } = {}) {
  const response = await fetch(`${REST}/${table}?id=not.is.null`, {
    method: 'DELETE',
    headers: sbHeaders(accessToken),
  });
  if (!response.ok) throw new Error(`Gagal reset ${table}`);
}
