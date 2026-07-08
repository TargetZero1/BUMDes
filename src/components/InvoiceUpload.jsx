import { useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { sbInsert } from '../lib/api';

export default function InvoiceUpload({ transferId, session, onUploaded }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleFile = (f) => setFile(f?.[0] ?? null);

  const handleUpload = async () => {
    if (!file) return setMsg({ type: 'error', text: 'Pilih file PDF dulu.' });
    if (!transferId) return setMsg({ type: 'error', text: 'Transfer ID required.' });
    setBusy(true);
    setMsg(null);
    try {
      const bucket = 'invoices';
      const path = `${transferId}/${Date.now()}_${file.name}`;

      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      const pdfUrl = pub?.publicUrl || null;

      // create invoice row
      const rows = await sbInsert('invoices', [{ transfer_id: transferId, issuer_profile_id: session?.user?.id ?? null, pdf_url: pdfUrl }], { accessToken: session?.access_token });

      setMsg({ type: 'success', text: 'Invoice uploaded.' });
      setFile(null);
      if (onUploaded) onUploaded(rows?.[0] ?? null);
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Upload failed.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-stone-500">Upload Invoice (PDF)</label>
      <div className="flex items-center gap-2">
        <input type="file" accept="application/pdf" onChange={(e) => handleFile(e.target.files)} />
        <button onClick={handleUpload} disabled={busy || !file} className="inline-flex items-center gap-2 rounded bg-emerald-700 px-3 py-1 text-xs text-white disabled:opacity-60">
          <Upload className="w-4 h-4" /> {busy ? 'Uploading…' : 'Upload'}
        </button>
      </div>
      {msg && <div className={`text-sm ${msg.type === 'error' ? 'text-rose-600' : 'text-emerald-700'}`}>{msg.text}</div>}
    </div>
  );
}
