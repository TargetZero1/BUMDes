const SUPABASE_URL = 'https://jqxwsffybmcdmsepufjs.supabase.co';
const REST = `${SUPABASE_URL}/rest/v1`;
const SUPABASE_KEY = 'sb_publishable_zWO6W0YibcWTVjgytmv5nw_oiUhjCSV';

(async () => {
  try {
    const url = `${REST}/profiles?select=id,full_name,email,role,status,unit_id,can_view_all&order=created_at.asc`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error('ERROR', err.message);
    process.exit(1);
  }
})();
