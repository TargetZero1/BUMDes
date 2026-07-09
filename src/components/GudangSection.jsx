import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import EntryForm from './EntryForm';
import TxTable from './TxTable';
import { SATUAN_LIST, GUDANG_KATEGORI_LIST } from '../lib/constants';
import { formatQty, formatRupiah, formatTanggal, sumBy } from '../lib/formatters';

export default function GudangSection({ entries, onAdd, onDelete, isToko, unitLabel }) {
  const itemSuggestions = useMemo(() => [...new Set(entries.map((entry) => entry.namaBarang).filter(Boolean))], [entries]);

  const rekap = useMemo(() => {
    const names = [...new Set(entries.map((entry) => entry.namaBarang).filter(Boolean))];
    return names
      .map((barang) => {
        const items = entries.filter((entry) => entry.namaBarang === barang);
        const masuk = sumBy(items, 'masuk');
        const keluar = sumBy(items, 'keluar');
        const satuan = items[0]?.satuan || '-';
        const hargaJual = items.slice().reverse().find((item) => item.hargaJual)?.hargaJual;
        return { barang, satuan, masuk, keluar, saldo: masuk - keluar, hargaJual };
      })
      .filter((item) => item.masuk || item.keluar);
  }, [entries]);

  const fields = [
    { key: 'tanggal', label: 'Tanggal', type: 'date', default: new Date().toISOString().slice(0, 10) },
    { key: 'namaBarang', label: 'Nama Barang', span2: true, placeholder: 'Ketik nama barang', listId: 'gudang-barang-list', listOptions: itemSuggestions },
    { key: 'satuan', label: 'Satuan', type: 'select', options: SATUAN_LIST },
    { key: 'uraian', label: 'Uraian', span2: true, placeholder: 'Contoh: Pembelian dari toko pakan' },
    { key: 'masuk', label: 'Masuk (+)', type: 'number', default: 0 },
    { key: 'keluar', label: 'Keluar (-)', type: 'number', default: 0 },
  ];

  if (isToko) {
    fields.push(
      { key: 'kategori', label: 'Kategori', type: 'select', options: GUDANG_KATEGORI_LIST },
      { key: 'kode', label: 'Kode/SKU', placeholder: 'Opsional' },
      { key: 'hargaBeli', label: 'Harga Beli', type: 'number', default: 0 },
      { key: 'hargaJual', label: 'Harga Jual', type: 'number', default: 0 },
    );
  }

  const columns = [
    { key: 'tanggal', label: 'Tgl', render: (row) => formatTanggal(row.tanggal) },
    { key: 'namaBarang', label: 'Barang' },
    { key: 'uraian', label: 'Uraian' },
    { key: 'masuk', label: 'Masuk', render: (row) => (row.masuk ? `+${formatQty(row.masuk)} ${row.satuan}` : '-') },
    { key: 'keluar', label: 'Keluar', render: (row) => (row.keluar ? `-${formatQty(row.keluar)} ${row.satuan}` : '-') },
  ];

  if (isToko) {
    columns.push(
      { key: 'kategori', label: 'Kategori', render: (row) => row.kategori || '-' },
      { key: 'hargaJual', label: 'Harga Jual', render: (row) => (row.hargaJual ? formatRupiah(row.hargaJual) : '-') },
    );
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-stone-800" style={{ fontFamily: "'Lora', serif" }}>
          Buku Gudang
        </h2>
        <p className="text-sm text-stone-500">Stok barang {unitLabel ? `— ${unitLabel}` : ''}</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 lg:col-span-1">
          <h3 className="mb-3 font-semibold text-stone-700">Catat Barang</h3>
          <EntryForm
            tone="debit"
            submitLabel="Simpan"
            fields={fields}
            onSubmit={(values) =>
              onAdd({
                ...values,
                masuk: Number(values.masuk) || 0,
                keluar: Number(values.keluar) || 0,
                hargaBeli: isToko ? Number(values.hargaBeli) || 0 : undefined,
                hargaJual: isToko ? Number(values.hargaJual) || 0 : undefined,
                jumlah: undefined,
              })
            }
          />
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 lg:col-span-2">
          <h3 className="mb-3 font-semibold text-stone-700">Riwayat</h3>
          <TxTable rows={entries} emptyText="Belum ada catatan gudang." onDelete={onDelete} columns={columns} />
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
                {isToko && item.hargaJual ? (
                  <div className="mb-2 flex justify-between text-xs text-stone-500">
                    <span>Harga Jual</span>
                    <span>{formatRupiah(item.hargaJual)}</span>
                  </div>
                ) : null}
                <div className={`flex justify-between border-t border-stone-100 pt-2 text-sm font-bold ${item.saldo <= 2 ? 'text-amber-600' : 'text-emerald-700'}`}>
                  <span>Total</span>
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
