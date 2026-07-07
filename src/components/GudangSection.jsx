import { AlertTriangle } from 'lucide-react';
import EntryForm from './EntryForm';
import TxTable from './TxTable';
import { BARANG_LIST, SATUAN_LIST } from '../lib/constants';
import { formatQty, formatTanggal, sumBy } from '../lib/formatters';

export default function GudangSection({ entries, onAdd, onDelete }) {
  const rekap = BARANG_LIST.map((barang) => {
    const items = entries.filter((entry) => entry.namaBarang === barang);
    const masuk = sumBy(items, 'masuk');
    const keluar = sumBy(items, 'keluar');
    const satuan = items[0]?.satuan || '-';
    return { barang, satuan, masuk, keluar, saldo: masuk - keluar };
  }).filter((item) => item.masuk || item.keluar);

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-stone-800" style={{ fontFamily: "'Lora', serif" }}>
          Buku Gudang
        </h2>
        <p className="text-sm text-stone-500">Stok barang unit petelur (Kg/Sak/Botol)</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 lg:col-span-1">
          <h3 className="mb-3 font-semibold text-stone-700">Catat Barang</h3>
          <EntryForm
            tone="debit"
            submitLabel="Simpan"
            fields={[
              { key: 'tanggal', label: 'Tanggal', type: 'date', default: new Date().toISOString().slice(0, 10) },
              { key: 'namaBarang', label: 'Nama Barang', type: 'select', options: BARANG_LIST, span2: true },
              { key: 'satuan', label: 'Satuan', type: 'select', options: SATUAN_LIST },
              { key: 'uraian', label: 'Uraian', span2: true, placeholder: 'Contoh: Pembelian dari toko pakan' },
              { key: 'masuk', label: 'Masuk (+)', type: 'number', default: 0 },
              { key: 'keluar', label: 'Keluar (-)', type: 'number', default: 0 },
            ]}
            onSubmit={(values) => onAdd({ ...values, masuk: Number(values.masuk) || 0, keluar: Number(values.keluar) || 0, jumlah: undefined })}
          />
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 lg:col-span-2">
          <h3 className="mb-3 font-semibold text-stone-700">Riwayat</h3>
          <TxTable
            rows={entries}
            emptyText="Belum ada catatan gudang."
            onDelete={onDelete}
            columns={[
              { key: 'tanggal', label: 'Tgl', render: (row) => formatTanggal(row.tanggal) },
              { key: 'namaBarang', label: 'Barang' },
              { key: 'uraian', label: 'Uraian' },
              { key: 'masuk', label: 'Masuk', render: (row) => (row.masuk ? `+${formatQty(row.masuk)} ${row.satuan}` : '-') },
              { key: 'keluar', label: 'Keluar', render: (row) => (row.keluar ? `-${formatQty(row.keluar)} ${row.satuan}` : '-') },
            ]}
          />
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-semibold text-stone-700">Rekap Stok</h3>
        {rekap.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-200 py-6 text-center text-sm italic text-stone-400">Belum ada stok untuk direkap.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rekap.map((item) => (
              <div key={item.barang} className="rounded-2xl border border-stone-200 bg-white p-4">
                <div className="mb-2 flex items-start justify-between">
                  <p className="text-sm font-semibold text-stone-700">{item.barang}</p>
                  {item.saldo <= 2 && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" title="Stok menipis" />}
                </div>
                <div className="mb-1 flex justify-between text-xs text-stone-500">
                  <span>Masuk</span>
                  <span>
                    +{formatQty(item.masuk)} {item.satuan}
                  </span>
                </div>
                <div className="mb-2 flex justify-between text-xs text-stone-500">
                  <span>Keluar</span>
                  <span>
                    -{formatQty(item.keluar)} {item.satuan}
                  </span>
                </div>
                <div className={`flex justify-between border-t border-stone-100 pt-2 text-sm font-bold ${item.saldo <= 2 ? 'text-amber-600' : 'text-emerald-700'}`}>
                  <span>Saldo</span>
                  <span>
                    {formatQty(item.saldo)} {item.satuan}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
