const env = import.meta.env || {};

export const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL || 'https://jqxwsffybmcdmsepufjs.supabase.co';
export const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_KEY || env.SUPABASE_ANON_KEY || env.SUPABASE_KEY || 'sb_publishable_zWO6W0YibcWTVjgytmv5nw_oiUhjCSV';
export const REST = `${SUPABASE_URL}/rest/v1`;
export const USE_DB_AUTH = true;
