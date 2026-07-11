import { useCallback, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { sbRpc } from '../lib/api';
import { formatRupiah, formatTanggal } from '../lib/formatters';
import { TRANSFER_STATUS_LABELS } from '../lib/constants';

const STAGE_STATUS = { bendahara: 'menunggu_bendahara', direktur: 'menunggu_direktur' };
const APPROVE_RPC = { bendahara: 'bendahara_approve_transfer', direktur: 'direktur_approve_transfer' };

export default function ApprovalQueue({ session, profile, units }) {
  const role = profile?.role;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState(null);

  const unitNameFor = (unitId) => units.find((unit) => unit.id === unitId)?.name || '-';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await sbRpc('list_pengeluaran_unit', { p_caller_id: session?.user?.id || null, p_unit_id: null }, { accessToken: session?.access_token });
      setRows(data || []);
    } catch (err) {
      console.error('Failed load transfers', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, session?.user?.id]);

  useEffect(() => { load(); }, [load]);

  const showNotice = (type, text) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  };

  const handleApprove = async (row) => {
    setBusyId(row.id);
    try {
      await sbRpc(APPROVE_RPC[role], { p_caller_id: session?.user?.id || null, p_transfer_id: row.id }, { accessToken: session?.access_token });
      showNotice('success', 'Pembayaran disetujui.');
      await load();
    } catch (err) {
      showNotice('error', err.message || 'Gagal menyetujui.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (row) => {
    const reason = window.prompt('Alasan penolakan (opsional):') || null;
    setBusyId(row.id);
    try {
      await sbRpc('reject_transfer', { p_caller_id: session?.user?.id || null, p_transfer_id: row.id, p_reason: reason }, { accessToken: session?.access_token });
      showNotice('success', 'Pembayaran ditolak.');
      await load();
    } catch (err) {
      showNotice('error', err.message || 'Gagal menolak.');
    } finally {
      setBusyId(null);
    }
  };

  const pending = rows.filter((row) => row.status === STAGE_STATUS[role]);
  const history = rows.filter((row) => row.status !== STAGE_STATUS[role]);

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-stone-800" style={{ fontFamily: "'Lora', serif" }}>
          Persetujuan Kirim Dana
        </h2>
        <p className="text-sm text-stone-500">Transfer dari Operator yang menunggu persetujuan Anda sebagai {role === 'bendahara' ? 'Bendahara' : 'Direktur'}.</p>
      </div>

      {notice && (
        <div className={`mb-4 rounded-xl px-4 py-2.5 text-sm ${notice.type === 'error' ? 'border border-rose-200 bg-rose-50 text-rose-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {notice.text}
        </div>
      )}

      <section className="mb-8">
        <h3 className="mb-3 font-semibold text-stone-700">Menunggu Persetujuan Anda ({pending.length})</h3>
        {loading ? (
          <div className="py-6 text-center text-sm text-stone-400">Memuat…</div>
        ) : pending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm italic text-stone-400">Tidak ada yang menunggu persetujuan.</div>
        ) : (
          <div className="space-y-3">
            {pending.map((row) => (
              <div key={row.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-stone-800">{unitNameFor(row.unit_id)} — {formatRupiah(row.amount)}</div>
                    <div className="text-xs text-stone-500">{formatTanggal(row.tanggal)} • {row.description || '-'}</div>
                    {row.bank_name && (
                      <div className="text-xs text-stone-500">{row.bank_name}{row.account_number ? ` — ${row.account_number}` : ''}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(row)}
                      disabled={busyId === row.id}
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                    >
                      <Check className="h-3.5 w-3.5" /> Setujui
                    </button>
                    <button
                      onClick={() => handleReject(row)}
                      disabled={busyId === row.id}
                      className="inline-flex items-center gap-1 rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                    >
                      <X className="h-3.5 w-3.5" /> Tolak
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 font-semibold text-stone-700">Riwayat</h3>
        {history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm italic text-stone-400">Belum ada riwayat.</div>
        ) : (
          <div className="space-y-2">
            {history.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white p-3 text-sm">
                <div>
                  <div className="font-medium text-stone-800">{unitNameFor(row.unit_id)} — {formatRupiah(row.amount)}</div>
                  <div className="text-xs text-stone-500">{formatTanggal(row.tanggal)} • {row.description || '-'}</div>
                  {row.status === 'ditolak' && row.rejection_reason && (
                    <div className="text-xs text-rose-600">Alasan: {row.rejection_reason}</div>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    row.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-700'
                      : row.status === 'ditolak'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {TRANSFER_STATUS_LABELS[row.status] || row.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
