import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileDown } from 'lucide-react';
import EntryForm from './EntryForm';
import TxTable from './TxTable';
import { sbRpc } from '../lib/api';
import { formatRupiah, formatTanggal } from '../lib/formatters';
import { BANK_LIST, TRANSFER_STATUS_LABELS } from '../lib/constants';
import { subscribeTableRealtime } from '../lib/realtime';

const STATUS_BADGE_CLASS = {
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  ditolak: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  menunggu_bendahara: 'bg-gold-500/15 text-gold-700 dark:text-gold-300',
  menunggu_direktur: 'bg-gold-500/15 text-gold-700 dark:text-gold-300',
};

export default function TransferToUnit({ session, profile, units, canSend, currentUnitId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const unitOptions = useMemo(() => units.filter((unit) => unit.is_active), [units]);
  const unitNameFor = useCallback((unitId) => units.find((unit) => unit.id === unitId)?.name || '-', [units]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await sbRpc(
        'list_pengeluaran_unit',
        { p_unit_id: canSend ? null : currentUnitId },
        { accessToken: session?.access_token }
      );
      setRows(data || []);
    } catch (err) {
      console.error('Failed load transfers', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, canSend, currentUnitId]);

  useEffect(() => { load(); }, [load]);

  // A Bendahara/Direktur approving or rejecting this transfer elsewhere should
  // update the Riwayat Transfer table here live.
  useEffect(() => {
    if (!canSend && !currentUnitId) return undefined;
    return subscribeTableRealtime(
      `transfer-to-unit-realtime-${canSend ? 'all' : currentUnitId}`,
      'pengeluaran_unit',
      canSend ? null : `unit_id=eq.${currentUnitId}`,
      load
    );
  }, [load, canSend, currentUnitId]);

  const handleSend = async (values) => {
    try {
      await sbRpc(
        'create_unit_transfer',
        {
          p_unit_id: values.unitId,
          p_amount: Number(values.jumlah) || 0,
          p_tanggal: values.tanggal,
          p_description: values.uraian,
          p_bank_name: values.bankName || null,
          p_account_number: values.accountNumber || null,
        },
        { accessToken: session?.access_token }
      );
      setNotice({ type: 'success', text: 'Permintaan transfer dikirim, menunggu persetujuan Bendahara.' });
      await load();
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Gagal kirim dana.' });
    }
    setTimeout(() => setNotice(null), 4000);
  };

  const columns = [
    { key: 'tanggal', label: 'Tgl', render: (row) => formatTanggal(row.tanggal) },
    ...(canSend ? [{ key: 'unit_id', label: 'Unit Tujuan', render: (row) => unitNameFor(row.unit_id) }] : []),
    { key: 'description', label: 'Keterangan' },
    { key: 'bank_name', label: 'Bank / Rekening', render: (row) => (row.bank_name ? `${row.bank_name}${row.account_number ? ` — ${row.account_number}` : ''}` : '-') },
    { key: 'amount', label: 'Jumlah', render: (row) => formatRupiah(row.amount) },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[row.status] || 'bg-surface text-text-muted'}`}>
          {TRANSFER_STATUS_LABELS[row.status] || row.status}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-text" style={{ fontFamily: "'Lora', serif" }}>
          Kirim Dana ke Unit
        </h2>
        <p className="text-sm text-text-muted">Transfer dari Kas Umum BUMDes ke Kas Unit — langsung tercatat di kedua sisi.</p>
      </div>

      {notice && (
        <div
          className={`mb-4 rounded-xl px-4 py-2.5 text-sm ${
            notice.type === 'error'
              ? 'border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300'
              : 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className={`grid grid-cols-1 gap-6 ${canSend ? 'lg:grid-cols-3' : ''}`}>
        {canSend && (
          <div className="rounded-2xl border border-border-subtle bg-surface-2 p-4 lg:col-span-1">
            <h3 className="mb-3 font-semibold text-text">Transfer Baru</h3>
            <EntryForm
              tone="transfer"
              submitLabel="Kirim Dana"
              fields={[
                { key: 'tanggal', label: 'Tanggal', type: 'date', default: new Date().toISOString().slice(0, 10) },
                { key: 'unitId', label: 'Unit Tujuan', type: 'select', options: unitOptions.map((unit) => unit.name), span2: true },
                { key: 'uraian', label: 'Keterangan', span2: true, placeholder: 'Contoh: Pembelian pakan ayam' },
                { key: 'bankName', label: 'Bank', span2: true, placeholder: 'Pilih atau ketik nama bank', listId: 'bank-list', listOptions: BANK_LIST },
                { key: 'accountNumber', label: 'Nomor Rekening', span2: true, placeholder: 'Contoh: 1234567890' },
                { key: 'jumlah', label: 'Jumlah (Rp)', type: 'currency', span2: true },
              ]}
              onSubmit={(values) => {
                const unit = unitOptions.find((u) => u.name === values.unitId);
                return handleSend({ ...values, unitId: unit?.id });
              }}
            />
          </div>
        )}

        <div className={canSend ? 'lg:col-span-2' : ''}>
          <h3 className="mb-3 font-semibold text-text">Riwayat Transfer</h3>
          {loading ? (
            <div className="py-6 text-center text-sm text-text-muted">Memuat…</div>
          ) : (
            <TxTable
              rows={rows.map((row) => ({ ...row, tanggal: row.tanggal }))}
              columns={columns}
              emptyText="Belum ada transfer."
              renderExtraActions={(row) =>
                row.status === 'approved' ? (
                  <button
                    onClick={async () => {
                      const { generateTransferInvoicePDF } = await import('../lib/invoice');
                      generateTransferInvoicePDF(row, unitNameFor(row.unit_id), profile?.full_name || 'Operator BUMDes', row.bendahara_name, row.direktur_name, row.unit_owner_name);
                    }}
                    className="text-text-muted transition-colors hover:text-emerald-700 dark:hover:text-emerald-400"
                    title="Unduh Invoice PDF"
                  >
                    <FileDown className="h-4 w-4" />
                  </button>
                ) : (
                  <FileDown className="h-4 w-4 cursor-not-allowed text-text-muted" title="Invoice tersedia setelah disetujui Direktur" />
                )
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
