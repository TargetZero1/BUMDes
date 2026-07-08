export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://jqxwsffybmcdmsepufjs.supabase.co';
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_zWO6W0YibcWTVjgytmv5nw_oiUhjCSV';
export const REST = `${SUPABASE_URL}/rest/v1`;
export const USE_DB_AUTH = import.meta.env.VITE_USE_DB_AUTH === 'true' || false;
