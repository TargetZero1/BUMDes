import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileDown } from 'lucide-react';
import EntryForm from './EntryForm';
import TxTable from './TxTable';
import { sbSelect, sbRpc } from '../lib/api';
import { formatRupiah, formatTanggal } from '../lib/formatters';
import { generateTransferInvoicePDF } from '../lib/invoice';
import { BANK_LIST } from '../lib/constants';

export default function TransferToUnit({ session, profile, units, canSend, currentUnitId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const unitOptions = useMemo(() => units.filter((unit) => unit.is_active), [units]);
  const unitNameFor = useCallback((unitId) => units.find((unit) => unit.id === unitId)?.name || '-', [units]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = canSend ? 'select=*&order=tanggal.desc' : `select=*&unit_id=eq.${currentUnitId}&order=tanggal.desc`;
      const data = await sbSelect('pengeluaran_unit', { accessToken: session?.access_token, query });
      setRows(data || []);
    } catch (err) {
      console.error('Failed load transfers', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, canSend, currentUnitId]);

  useEffect(() => { load(); }, [load]);

  const handleSend = async (values) => {
    try {
      await sbRpc(
        'create_unit_transfer',
        {
          p_unit_id: values.unitId,
          p_amount: Number(values.jumlah) || 0,
          p_tanggal: values.tanggal,
          p_description: values.uraian,
          p_created_by: session?.user?.id || null,
          p_bank_name: values.bankName || null,
          p_account_number: values.accountNumber || null,
        },
        { accessToken: session?.access_token }
      );
      setNotice({ type: 'success', text: 'Dana berhasil dikirim ke unit.' });
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
  ];

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-stone-800" style={{ fontFamily: "'Lora', serif" }}>
          Kirim Dana ke Unit
        </h2>
        <p className="text-sm text-stone-500">Transfer dari Kas Umum BUMDes ke Kas Unit — langsung tercatat di kedua sisi.</p>
      </div>

      {notice && (
        <div className={`mb-4 rounded-xl px-4 py-2.5 text-sm ${notice.type === 'error' ? 'border border-rose-200 bg-rose-50 text-rose-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {notice.text}
        </div>
      )}

      <div className={`grid grid-cols-1 gap-6 ${canSend ? 'lg:grid-cols-3' : ''}`}>
        {canSend && (
          <div className="rounded-2xl border border-stone-200 bg-white p-4 lg:col-span-1">
            <h3 className="mb-3 font-semibold text-stone-700">Transfer Baru</h3>
            <EntryForm
              tone="transfer"
              submitLabel="Kirim Dana"
              fields={[
                { key: 'tanggal', label: 'Tanggal', type: 'date', default: new Date().toISOString().slice(0, 10) },
                { key: 'unitId', label: 'Unit Tujuan', type: 'select', options: unitOptions.map((unit) => unit.name), span2: true },
                { key: 'uraian', label: 'Keterangan', span2: true, placeholder: 'Contoh: Pembelian pakan ayam' },
                { key: 'bankName', label: 'Bank', span2: true, placeholder: 'Pilih atau ketik nama bank', listId: 'bank-list', listOptions: BANK_LIST },
                { key: 'accountNumber', label: 'Nomor Rekening', span2: true, placeholder: 'Contoh: 1234567890' },
                { key: 'jumlah', label: 'Jumlah (Rp)', type: 'number', span2: true },
              ]}
              onSubmit={(values) => {
                const unit = unitOptions.find((u) => u.name === values.unitId);
                return handleSend({ ...values, unitId: unit?.id });
              }}
            />
          </div>
        )}

        <div className={canSend ? 'lg:col-span-2' : ''}>
          <h3 className="mb-3 font-semibold text-stone-700">Riwayat Transfer</h3>
          {loading ? (
            <div className="py-6 text-center text-sm text-stone-400">Memuat…</div>
          ) : (
            <TxTable
              rows={rows.map((row) => ({ ...row, tanggal: row.tanggal }))}
              columns={columns}
              emptyText="Belum ada transfer."
              renderExtraActions={(row) => (
                <button
                  onClick={() => generateTransferInvoicePDF(row, unitNameFor(row.unit_id), profile?.full_name || 'Operator BUMDes')}
                  className="text-stone-400 transition-colors hover:text-emerald-700"
                  title="Unduh Invoice PDF"
                >
                  <FileDown className="h-4 w-4" />
                </button>
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
}
