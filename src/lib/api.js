import { REST, SUPABASE_KEY } from './supabase';

export function sbHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

export async function sbSelect(table) {
  const response = await fetch(`${REST}/${table}?select=*&order=tanggal.desc`, { headers: sbHeaders() });
  if (!response.ok) throw new Error(`Gagal ambil data ${table}`);
  return response.json();
}

export async function sbInsert(table, rows) {
  if (!rows.length) return [];
  const response = await fetch(`${REST}/${table}`, {
    method: 'POST',
    headers: sbHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify(rows),
  });
  if (!response.ok) throw new Error(`Gagal simpan ke ${table}`);
  return response.json();
}

export async function sbDelete(table, id) {
  const response = await fetch(`${REST}/${table}?id=eq.${id}`, {
    method: 'DELETE',
    headers: sbHeaders(),
  });
  if (!response.ok) throw new Error(`Gagal hapus dari ${table}`);
}

export async function sbDeleteAll(table) {
  const response = await fetch(`${REST}/${table}?id=not.is.null`, {
    method: 'DELETE',
    headers: sbHeaders(),
  });
  if (!response.ok) throw new Error(`Gagal reset ${table}`);
}
