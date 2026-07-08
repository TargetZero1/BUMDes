import { useEffect, useState } from 'react';
import { sbSelect, sbPatch } from '../lib/api';
import { Check, X } from 'lucide-react';
import InvoiceUpload from './InvoiceUpload';

export default function TransferApprovalQueue({ session }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [attachForId, setAttachForId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await sbSelect('transfers', { accessToken: session?.access_token, query: `select=*&order=created_at.desc&status=eq.pending` });
      setRows(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [session?.access_token]);

  const approve = async (id) => {
    try { await sbPatch('transfers', id, { status: 'approved' }, { accessToken: session?.access_token }); load(); } catch (e) { console.error(e); }
  };

  const cancel = async (id) => {
    try { await sbPatch('transfers', id, { status: 'cancelled' }, { accessToken: session?.access_token }); load(); } catch (e) { console.error(e); }
  };

  if (loading) return <div className="text-sm text-stone-400">Loading…</div>;
  if (!rows.length) return <div className="text-sm text-stone-400">No pending transfers.</div>;

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="rounded-lg border p-3 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">{r.description || 'Transfer'}</div>
              <div className="text-xs text-stone-500">{r.from_unit_id} → {r.to_unit_id} • {r.amount}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => approve(r.id)} className="rounded bg-emerald-700 px-3 py-1 text-white"><Check className="w-4 h-4"/></button>
              <button onClick={() => cancel(r.id)} className="rounded border px-3 py-1 text-stone-700"><X className="w-4 h-4"/></button>
              <button onClick={() => setAttachForId(r.id)} className="rounded border px-3 py-1 text-stone-700">Attach Invoice</button>
            </div>
          </div>
          {attachForId === r.id && (
            <div className="mt-3 border-t pt-3">
              <InvoiceUpload transferId={r.id} session={session} onUploaded={() => { setAttachForId(null); load(); }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
